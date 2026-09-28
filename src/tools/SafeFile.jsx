import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./SafeFile.css";
import AuthModal from "../components/AuthModal";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const TOKEN_KEY =
  "safe_file_auth_token";

const USER_KEY =
  "safe_file_user";

export default function SafeFile() {
  // =====================================================
  // STATE
  // =====================================================

  const [files, setFiles] = useState([]);

  const [search, setSearch] =
    useState("");

  const [activeCategory, setActiveCategory] =
    useState("All");
    const [previewFile, setPreviewFile] =
  useState(null);

const [previewUrl, setPreviewUrl] =
  useState("");

const [previewLoading, setPreviewLoading] =
  useState(false);
  const [photoThumbs, setPhotoThumbs] =
  useState({});

useEffect(() => {
  if (activeCategory !== "Photos") return;

  const token = getToken();
  if (!token) return;

  let cancelled = false;
  const objectUrls = [];

  const loadPhotoThumbs = async () => {
    const photoFiles = files.filter(
      (file) => file.category === "Photos"
    );

    const newThumbs = {};

    for (const file of photoFiles) {
      try {
        const response = await fetch(
          `${API_BASE}/files/${file.id}/preview`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) continue;

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        objectUrls.push(url);
        newThumbs[file.id] = url;
      } catch (error) {
        console.error(
          "Photo thumbnail error:",
          error
        );
      }
    }

    if (!cancelled) {
      setPhotoThumbs(newThumbs);
    }
  };

  loadPhotoThumbs();

  return () => {
    cancelled = true;

    objectUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });
  };
}, [activeCategory, files]);



  // =====================================================
// FILE PREVIEW
// =====================================================

const handlePreviewFile = async (file, index) => {
  const token = getToken();

  if (!token) {
    setShowLogin(true);
    return;
  }

  setPreviewFile({
    ...file,
    previewIndex: index,
  });

  setPreviewLoading(true);

  try {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }

    const response = await fetch(
      `${API_BASE}/files/${file.id}/preview`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 401) {
      clearAuth();
      setShowLogin(true);
      return;
    }

    if (!response.ok) {
      throw new Error("File preview load nahi ho paayi.");
    }

    const blob = await response.blob();

    const url = URL.createObjectURL(blob);

    setPreviewUrl(url);
  } catch (error) {
    console.error("Preview error:", error);

    alert(
      error.message ||
        "File preview load nahi ho paayi."
    );

    setPreviewFile(null);
  } finally {
    setPreviewLoading(false);
  }
};

const closePreview = () => {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  setPreviewUrl("");
  setPreviewFile(null);
};

const showNextPreview = () => {
  if (!previewFile) return;

  const currentIndex =
    previewFile.previewIndex ?? 0;

  const nextIndex =
    currentIndex + 1;

  if (nextIndex >= filteredFiles.length) {
    return;
  }

  handlePreviewFile(
    filteredFiles[nextIndex],
    nextIndex
  );
};

