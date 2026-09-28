// import { useState } from "react";
import { useState, useEffect } from "react";
// import { supabase } from "../supabase";


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";
function QRCodeGenerator() {
  const [qrType, setQrType] = useState("text");
  

  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  useEffect(() => {
  if (filePreview) {
    URL.revokeObjectURL(filePreview);
  }

  setFile(null);
  setFilePreview("");
  setFileUrl("");
  setQrImage("");
}, [qrType]);




  const getFileType = (file) => {
  if (file.type.startsWith("image/")) {
    return "🖼️ Image";
  }

  if (file.type.startsWith("video/")) {
    return "🎥 Video";
  }

  if (file.type.startsWith("audio/")) {
    return "🎵 Audio";
  }

  return "📁 File";
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) {
    return `${bytes} Bytes`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};












  const [qrImage, setQrImage] = useState("");
  const [uploading, setUploading] = useState(false);

  const [size, setSize] = useState("500");
  const [qrColor, setQrColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (!selectedFile) return;

    // Maximum 50 MB
    if (selectedFile.size > 50 * 1024 * 1024) {
      alert("File size must be less than 50 MB.");
      return;
    }

    setFile(selectedFile);
    setQrImage("");
    setFileUrl("");

    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }

    const previewUrl = URL.createObjectURL(selectedFile);
    setFilePreview(previewUrl);
  };










