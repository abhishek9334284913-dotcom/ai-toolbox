const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const QRCode = require("qrcode");
const { createClient } = require("@supabase/supabase-js");
const ttsRoutes = require(
  "./backend/text-to-audio/tts.routes.cjs"
);
require("dotenv").config();

const app = express();

const PORT = Number(process.env.PORT || 5000);

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET";

const OTP_PEPPER =
  process.env.OTP_PEPPER ||
  "CHANGE_THIS_OTP_SECRET";

const MAX_FILE_SIZE_MB = Number(
  process.env.MAX_FILE_SIZE_MB || 100
);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("❌ Supabase environment variables are missing.");
  process.exit(1);
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// =====================================================
// DIRECTORIES
// =====================================================

const DATA_DIR = path.join(__dirname, "data");
const STORAGE_DIR = path.join(__dirname, "storage");
const SAFE_FILES_DIR = path.join(STORAGE_DIR, "safe-files");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(STORAGE_DIR, { recursive: true });
fs.mkdirSync(SAFE_FILES_DIR, { recursive: true });

// =====================================================
// SQLITE DATABASE
// =====================================================

const DB_PATH = path.join(DATA_DIR, "database.sqlite");

const db = new sqlite3.Database(DB_PATH, (error) => {
  if (error) {
    console.error("SQLite connection error:", error.message);
    process.exit(1);
  }

  console.log("Connected to SQLite database.");
});

// Enable foreign keys
db.run("PRAGMA foreign_keys = ON");

// =====================================================
// DATABASE TABLES
// =====================================================