const showPreviousPreview = () => {
  if (!previewFile) return;

  const currentIndex =
    previewFile.previewIndex ?? 0;

  const previousIndex =
    currentIndex - 1;

  if (previousIndex < 0) {
    return;
  }

  handlePreviewFile(
    filteredFiles[previousIndex],
    previousIndex
  );
};

  const [showLogin, setShowLogin] =
    useState(false);

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  const [currentUser, setCurrentUser] =
    useState(null);

  const [pendingFiles, setPendingFiles] =
    useState([]);

  const [loadingFiles, setLoadingFiles] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const fileInputRef =
    useRef(null);

  const emptyFileInputRef =
    useRef(null);

  // =====================================================
  // TOKEN
  // =====================================================

  const getToken = () => {
    return localStorage.getItem(
      TOKEN_KEY
    );
  };

  // =====================================================
  // CLEAR AUTH
  // =====================================================

  const clearAuth = () => {
    localStorage.removeItem(
      TOKEN_KEY
    );

    localStorage.removeItem(
      USER_KEY
    );

    setFiles([]);
    setCurrentUser(null);
    setIsLoggedIn(false);
    setPendingFiles([]);
  };

  // =====================================================
  // API REQUEST
  // =====================================================

  const apiFetch = async (
    path,
    options = {},
    customToken = null
  ) => {
    const token =
      customToken || getToken();

    const headers =
      new Headers(
        options.headers || {}
      );

    if (token) {
      headers.set(
        "Authorization",
        `Bearer ${token}`
      );
    }

    const response =
      await fetch(
        `${API_BASE}${path}`,
        {
          ...options,
          headers,
        }
      );

    let data = null;

    try {
      data =
        await response.json();
    } catch {
      data = null;
    }

    if (
      response.status === 401
    ) {
      clearAuth();

      throw new Error(
        "Your login session has expired. Please login again."
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
          data?.message ||
          `Request failed with status ${response.status}.`
      );
    }

    return data;
  };

  // =====================================================
  // FILE CATEGORY
  // =====================================================

  const getFileCategory = (
    type = "",
    name = ""
  ) => {
    const extension =
      name
        .split(".")
        .pop()
        ?.toLowerCase() || "";

    if (
      type.startsWith("image/")
    ) {
      return "Photos";
    }

    if (
      type.startsWith("video/")
    ) {
      return "Videos";
    }

    if (
      type.startsWith("audio/")
    ) {
      return "Audio";
    }

    const documentExtensions = [
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "txt",
      "csv",
    ];

    if (
      documentExtensions.includes(
        extension
      )
    ) {
      return "Documents";
    }

    return "Other";
  };

  // =====================================================
  // FILE SIZE
  // =====================================================

  const formatSize = (
    bytes
  ) => {
    if (!bytes) {
      return "0 B";
    }

    const units = [
      "B",
      "KB",
      "MB",
      "GB",
      "TB",
    ];

    const index = Math.min(
      Math.floor(
        Math.log(bytes) /
          Math.log(1024)
      ),
      units.length - 1
    );

    return `${(
      bytes /
      Math.pow(
        1024,
        index
      )
    ).toFixed(
      index === 0 ? 0 : 2
    )} ${units[index]}`;
  };

  // =====================================================
  // NORMALIZE BACKEND FILE
  // =====================================================

  const normalizeFile = (
    item
  ) => {
    const name =
      item.original_name ||
      item.name ||
      "Unnamed file";

    const size = Number(
      item.file_size ??
        item.size ??
        0
    );

    const mimeType =
      item.mime_type ||
      item.type ||
      "application/octet-stream";

    return {
      id: String(
        item.id
      ),

      name,

      size,

      type: mimeType,

      category:
        getFileCategory(
          mimeType,
          name
        ),

      uploadedAt:
        item.created_at
          ? new Date(
              item.created_at
            )
          : new Date(),
    };
  };

  // =====================================================
  // LOAD FILES
  // =====================================================

  const loadFiles = async (
    tokenOverride = null
  ) => {
    const token =
      tokenOverride ||
      getToken();

    if (!token) {
      setFiles([]);
      return;
    }

    setLoadingFiles(true);

    try {
      const data =
        await apiFetch(
          "/files",
          {},
          token
        );

      const backendFiles =
        Array.isArray(
          data?.files
        )
          ? data.files.map(
              normalizeFile
            )
          : [];

      setFiles(
        backendFiles
      );
    } catch (error) {
      console.error(
        "Load files error:",
        error
      );

      if (getToken()) {
        alert(
          `Files load nahi ho paayi: ${error.message}`
        );
      }
    } finally {
      setLoadingFiles(false);
    }
  };

  // =====================================================
  // INITIAL AUTH CHECK
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const initializeAuth =
      async () => {
        const token =
          getToken();

        if (!token) {
          return;
        }

        try {
          const data =
            await apiFetch(
              "/auth/me",
              {},
              token
            );

          if (!mounted) {
            return;
          }

          const user =
            data?.user ||
            null;

          if (!user) {
            clearAuth();
            return;
          }

          setCurrentUser(
            user
          );

          setIsLoggedIn(
            true
          );

          localStorage.setItem(
            USER_KEY,
            JSON.stringify(
              user
            )
          );

          await loadFiles(
            token
          );
        } catch (error) {
          console.error(
            "Session error:",
            error
          );

          if (mounted) {
            clearAuth();
          }
        }
      };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // =====================================================
  // UPLOAD ONE FILE
  // =====================================================

  const uploadOneFile = async (
    file,
    token
  ) => {
    const formData =
      new FormData();

    /*
      IMPORTANT:

      Backend:
      upload.single("file")

      Therefore frontend must use:
      "file"
    */

    formData.append(
      "files",
      file
    );

    const response =
      await fetch(
        `${API_BASE}/files/upload`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          body: formData,
        }
      );

    let data = null;

    try {
      data =
        await response.json();
    } catch {
      data = null;
    }

    if (
      response.status === 401
    ) {
      clearAuth();

      throw new Error(
        "Login session expired. Please login again."
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
          data?.message ||
          "File upload failed."
      );
    }

    if (
      data &&
      data.success === false
    ) {
      throw new Error(
        data?.error ||
          data?.message ||
          "File upload failed."
      );
    }

    return data;
  };

  // =====================================================
  // UPLOAD FILES
  // =====================================================

  const uploadFiles = async (
    selectedFiles,
    tokenOverride = null
  ) => {
    const token =
      tokenOverride ||
      getToken();

    /*
      IMPORTANT FIX:

      Do NOT check currentUser here.

      React state can be old immediately
      after login.

      Token is the actual authentication.
    */

    if (!token) {
      setPendingFiles(
        Array.from(
          selectedFiles || []
        )
      );

      setShowLogin(true);

      return;
    }

    if (
      !selectedFiles ||
      selectedFiles.length === 0
    ) {
      return;
    }

    setUploading(true);

    try {
      for (
        const file of selectedFiles
      ) {
        await uploadOneFile(
          file,
          token
        );
      }

      await loadFiles(
        token
      );
    } catch (error) {
      console.error(
        "Upload failed:",
        error
      );

      alert(
        `Upload failed: ${error.message}`
      );
    } finally {
      setUploading(false);
    }
  };

  // =====================================================
  // FILE SELECT
  // =====================================================

  const handleFileChange =
    async (event) => {
      const selectedFiles =
        Array.from(
          event.target.files ||
            []
        );

      // Allow selecting same file again
      event.target.value = "";

      if (
        selectedFiles.length ===
        0
      ) {
        return;
      }

      const token =
        getToken();

      /*
        If user is not logged in,
        save selected files temporarily.
      */

      if (!token) {
        setPendingFiles(
          selectedFiles
        );

        setShowLogin(true);

        return;
      }

      await uploadFiles(
        selectedFiles,
        token
      );
    };

  // =====================================================
  // LOGIN SUCCESS
  // =====================================================

  const handleLoginSuccess =
    async (authData) => {
      try {
        /*
          AuthModal will send:

          {
            user: data.user,
            token: data.token
          }
        */

        const user =
          authData?.user ||
          null;

        const token =
          authData?.token ||
          null;

        if (
          !user ||
          !token
        ) {
          console.error(
            "Login callback did not contain user/token."
          );

          setShowLogin(
            true
          );

          return;
        }

        // Save authentication
        localStorage.setItem(
          TOKEN_KEY,
          token
        );

        localStorage.setItem(
          USER_KEY,
          JSON.stringify(
            user
          )
        );

        // Update UI
        setCurrentUser(
          user
        );

        setIsLoggedIn(
          true
        );

        setShowLogin(
          false
        );

        /*
          IMPORTANT:

          Copy pending files BEFORE
          clearing state.
        */

        const filesToUpload =
          [...pendingFiles];

        setPendingFiles([]);

        /*
          Upload using the NEW token
          directly.

          This fixes the React stale
          currentUser problem.
        */

        if (
          filesToUpload.length >
          0
        ) {
          await uploadFiles(
            filesToUpload,
            token
          );
        } else {
          await loadFiles(
            token
          );
        }
      } catch (error) {
        console.error(
          "Login success error:",
          error
        );

        alert(
          `Login ke baad error: ${error.message}`
        );
      }
    };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout =
    () => {
      /*
        Backend mein logout endpoint
        ki zarurat nahi hai because JWT
        stateless hai.

        Local token remove karna enough hai.
      */

      clearAuth();

      setShowLogin(
        false
      );
    };

  // =====================================================
  // DOWNLOAD
  // =====================================================

  const downloadFile =
    async (item) => {
      const token =
        getToken();

      if (!token) {
        setShowLogin(
          true
        );

        return;
      }

      try {
        const response =
          await fetch(
            `${API_BASE}/files/${encodeURIComponent(
              item.id
            )}/download`,
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        if (
          response.status ===
          401
        ) {
          clearAuth();

          setShowLogin(
            true
          );

          return;
        }

        if (!response.ok) {
          let message =
            "Download failed.";

          try {
            const data =
              await response.json();

            message =
              data?.error ||
              data?.message ||
              message;
          } catch {}

          throw new Error(
            message
          );
        }

        const blob =
          await response.blob();

        const url =
          URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            "a"
          );

        link.href = url;

        link.download =
          item.name;

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(
          url
        );
      } catch (error) {
        console.error(
          "Download failed:",
          error
        );

        alert(
          `Download failed: ${error.message}`
        );
      }
    };

  // =====================================================
  // DELETE
  // =====================================================

  const deleteFile =
    async (item) => {
      const token =
        getToken();

      if (!token) {
        setShowLogin(
          true
        );

        return;
      }

      const confirmed =
        window.confirm(
          `"${item.name}" ko permanently delete karna hai?`
        );

      if (!confirmed) {
        return;
      }

      try {
        await apiFetch(
          `/files/${encodeURIComponent(
            item.id
          )}`,
          {
            method: "DELETE",
          },
          token
        );

        setFiles(
          (previous) =>
            previous.filter(
              (file) =>
                String(
                  file.id
                ) !==
                String(
                  item.id
                )
            )
        );
      } catch (error) {
        console.error(
          "Delete failed:",
          error
        );

        alert(
          `Delete failed: ${error.message}`
        );
      }
    };

  // =====================================================
  // FILTER
  // =====================================================

  const filteredFiles =
    useMemo(() => {
      return files.filter(
        (file) => {
          const matchesSearch =
            file.name
              .toLowerCase()
              .includes(
                search.toLowerCase()
              );

          const matchesCategory =
            activeCategory ===
              "All" ||
            file.category ===
              activeCategory;

          return (
            matchesSearch &&
            matchesCategory
          );
        }
      );
    }, [
      files,
      search,
      activeCategory,
    ]);

  // =====================================================
  // CATEGORIES
  // =====================================================

  const categories = [
    {
      name: "All",
      icon: "📁",
      count: files.length,
    },

    {
      name: "Photos",
      icon: "🖼️",
      count: files.filter(
        (file) =>
          file.category ===
          "Photos"
      ).length,
    },

    {
      name: "Videos",
      icon: "🎬",
      count: files.filter(
        (file) =>
          file.category ===
          "Videos"
      ).length,
    },

    {
      name: "Documents",
      icon: "📄",
      count: files.filter(
        (file) =>
          file.category ===
          "Documents"
      ).length,
    },

    {
      name: "Audio",
      icon: "🎵",
      count: files.filter(
        (file) =>
          file.category ===
          "Audio"
      ).length,
    },

    {
      name: "Other",
      icon: "📦",
      count: files.filter(
        (file) =>
          file.category ===
          "Other"
      ).length,
    },
  ];

  // =====================================================
  // STORAGE
  // =====================================================

  const totalStorageUsed =
    files.reduce(
      (
        total,
        file
      ) =>
        total +
        Number(
          file.size || 0
        ),
      0
    );

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="safe-file-page">

      {/* HEADER */}

      <div className="safe-file-top">

        <div className="safe-file-title">

          <div className="safe-file-logo">
            🔐
          </div>

          <div>
            <h1>
              Safe File
            </h1>

            <p>
              Your private space
              for photos, videos
              and documents.
            </p>
          </div>

        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems:
              "center",
          }}
        >

          {isLoggedIn && (
            <button
              className="login-button"
              onClick={
                handleLogout
              }
            >
              Logout
            </button>
          )}

          {isLoggedIn && currentUser?.email && (
  <span className="logged-user-email">
    {currentUser.email}
  </span>
)}