const uploadFile = async () => {
  if (!file) {
    alert("Please select a file first.");
    return null;
  }

  setUploading(true);

  try {
    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch(
      `${API_BASE_URL}/api/qr/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "File upload failed."
      );
    }

    if (!data.url) {
      throw new Error(
        "Backend ne file URL return nahi ki."
      );
    }

    setFileUrl(data.url);

    return data.url;

  } catch (error) {
    console.error(
      "QR UPLOAD ERROR:",
      error
    );

    alert(
      `Upload failed: ${error.message}`
    );

    return null;

  } finally {
    setUploading(false);
  }
};









  const generateQR = async () => {
    let content = "";

    // Text / URL
    if (qrType === "text") {
      content = text.trim();

      if (!content) {
        alert("Please enter text or URL.");
        return;
      }
    }

    // Photo / Video / Audio
    if (
      qrType === "photo" ||
      qrType === "video" ||
      qrType === "audio"
    ) {
      if (!file) {
        alert("Please select a file first.");
        return;
      }

      const uploadedUrl = await uploadFile();

      if (!uploadedUrl) {
        return;
      }

      content = uploadedUrl;
    }


    const color = qrColor.replace("#", "");
    const background = bgColor.replace("#", "");

   const response = await fetch(
  `${API_BASE_URL}/api/qr/generate`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: content,
      size: size,
      color: color,
      background: background,
    }),
  }
);

const data = await response.json();

if (!response.ok || !data.success) {
  throw new Error(
    data.message || "QR code generation failed."
  );
}

if (!data.qrImage) {
  throw new Error(
    "Backend ne QR image return nahi ki."
  );
}

setQrImage(data.qrImage);




  //   const url =
  // `https://api.qrserver.com/v1/create-qr-code/` +
  // `?size=${size}x${size}` +
  // `&data=${encodedText}` +
  // `&color=${color}` +
  // `&bgcolor=${background}` +
  // `&margin=20`;
  };

  const clearAll = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }

    setQrType("text");
    setText("");
    setFile(null);
    setFilePreview("");
    setFileUrl("");
    setQrImage("");
    setUploading(false);

    setSize("500");
    setQrColor("#000000");
    setBgColor("#ffffff");
  };

  return (
    <div className="qr-generator">

      <div className="qr-header">
        <h1>QR Code Generator</h1>

        <p>
          Create QR codes for text, URLs, photos, videos and audio.
        </p>
      </div>

      {/* QR TYPE TABS */}

      <div className="qr-tabs">

        <button
          className={
            qrType === "text"
              ? "qr-tab active"
              : "qr-tab"
          }
          onClick={() => setQrType("text")}
        >
          🔗 Text / URL
        </button>

        <button
          className={
            qrType === "photo"
              ? "qr-tab active"
              : "qr-tab"
          }
          onClick={() => setQrType("photo")}
        >
          🖼️ Photo
        </button>

        <button
          className={
            qrType === "video"
              ? "qr-tab active"
              : "qr-tab"
          }
          onClick={() => setQrType("video")}
        >
          🎥 Video
        </button>

        <button
          className={
            qrType === "audio"
              ? "qr-tab active"
              : "qr-tab"
          }
          onClick={() => setQrType("audio")}
        >
          🎵 Audio
        </button>

      </div>

      <div className="qr-container">

        {/* TEXT / URL */}

        {qrType === "text" && (
          <div className="qr-card">

            <h3>🔗 Enter Text or URL</h3>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text, website URL, Facebook link, Instagram link, etc."
            />

          </div>
        )}

        {/* PHOTO */}

        {qrType === "photo" && (
          <div className="qr-card">

            <h3>🖼️ Upload Photo</h3>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />

            {filePreview && (
              <div className="qr-file-preview">

                <img
                  src={filePreview}
                  alt="Selected photo"
                />

                <p>📁 {file?.name}</p>
                {file && (
  <div className="file-info">
    <p>
      📄 <strong>File Name:</strong> {file.name}
    </p>

    <p>
      📦 <strong>File Size:</strong> {formatFileSize(file.size)}
    </p>

    <p>
      🏷️ <strong>Type:</strong> {getFileType(file)}
    </p>
  </div>
)}

              </div>
            )}

           

          </div>
        )}

        {/* VIDEO */}

        {qrType === "video" && (
          <div className="qr-card">

            <h3>🎥 Upload Video</h3>

            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
            />

            {filePreview && (
              <div className="qr-file-preview">

                <video
                  src={filePreview}
                  controls
                />

                <p>📁 {file?.name}</p>
             {file && (
  <div className="file-info">
    <p>
      📄 <strong>File Name:</strong> {file.name}
    </p>

    <p>
      📦 <strong>File Size:</strong> {formatFileSize(file.size)}
    </p>

    <p>
      🏷️ <strong>Type:</strong> {getFileType(file)}
    </p>
  </div>
)}

              </div>
            )}

            

          </div>
        )}

        {/* AUDIO */}

        {qrType === "audio" && (
          <div className="qr-card">

            <h3>🎵 Upload Audio</h3>

            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
            />

            {filePreview && (
              <div className="qr-file-preview">

                <audio
                  src={filePreview}
                  controls
                  style={{ width: "100%" }}
                />

                <p>📁 {file?.name}</p>

              </div>
            )}

           

          </div>
        )}

        {/* QR SETTINGS */}

        <div className="qr-settings">

          <div>
            <label>QR Size</label>

            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
            >
              <option value="300">300 × 300</option>
              <option value="500">500 × 500</option>
              <option value="700">700 × 700</option>
              <option value="1000">1000 × 1000</option>
            </select>
          </div>

          <div>
            <label>QR Color</label>

            <input
              type="color"
              value={qrColor}
              onChange={(e) => setQrColor(e.target.value)}
            />
          </div>

          <div>
            <label>Background</label>

            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
            />
          </div>

        </div>

        {/* BUTTONS */}

        <div className="qr-buttons">

          <button
            className="primary-btn"
            onClick={generateQR}
            disabled={uploading}
          >
            {uploading
              ? "Uploading..."
              : qrType === "text"
              ? "Generate QR"
              : "Upload & Generate QR"}
          </button>

          <button
            className="secondary-btn"
            onClick={clearAll}
          >
            Clear
          </button>

        </div>

        {/* RESULT */}

        {qrImage && (
          <div className="qr-result">

            <h3>✅ Your QR Code</h3>

            <img
              src={qrImage}
              alt="Generated QR Code"
              className="qr-image"
            />

            <a
              href={qrImage}
              download="ai-toolbox-qr.png"
              target="_blank"
              rel="noreferrer"
              className="download-qr"
            >
              ⬇️ Download QR
            </a>

           {fileUrl && (
  <div className="qr-file-actions">
  <p className="qr-url-note">
  📁 File successfully uploaded to your private storage.
</p>

    <div className="qr-link-buttons">
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className="open-file-btn"
      >
        🔗 Open Uploaded File
      </a>

      <button
        className="copy-link-btn"
        onClick={() => {
          navigator.clipboard.writeText(fileUrl);
          alert("File link copied!");
        }}
      >
        📋 Copy File Link
      </button>
    </div>
  </div>
)}

          </div>
        )}

      </div>
    </div>
  );
}

export default QRCodeGenerator;