db.serialize(() => {
  // Users
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // OTP
  db.run(`
  CREATE TABLE IF NOT EXISTS otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts INTEGER DEFAULT 0,
    last_sent_at INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

  // Files
  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    )
  `);

  // Indexes
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_otps_email
    ON otps(email)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_files_user_id
    ON files(user_id)
  `);
});

// =====================================================
// HELPERS
// =====================================================

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function generateOTP() {
  return String(
    Math.floor(100000 + Math.random() * 900000)
  );
}

function hashOTP(otp) {
  return crypto
    .createHash("sha256")
    .update(`${OTP_PEPPER}:${otp}`)
    .digest("hex");
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

function safeFileName(name) {
  return String(name || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 180);
}

function getUserFromToken(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  const token = header.substring(7);

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getUserFromToken(req);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Login required.",
    });
  }

  req.user = user;
  next();
}

// =====================================================
// EMAIL
// =====================================================

let transporter = null;

if (
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendOTPEmail(email, otp) {
  if (!transporter) {
    throw new Error(
      "SMTP configuration is missing in .env"
    );
  }

  await transporter.sendMail({
    from:
      process.env.SMTP_FROM ||
      `"AI ToolBox" <${process.env.SMTP_USER}>`,

    to: email,

    subject: "AI ToolBox - Your Login OTP",

    text:
      `AI ToolBox Login\n\n` +
      `Your one-time password (OTP) is: ${otp}\n\n` +
      `This OTP will expire in 10 minutes.\n\n` +
      `If you did not request this OTP, you can safely ignore this email.`,

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 520px;
        margin: 0 auto;
        padding: 30px;
        background: #f6f7fb;
      ">
        <div style="
          background: white;
          border-radius: 16px;
          padding: 30px;
          text-align: center;
        ">
          <h2 style="margin-bottom: 10px;">
            🔐 AI ToolBox Login
          </h2>

          <p>
            Your one-time password (OTP) is:
          </p>

          <div style="
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            margin: 25px 0;
          ">
            ${otp}
          </div>

          <p>
            This OTP will expire in <b>10 minutes</b>.
          </p>

          <p style="color:#777;">
            If you did not request this OTP,
            you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}

// =====================================================
// HEALTH
// =====================================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "AI ToolBox backend is running.",
    time: new Date().toISOString(),
  });
});

// =====================================================
// SEND OTP
// =====================================================

app.post("/api/auth/send-otp", async (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required.",
    });
  }

  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email.",
    });
  }

  const otp = generateOTP();
  const otpHash = hashOTP(otp);

  // 10 minutes
  const expiresAt =
    Date.now() + 10 * 60 * 1000;

  try {
    // -------------------------------------------------
    // FIRST SAVE OTP
    // -------------------------------------------------
// FIRST DELETE OLD OTP
await new Promise((resolve, reject) => {
  db.run(
    `DELETE FROM otps WHERE email = ?`,
    [email],
    function (error) {
      if (error) {
        console.error("OTP DELETE ERROR:", error);
        reject(error);
        return;
      }

      resolve();
    }
  );
});

// THEN SAVE NEW OTP
await new Promise((resolve, reject) => {
  db.run(
    `INSERT INTO otps
      (email, otp_hash, expires_at, attempts, last_sent_at)
     VALUES (?, ?, ?, 0, ?)`,
    [email, otpHash, expiresAt, Date.now()],
    function (error) {
      if (error) {
        console.error("OTP DATABASE ERROR:", error);
        reject(error);
        return;
      }

      resolve();
    }
  );
});

console.log(`OTP saved successfully for ${email}`);

    // -------------------------------------------------
    // THEN SEND EMAIL
    // -------------------------------------------------

    await sendOTPEmail(email, otp);

    console.log(
      `OTP email sent successfully to ${email}`
    );

    return res.json({
      success: true,
      message:
        "OTP sent successfully to your email.",
    });
  } catch (error) {
    console.error(
      "SEND OTP ERROR:",
      error.message
    );

    // If email failed, remove OTP so an
    // unusable OTP does not remain active.
    db.run(
      "DELETE FROM otps WHERE email = ?",
      [email]
    );

    return res.status(500).json({
      success: false,
      message:
        "OTP could not be sent. Please try again.",
    });
  }
});

// =====================================================
// VERIFY OTP
// =====================================================

app.post("/api/auth/verify-otp", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || "").trim();

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: "Email and OTP are required.",
    });
  }

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: "OTP must be exactly 6 digits.",
    });
  }

  db.get(
    `
    SELECT *
    FROM otps
    WHERE email = ?
    `,
    [email],
    (error, otpRow) => {
      if (error) {
        console.error(
          "VERIFY OTP DATABASE ERROR:",
          error
        );

        return res.status(500).json({
          success: false,
          message: "Database error.",
        });
      }

      if (!otpRow) {
        return res.status(400).json({
          success: false,
          message:
            "OTP not found. Please request a new OTP.",
        });
      }

      if (Date.now() > otpRow.expires_at) {
        db.run(
          "DELETE FROM otps WHERE email = ?",
          [email]
        );

        return res.status(400).json({
          success: false,
          message:
            "OTP expired. Please request a new OTP.",
        });
      }

      if (otpRow.attempts >= 5) {
        db.run(
          "DELETE FROM otps WHERE email = ?",
          [email]
        );

        return res.status(429).json({
          success: false,
          message:
            "Too many incorrect attempts. Request a new OTP.",
        });
      }

      const incomingHash = hashOTP(otp);

      if (incomingHash !== otpRow.otp_hash) {
        db.run(
          `
          UPDATE otps
          SET attempts = attempts + 1
          WHERE email = ?
          `,
          [email]
        );

        return res.status(400).json({
          success: false,
          message: "Invalid OTP.",
        });
      }

      // -------------------------------------------------
      // CREATE / GET USER
      // -------------------------------------------------

      db.get(
        `
        SELECT *
        FROM users
        WHERE email = ?
        `,
        [email],
        (userError, existingUser) => {
          if (userError) {
            console.error(
              "USER DATABASE ERROR:",
              userError
            );

            return res.status(500).json({
              success: false,
              message: "Database error.",
            });
          }

          if (existingUser) {
            finishLogin(existingUser);
            return;
          }

          db.run(
            `
            INSERT INTO users (email)
            VALUES (?)
            `,
            [email],
            function (insertError) {
              if (insertError) {
                console.error(
                  "CREATE USER ERROR:",
                  insertError
                );

                return res.status(500).json({
                  success: false,
                  message:
                    "Could not create user.",
                });
              }

              db.get(
                `
                SELECT *
                FROM users
                WHERE id = ?
                `,
                [this.lastID],
                (getError, newUser) => {
                  if (getError || !newUser) {
                    return res.status(500).json({
                      success: false,
                      message:
                        "Could not load user.",
                    });
                  }

                  finishLogin(newUser);
                }
              );
            }
          );
        }
      );

      function finishLogin(user) {
        const token = createToken(user);

        db.run(
          "DELETE FROM otps WHERE email = ?",
          [email]
        );

        return res.json({
          success: true,
          message: "Login successful.",
          token,
          user: {
            id: user.id,
            email: user.email,
          },
        });
      }
    }
  );
});

// =====================================================
// CURRENT USER
// =====================================================

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
    },
  });
});

// =====================================================
// FILE UPLOAD
// =====================================================

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const userDir = path.join(
        SAFE_FILES_DIR,
        String(req.user.id)
      );

      fs.mkdirSync(userDir, {
        recursive: true,
      });

      cb(null, userDir);
    },

    filename: (req, file, cb) => {
      const extension =
        path.extname(file.originalname);

      const base =
        path.basename(
          file.originalname,
          extension
        );

      const unique =
        `${Date.now()}-${crypto.randomUUID()}`;

      cb(
        null,
        `${unique}-${safeFileName(base)}${extension}`
      );
    },
  }),

  limits: {
    fileSize:
      MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});

// =====================================================
// LIST USER FILES
// =====================================================

app.get(
  "/api/files",
  requireAuth,
  (req, res) => {
    db.all(
      `
      SELECT
        id,
        original_name,
        mime_type,
        file_size,
        created_at
      FROM files
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [req.user.id],
      (error, rows) => {
        if (error) {
          return res.status(500).json({
            success: false,
            message:
              "Could not load files.",
          });
        }

        res.json({
          success: true,
          files: rows,
        });
      }
    );
  }
);