<button
  className="login-button"
  onClick={() => {
    if (!isLoggedIn) {
      setShowLogin(true);
    }
  }}
>
  {isLoggedIn
    ? "✓ Logged In"
    : "👤 Login"}
</button>

        </div>

      </div>

      {/* STORAGE */}

      <div className="storage-card">

        <div>
          <span className="storage-label">
            Your Private Storage
          </span>

          <strong>
            {formatSize(
              totalStorageUsed
            )}
          </strong>
        </div>

        <div className="storage-icon">
          ☁️
        </div>

      </div>

      <p className="storage-note">
        Your files are stored
        in your private Safe
        File storage.
      </p>

      {/* MAIN */}

      <div className="safe-file-layout">

        {/* SIDEBAR */}

        <aside className="safe-sidebar">

          <div className="sidebar-title">
            My Files
          </div>

          {categories.map(
            (category) => (
              <button
                key={
                  category.name
                }
                className={
                  activeCategory ===
                  category.name
                    ? "category-button active"
                    : "category-button"
                }
                onClick={() =>
                  setActiveCategory(
                    category.name
                  )
                }
              >

                <span className="category-left">

                  <span>
                    {
                      category.icon
                    }
                  </span>

                  <span>
                    {
                      category.name
                    }
                  </span>

                </span>

                <span className="category-count">
                  {
                    category.count
                  }
                </span>

              </button>
            )
          )}

          <div className="sidebar-divider" />

          <button
            className="category-button"
            onClick={() =>
              setActiveCategory(
                "All"
              )
            }
          >
            <span className="category-left">
              <span>📂</span>
              <span>
                Folders
              </span>
            </span>
          </button>

          <button
            className="category-button"
            onClick={() =>
              setActiveCategory(
                "All"
              )
            }
          >
            <span className="category-left">
              <span>🗑️</span>
              <span>
                Trash
              </span>
            </span>
          </button>

        </aside>

        {/* CONTENT */}

        <main className="safe-file-content">

          {/* TOOLBAR */}

          <div className="file-toolbar">

            <div className="search-box">

              <span>
                🔎
              </span>

              <input
                type="text"
                placeholder="Search your files..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />

            </div>

            <label
              className="upload-main-button"
              style={{
                opacity:
                  uploading
                    ? 0.6
                    : 1,
                pointerEvents:
                  uploading
                    ? "none"
                    : "auto",
              }}
            >

              {uploading
                ? "⏳ Uploading..."
                : "⬆️ Upload Files"}

              <input
                ref={
                  fileInputRef
                }
                type="file"
                multiple
                hidden
                disabled={
                  uploading
                }
                onChange={
                  handleFileChange
                }
              />

            </label>

          </div>

          {/* LOADING */}

          {loadingFiles ? (

            <div className="empty-files">

              <div className="empty-icon">
                ⏳
              </div>

              <h2>
                Loading your
                files...
              </h2>

              <p>
                Your private
                files are being
                loaded securely.
              </p>

            </div>

          ) : filteredFiles.length ===
            0 ? (

            <div className="empty-files">

              <div className="empty-icon">
                📂
              </div>

              <h2>
                {files.length ===
                0
                  ? "Your Safe File is empty"
                  : "No files found"}
              </h2>

              <p>
                {files.length ===
                0
                  ? "Upload your photos, videos and documents to get started."
                  : "Try another search or category."}
              </p>

              {files.length ===
                0 && (

                <label
                  className="empty-upload-button"
                  style={{
                    opacity:
                      uploading
                        ? 0.6
                        : 1,
                    pointerEvents:
                      uploading
                        ? "none"
                        : "auto",
                  }}
                >

                  {uploading
                    ? "⏳ Uploading..."
                    : "⬆️ Upload Your First File"}

                  <input
                    ref={
                      emptyFileInputRef
                    }
                    type="file"
                    multiple
                    hidden
                    disabled={
                      uploading
                    }
                    onChange={
                      handleFileChange
                    }
                  />

                </label>

              )}

            </div>

          ) : (

            <div className="files-section">

              <div className="files-section-header">

                <div>

                  <h2>
                    {
                      activeCategory
                    }
                  </h2>

                  <span>
                    {
                      filteredFiles.length
                    }{" "}
                    file
                    {
                      filteredFiles.length !==
                      1
                        ? "s"
                        : ""
                    }
                  </span>

                </div>

              </div>

              {/* <div className="files-list"> */}
   <div className="files-list">

{activeCategory === "Photos" && (
  <div className="photos-grid">
    {filteredFiles.map((item, index) => (
      <div
        key={item.id}
        className="photo-grid-item"
        onClick={() =>
          handlePreviewFile(item, index)
        }
      >
        {photoThumbs[item.id] ? (
          <img
            src={photoThumbs[item.id]}
            alt={item.name}
            className="photo-grid-image"
          />
        ) : (
          <div className="photo-grid-loading">
            🖼️
          </div>
        )}

        <div className="photo-grid-name">
          {item.name}
        </div>
      </div>
    ))}
  </div>
)}






  


{activeCategory !== "Photos" &&
  filteredFiles.map(
    (item, index) => (

                    <div
  className="safe-file-item"
  key={item.id}
  onClick={() =>
    handlePreviewFile(item, index)
  }
  style={{
    cursor: "pointer",
  }}
>

                      <div className="file-type-icon">

                        {item.category ===
                        "Photos"
                          ? "🖼️"
                          : item.category ===
                            "Videos"
                          ? "🎬"
                          : item.category ===
                            "Documents"
                          ? "📄"
                          : item.category ===
                            "Audio"
                          ? "🎵"
                          : "📦"}

                      </div>

                      <div className="file-main-info">

                        <strong
                          title={
                            item.name
                          }
                        >
                          {
                            item.name
                          }
                        </strong>

                        <span>
                          {formatSize(
                            item.size
                          )}

                          {" • "}

                          {
                            item.category
                          }
                        </span>

                      </div>

                      <div className="file-actions">

                        <button
                          title="Download"
                          onClick={() =>
                            downloadFile(
                              item
                            )
                          }
                        >
                          ⬇️
                        </button>

                        <button
                          title="Delete"
                          onClick={() =>
                            deleteFile(
                              item
                            )
                          }
                        >
                          🗑️
                        </button>

                      </div>

                    </div>

                  )
                )}

              </div>

            </div>

          )}

        </main>

      </div>

      {/* PRIVACY */}

      <div className="privacy-banner">

        <span>
          🔒
        </span>

        <div>

          <strong>
            Your files are private
          </strong>

          <p>
            Files are accessible
            only to the
            authenticated owner.
          </p>

        </div>

      </div>

      {/* LOGIN MODAL */}

      {showLogin && (
        <AuthModal
          onClose={() => {
            setShowLogin(
              false
            );

            /*
              User explicitly closed
              login without completing it,
              so remove pending files.
            */
            setPendingFiles([]);
          }}
          onLogin={
            handleLoginSuccess
          }
        />
      )}






      {/* =====================================================
    FILE PREVIEW MODAL
===================================================== */}

