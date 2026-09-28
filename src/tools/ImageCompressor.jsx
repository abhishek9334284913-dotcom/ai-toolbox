import { useRef, useState } from "react";

function ImageCompressor() {
  const fileInputRef = useRef(null);

  const [image, setImage] = useState(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [quality, setQuality] = useState(80);
  const [resolution, setResolution] = useState("original");
  const [preview, setPreview] = useState("");
  const [compressedImage, setCompressedImage] = useState("");
  const [dimensions, setDimensions] = useState(null);
  const [outputDimensions, setOutputDimensions] = useState(null);
  const [error, setError] = useState("");

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getMaxResolution = (option) => {
    switch (option) {
      case "1080p":
        return { width: 1920, height: 1080 };

      case "2k":
        return { width: 2560, height: 1440 };

      case "4k":
        return { width: 3840, height: 2160 };

      default:
        return null;
    }
  };

  const calculateDimensions = (width, height, option) => {
    const maxSize = getMaxResolution(option);

    if (!maxSize) {
      return {
        width,
        height,
      };
    }

    const scale = Math.min(
      maxSize.width / width,
      maxSize.height / height
    );

    // Do not enlarge when using resolution mode unless
    // the user specifically selected an upscale option.
    if (scale <= 1) {
      return {
        width,
        height,
      };
    }

    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    };
  };

  const processImage = (file, selectedQuality, selectedResolution) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    setError("");
    setImage(file);
    setOriginalSize(file.size);

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        const newDimensions = calculateDimensions(
          img.width,
          img.height,
          selectedResolution
        );

        setDimensions({
          width: img.width,
          height: img.height,
        });

        setOutputDimensions(newDimensions);

        const canvas = document.createElement("canvas");

        canvas.width = newDimensions.width;
        canvas.height = newDimensions.height;

        const ctx = canvas.getContext("2d");

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(
          img,
          0,
          0,
          newDimensions.width,
          newDimensions.height
        );

        const qualityValue = selectedQuality / 100;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              setError("Image processing failed.");
              return;
            }

            const compressedUrl = URL.createObjectURL(blob);

            setPreview(event.target.result);
            setCompressedImage(compressedUrl);
            setCompressedSize(blob.size);
          },
          "image/jpeg",
          qualityValue
        );
      };

      img.onerror = () => {
        setError("Unable to read this image.");
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      processImage(file, quality, resolution);
    }
  };

  const handleQualityChange = (event) => {
    const newQuality = Number(event.target.value);

    setQuality(newQuality);

    if (image) {
      processImage(image, newQuality, resolution);
    }
  };

  const handleResolutionChange = (event) => {
    const newResolution = event.target.value;

    setResolution(newResolution);

    if (image) {
      processImage(image, quality, newResolution);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (event) => {
    event.preventDefault();

    const file = event.dataTransfer.files[0];

    if (file) {
      processImage(file, quality, resolution);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const downloadImage = () => {
    if (!compressedImage) return;

    const link = document.createElement("a");

    link.href = compressedImage;
    link.download = "ai-toolbox-image.jpg";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetTool = () => {
    setImage(null);
    setOriginalSize(0);
    setCompressedSize(0);
    setQuality(80);
    setResolution("original");
    setPreview("");
    setCompressedImage("");
    setDimensions(null);
    setOutputDimensions(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const reduction =
    originalSize && compressedSize
      ? Math.max(
          0,
          ((originalSize - compressedSize) / originalSize) * 100
        ).toFixed(1)
      : 0;

  return (
    <main className="image-compressor">
      <div className="compressor-header">
        <div className="tool-badge">🗜️ Image Tool</div>

        <h1>Image Optimizer</h1>

        <p>
          Compress, resize and optimize your images with
          high-quality output.
        </p>
      </div>

      {!image && (
        <div
          className="upload-box"
          onClick={handleUploadClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="upload-icon">🖼️</div>

          <h2>Upload Your Image</h2>

          <p>
            Drag & drop your image here or click to browse
          </p>

          <span>JPG • JPEG • PNG • WebP</span>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            hidden
          />
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {image && (
        <div className="compressor-result">

          {/* PREVIEW */}
          <div className="image-preview">

            <div className="preview-card">
              <h3>Original Image</h3>

              <img
                src={preview}
                alt="Original"
              />

              <p>
                {dimensions?.width} × {dimensions?.height}
              </p>

              <p>
                {formatSize(originalSize)}
              </p>
            </div>

            <div className="preview-card">
              <h3>Processed Image</h3>

              {compressedImage && (
                <img
                  src={compressedImage}
                  alt="Processed"
                />
              )}

              <p>
                {outputDimensions?.width} ×{" "}
                {outputDimensions?.height}
              </p>

              <p>
                {formatSize(compressedSize)}
              </p>
            </div>

          </div>

          {/* QUALITY */}
          <div className="compression-controls">

            <div className="quality-header">
              <label>
                Compression Quality
              </label>

              <strong>
                {quality}%
              </strong>
            </div>

            <input
              type="range"
              min="10"
              max="100"
              value={quality}
              onChange={handleQualityChange}
            />

            <div className="quality-labels">
              <span>Smaller File</span>
              <span>Better Quality</span>
            </div>

          </div>

          {/* RESOLUTION */}
          <div className="compression-controls">

            <div className="quality-header">
              <label>
                Output Resolution
              </label>
            </div>

            <select
              className="resolution-select"
              value={resolution}
              onChange={handleResolutionChange}
            >
              <option value="original">
                Original Resolution
              </option>

              <option value="1080p">
                1080p HD
              </option>

              <option value="2k">
                2K
              </option>

              <option value="4k">
                4K Ultra HD
              </option>
            </select>

            <p className="resolution-note">
              4K can increase resolution, but it cannot create
              new real details that were not present in the
              original image.
            </p>

          </div>

          {/* SIZE INFORMATION */}
          <div className="size-info">

            <div>
              <span>Original Size</span>
              <strong>
                {formatSize(originalSize)}
              </strong>
            </div>

            <div>
              <span>Output Size</span>
              <strong>
                {formatSize(compressedSize)}
              </strong>
            </div>

            <div>
              <span>Size Reduced</span>
              <strong>
                {reduction}%
              </strong>
            </div>

          </div>

          {/* BUTTONS */}
          <div className="action-buttons">

            <button
              className="download-button"
              onClick={downloadImage}
            >
              ⬇️ Download Image
            </button>

            <button
              className="reset-button"
              onClick={resetTool}
            >
              🔄 Compress Another
            </button>

          </div>

        </div>
      )}
    </main>
  );
}

export default ImageCompressor;