// =====================================================
// PREVIEW FILE
// =====================================================

app.get(
  "/api/files/:id/preview",
  requireAuth,
  (req, res) => {
    db.get(
      `
      SELECT *
      FROM files
      WHERE id = ?
        AND user_id = ?
      `,
      [req.params.id, req.user.id],
      (error, file) => {
        if (error) {
          return res.status(500).json({
            success: false,
            message: "Database error.",
          });
        }

        if (!file) {
          return res.status(404).json({
            success: false,
            message: "File not found.",
          });
        }

        if (!fs.existsSync(file.file_path)) {
          return res.status(404).json({
            success: false,
            message: "Physical file not found.",
          });
        }

        res.setHeader(
          "Content-Type",
          file.mime_type || "application/octet-stream"
        );

        res.setHeader(
          "Content-Disposition",
          "inline"
        );

        res.sendFile(
          file.file_path
        );
      }
    );
  }
);

// =====================================================
// DOWNLOAD FILE
// =====================================================

app.get(
  "/api/files/:id/download",
  requireAuth,
  (req, res) => {
    db.get(
      `
      SELECT *
      FROM files
      WHERE id = ?
        AND user_id = ?
      `,
      [req.params.id, req.user.id],
      (error, file) => {
        if (error) {
          return res.status(500).json({
            success: false,
            message: "Database error.",
          });
        }

        if (!file) {
          return res.status(404).json({
            success: false,
            message: "File not found.",
          });
        }

        if (!fs.existsSync(file.file_path)) {
          return res.status(404).json({
            success: false,
            message:
              "Physical file not found.",
          });
        }

        res.download(
          file.file_path,
          file.original_name
        );
      }
    );
  }
);

// =====================================================
// DELETE FILE
// =====================================================

app.delete(
  "/api/files/:id",
  requireAuth,
  (req, res) => {
    db.get(
      `
      SELECT *
      FROM files
      WHERE id = ?
        AND user_id = ?
      `,
      [req.params.id, req.user.id],
      (error, file) => {
        if (error) {
          return res.status(500).json({
            success: false,
            message: "Database error.",
          });
        }

        if (!file) {
          return res.status(404).json({
            success: false,
            message: "File not found.",
          });
        }

        try {
          if (fs.existsSync(file.file_path)) {
            fs.unlinkSync(file.file_path);
          }
        } catch (fileError) {
          console.error(
            "FILE DELETE ERROR:",
            fileError
          );
        }

        db.run(
          `
          DELETE FROM files
          WHERE id = ?
            AND user_id = ?
          `,
          [req.params.id, req.user.id],
          function (deleteError) {
            if (deleteError) {
              return res.status(500).json({
                success: false,
                message:
                  "Could not delete file record.",
              });
            }

            res.json({
              success: true,
              message:
                "File deleted successfully.",
            });
          }
        );
      }
    );
  }
);






// =====================================================
// QR GENERATOR FILE STORAGE
// =====================================================

const QR_STORAGE_DIR = path.join(
  __dirname,
  "storage",
  "qr-files"
);