{previewFile && (
  <div
    className="safe-file-preview-overlay"
    onClick={closePreview}
  >
    <div
      className="safe-file-preview-modal"
      onClick={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div className="safe-file-preview-header">
        <div className="safe-file-preview-title">
          {previewFile.name}
        </div>

        <button
          className="safe-file-preview-close"
          onClick={closePreview}
        >
          ✕
        </button>
      </div>

      {/* FILE CONTENT */}
      <div className="safe-file-preview-content">

        {previewLoading ? (
          <div className="safe-file-preview-loading">
            Loading...
          </div>
        ) : (
          <>
            {/* IMAGE */}
            {previewFile.category === "Photos" && (
              <img
                src={previewUrl}
                alt={previewFile.name}
                className="safe-file-preview-image"
              />
            )}

            {/* VIDEO */}
            {previewFile.category === "Videos" && (
              <video
                src={previewUrl}
                className="safe-file-preview-video"
                controls
                autoPlay
              />
            )}

            {/* AUDIO */}
            {previewFile.category === "Audio" && (
              <div className="safe-file-preview-audio-box">
                <div className="safe-file-preview-audio-icon">
                  🎵
                </div>

                <div className="safe-file-preview-audio-name">
                  {previewFile.name}
                </div>

                <audio
                  src={previewUrl}
                  controls
                  autoPlay
                  className="safe-file-preview-audio"
                />
              </div>
            )}

            {/* OTHER FILES */}
            {previewFile.category !== "Photos" &&
              previewFile.category !== "Videos" &&
              previewFile.category !== "Audio" && (
                <div className="safe-file-preview-other">
                  <div>📄</div>

                  <p>
                    Is file ka direct preview available nahi hai.
                  </p>

                  <button
                    onClick={() => {
                      const link =
                        document.createElement("a");

                      link.href = previewUrl;
                      link.download = previewFile.name;
                      link.click();
                    }}
                  >
                    ⬇ Download File
                  </button>
                </div>
              )}
          </>
        )}
      </div>

      {/* PREVIOUS / NEXT */}
      <div className="safe-file-preview-navigation">

        <button
          onClick={showPreviousPreview}
          disabled={
            (previewFile.previewIndex ?? 0) === 0
          }
        >
          ← Previous
        </button>

        <span>
          {(previewFile.previewIndex ?? 0) + 1}
          {" / "}
          {filteredFiles.length}
        </span>

        <button
          onClick={showNextPreview}
          disabled={
            (previewFile.previewIndex ?? 0) >=
            filteredFiles.length - 1
          }
        >
          Next →
        </button>

      </div>
    </div>
  </div>
)}

    </div>
  );
}