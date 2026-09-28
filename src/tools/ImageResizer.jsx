import { useEffect, useRef, useState } from "react";

function ImageResizer() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  const [originalSize, setOriginalSize] = useState({
    width: 0,
    height: 0,
    size: 0,
  });

  const [resizedSize, setResizedSize] = useState({
    width: 0,
    height: 0,
    size: 0,
  });

  const [maintainRatio, setMaintainRatio] = useState(true);
  const [outputUrl, setOutputUrl] = useState(null);
  const [warning, setWarning] = useState("");

  const fileInputRef = useRef(null);

  // Upload image
  const handleImageUpload = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    const url = URL.createObjectURL(file);

    const img = new Image();

    img.onload = () => {
      setImage(file);
      setPreview(url);

      setWidth(img.width);
      setHeight(img.height);

      setOriginalSize({
        width: img.width,
        height: img.height,
        size: file.size,
      });

      setResizedSize({
        width: img.width,
        height: img.height,
        size: file.size,
      });

      setOutputUrl(null);
      setWarning("");
    };

    img.src = url;
  };

  // File select
  const handleFileChange = (e) => {
    handleImageUpload(e.target.files[0]);
  };

  // Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();

    const file = e.dataTransfer.files[0];

    handleImageUpload(file);
  };

  // Width change
  const handleWidthChange = (value) => {
    const newWidth = Number(value);

    setWidth(value);

    if (!newWidth || newWidth <= 0) {
      setWarning("");
      return;
    }

    if (maintainRatio && originalSize.width > 0) {
      const newHeight = Math.round(
        (newWidth / originalSize.width) * originalSize.height
      );

      setHeight(newHeight);
    }

    if (newWidth < 100) {
      setWarning(
        "⚠️ Very low resolution may make the image blurry."
      );
    } else {
      setWarning("");
    }
  };

  // Height change
  const handleHeightChange = (value) => {
    const newHeight = Number(value);

    setHeight(value);

    if (!newHeight || newHeight <= 0) {
      setWarning("");
      return;
    }

    if (maintainRatio && originalSize.height > 0) {
      const newWidth = Math.round(
        (newHeight / originalSize.height) * originalSize.width
      );

      setWidth(newWidth);
    }

    if (newHeight < 100) {
      setWarning(
        "⚠️ Very low resolution may make the image blurry."
      );
    } else {
      setWarning("");
    }
  };

  // Preset resolution
  const setPreset = (presetWidth, presetHeight) => {
    setMaintainRatio(false);

    setWidth(presetWidth);
    setHeight(presetHeight);

    if (presetWidth < 100 || presetHeight < 100) {
      setWarning(
        "⚠️ Very low resolution may make the image blurry."
      );
    } else {
      setWarning("");
    }
  };

  // Resize image
  const resizeImage = () => {
    if (!image) {
      alert("Please upload an image first.");
      return;
    }

    const targetWidth = Number(width);
    const targetHeight = Number(height);

    if (
      !targetWidth ||
      !targetHeight ||
      targetWidth <= 0 ||
      targetHeight <= 0
    ) {
      alert("Please enter valid width and height.");
      return;
    }

    // Maximum 4K
    if (targetWidth > 3840 || targetHeight > 3840) {
      alert("Maximum supported resolution is 3840 pixels.");
      return;
    }

    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");

      // Better image quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        img,
        0,
        0,
        targetWidth,
        targetHeight
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) return;

          const url = URL.createObjectURL(blob);

          setOutputUrl(url);

          setResizedSize({
            width: targetWidth,
            height: targetHeight,
            size: blob.size,
          });
        },
        image.type === "image/png"
          ? "image/png"
          : "image/jpeg",
        0.92
      );
    };

    img.src = preview;
  };

  // Download
  const downloadImage = () => {
    if (!outputUrl) {
      alert("Please resize the image first.");
      return;
    }

    const link = document.createElement("a");

    link.href = outputUrl;
    link.download = "resized-image.jpg";

    link.click();
  };

  // Reset
  const reset = () => {
    setImage(null);
    setPreview(null);
    setWidth("");
    setHeight("");
    setOutputUrl(null);
    setWarning("");

    setOriginalSize({
      width: 0,
      height: 0,
      size: 0,
    });

    setResizedSize({
      width: 0,
      height: 0,
      size: 0,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 KB";

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="image-resizer">

      {/* Header */}

      <div className="resizer-header">

        <div className="tool-badge">
          🖼️ Image Tool
        </div>

        <h1>Image Resizer</h1>

        <p>
          Resize your images to any width and height
          while keeping the best possible quality.
        </p>

      </div>

      <div className="resizer-container">

        {/* Upload */}

        {!image && (
          <div
            className="upload-box"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >

            <div className="upload-icon">
              🖼️
            </div>

            <h2>Upload Your Image</h2>

            <p>
              Drag & drop your image here or click to browse
            </p>

            <span>
              JPG, JPEG, PNG, WebP
            </span>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              hidden
            />

          </div>
        )}

        {/* Preview */}

        {image && (
          <>
            <div className="resizer-preview">

              {/* Original */}

              <div className="preview-card">

                <h3>Original Image</h3>

                <img
                  src={preview}
                  alt="Original"
                />

                <p>
                  {originalSize.width} ×{" "}
                  {originalSize.height}
                </p>

                <p>
                  {formatSize(originalSize.size)}
                </p>

              </div>

              {/* Resized */}

              <div className="preview-card">

                <h3>Resized Image</h3>

                {outputUrl ? (
                  <img
                    src={outputUrl}
                    alt="Resized"
                  />
                ) : (
                  <div
                    style={{
                      height: "330px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#777",
                      background: "#080b14",
                      borderRadius: "10px",
                    }}
                  >
                    Preview will appear here
                  </div>
                )}

                {outputUrl && (
                  <>
                    <p>
                      {resizedSize.width} ×{" "}
                      {resizedSize.height}
                    </p>

                    <p>
                      {formatSize(resizedSize.size)}
                    </p>
                  </>
                )}

              </div>

            </div>

            {/* Settings */}

            <div className="resize-controls">

              <h2>Resize Settings</h2>

              <div className="dimension-grid">

                <div className="dimension-field">

                  <label>
                    Width (px)
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="3840"
                    value={width}
                    onChange={(e) =>
                      handleWidthChange(e.target.value)
                    }
                  />

                </div>

                <div className="dimension-field">

                  <label>
                    Height (px)
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="3840"
                    value={height}
                    onChange={(e) =>
                      handleHeightChange(e.target.value)
                    }
                  />

                </div>

              </div>

              {/* Ratio */}

              <label className="ratio-option">

                <input
                  type="checkbox"
                  checked={maintainRatio}
                  onChange={(e) =>
                    setMaintainRatio(e.target.checked)
                  }
                />

                Maintain aspect ratio

              </label>

              {/* Warning */}

              {warning && (
                <div
                  style={{
                    marginTop: "18px",
                    padding: "12px 15px",
                    borderRadius: "10px",
                    background: "#2a2110",
                    border: "1px solid #735c20",
                    color: "#ffd76a",
                  }}
                >
                  {warning}
                </div>
              )}

              {/* Presets */}

              <div className="preset-buttons">

                <button
                  onClick={() =>
                    setPreset(1920, 1080)
                  }
                >
                  1080p
                </button>

                <button
                  onClick={() =>
                    setPreset(2560, 1440)
                  }
                >
                  2K
                </button>

                <button
                  onClick={() =>
                    setPreset(3840, 2160)
                  }
                >
                  4K
                </button>

              </div>

            </div>

            {/* Actions */}

            <div className="action-buttons">

              <button
                className="download-button"
                onClick={resizeImage}
              >
                🖼️ Resize Image
              </button>

              {outputUrl && (
                <button
                  className="download-button"
                  onClick={downloadImage}
                >
                  ⬇️ Download Image
                </button>
              )}

              <button
                className="reset-button"
                onClick={reset}
              >
                🔄 Start Again
              </button>

            </div>

          </>
        )}

      </div>

    </div>
  );
}

export default ImageResizer;