if (!fs.existsSync(QR_STORAGE_DIR)) {
  fs.mkdirSync(QR_STORAGE_DIR, {
    recursive: true,
  });
}

// QR files are temporarily stored locally before
// being uploaded to Supabase Storage.
const qrStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, QR_STORAGE_DIR);
  },

  filename: (req, file, cb) => {
    const safeFileName =
      file.originalname.replace(
        /[^a-zA-Z0-9._-]/g,
        "-"
      );

    const uniqueName =
      `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

    cb(null, uniqueName);
  },
});

const qrUpload = multer({
  storage: qrStorage,

  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

// =====================================================
// QR FILE UPLOAD API
// =====================================================

app.post(
  "/api/qr/upload",
  qrUpload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file selected.",
        });
      }

      const fileBuffer = await fs.promises.readFile(
        req.file.path
      );

      const storagePath =
        `${Date.now()}-${crypto.randomUUID()}-${req.file.filename}`;

      const { error: uploadError } =
        await supabase.storage
          .from("qr-files")
          .upload(
            storagePath,
            fileBuffer,
            {
              contentType: req.file.mimetype,
              cacheControl: "3600",
              upsert: false,
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } =
        supabase.storage
          .from("qr-files")
          .getPublicUrl(storagePath);

      const fileUrl = publicUrlData.publicUrl;

      try {
        await fs.promises.unlink(req.file.path);
      } catch (deleteError) {
        console.warn(
          "Temporary QR file delete warning:",
          deleteError.message
        );
      }

      return res.json({
        success: true,
        message: "QR file uploaded successfully.",
        url: fileUrl,
        file: {
          name: req.file.originalname,
          size: req.file.size,
          type: req.file.mimetype,
        },
      });
    } catch (error) {
      console.error(
        "QR SUPABASE UPLOAD ERROR:",
        error
      );

      if (req.file?.path) {
        try {
          await fs.promises.unlink(req.file.path);
        } catch (_) {}
      }

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "QR file upload failed.",
      });
    }
  }
);


// =====================================================
// QR CODE GENERATE API
// =====================================================

app.post(
  "/api/qr/generate",
  async (req, res) => {
    try {
      const {
        data,
        size = 500,
        color = "000000",
        background = "FFFFFF",
      } = req.body;

      if (
        !data ||
        !String(data).trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "QR data is required.",
        });
      }

      const qrSize = Math.min(
        Math.max(
          Number(size) || 500,
          100
        ),
        2000
      );

      const qrData =
        await QRCode.toDataURL(
          String(data),
          {
            width: qrSize,

            margin: 2,

            color: {
              dark: `#${String(
                color
              ).replace("#", "")}`,

              light: `#${String(
                background
              ).replace("#", "")}`,
            },

            errorCorrectionLevel: "M",
          }
        );

      return res.json({
        success: true,

        message:
          "QR code generated successfully.",

        qrImage: qrData,
      });

    } catch (error) {
      console.error(
        "QR GENERATE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error.message ||
          "QR code generation failed.",
      });
    }
  }
);


// =====================================================
// TEXT TO AUDIO
// =====================================================

app.use(
  "/api/tts",
  ttsRoutes
);


// =====================================================
// 404 HANDLER
// =====================================================

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      message: "API route not found.",
      path: req.path,
    });
  }
);


// =====================================================
// ERROR HANDLER
// =====================================================

app.use(
  (error, req, res, next) => {
    console.error(
      "SERVER ERROR:",
      error
    );

    if (
      error.code ===
      "LIMIT_FILE_SIZE"
    ) {
      return res.status(413).json({
        success: false,

        message:
          `Maximum file size is ${MAX_FILE_SIZE_MB} MB.`,
      });
    }

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Internal server error.",
    });
  }
);


// =====================================================
// START SERVER
// =====================================================

app.listen(
  PORT,
  () => {
    console.log("");

    console.log(
      "=========================================="
    );

    console.log(
      "        AI ToolBox Custom Backend"
    );

    console.log(
      "=========================================="
    );

    console.log(
      `Server:   http://localhost:${PORT}`
    );

    console.log(
      `Frontend: ${FRONTEND_URL}`
    );

    console.log(
      `Storage:  ${SAFE_FILES_DIR}`
    );

    console.log(
      `Database: ${DB_PATH}`
    );

    console.log(
      "=========================================="
    );

    console.log("");
  }
);