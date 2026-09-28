import { useState } from "react";
import { jsPDF } from "jspdf";

function ImageToPDF() {
  const [images, setImages] = useState([]);
  const [pageSize, setPageSize] = useState("a4");
  const [orientation, setOrientation] = useState("portrait");
  const [loading, setLoading] = useState(false);

  const handleImages = (e) => {
    const files = Array.from(e.target.files);

    if (!files.length) return;

    const imageFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );

    const previews = imageFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setImages(previews);
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(images[index].url);

    setImages((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const clearAll = () => {
    images.forEach((image) => {
      URL.revokeObjectURL(image.url);
    });

    setImages([]);
  };

  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = reject;

      img.src = url;
    });
  };

  const convertToPDF = async () => {
    if (!images.length) {
      alert("Please select at least one image.");
      return;
    }

    setLoading(true);

    try {
      const pdf = new jsPDF({
        orientation: orientation,
        unit: "mm",
        format: pageSize,
      });

      for (let i = 0; i < images.length; i++) {
        if (i > 0) {
          pdf.addPage(pageSize, orientation);
        }

        const img = await loadImage(images[i].url);

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const margin = 10;

        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2;

        const imageRatio = img.width / img.height;

        let width = maxWidth;
        let height = width / imageRatio;

        if (height > maxHeight) {
          height = maxHeight;
          width = height * imageRatio;
        }

        const x = (pageWidth - width) / 2;
        const y = (pageHeight - height) / 2;

        pdf.addImage(
          img,
          "JPEG",
          x,
          y,
          width,
          height
        );
      }

      pdf.save("ai-toolbox-images.pdf");
    } catch (error) {
      console.error(error);
      alert("PDF creation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="image-to-pdf">

      <div className="image-to-pdf-header">
        <h1>Image to PDF Converter</h1>

        <p>
          Convert your images into a PDF file quickly and easily.
        </p>
      </div>

      <div className="image-to-pdf-container">

        <div className="image-to-pdf-card">

          <h3>🖼️ Select Images</h3>

          <div className="image-upload-box">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImages}
            />
          </div>

          {images.length > 0 && (
            <p className="selected-image-count">
              ✅ {images.length} image
              {images.length > 1 ? "s" : ""} selected
            </p>
          )}

          <div className="image-to-pdf-options">

            <div>
              <label>Page Size</label>

              <select
                value={pageSize}
                onChange={(e) =>
                  setPageSize(e.target.value)
                }
              >
                <option value="a4">A4</option>
                <option value="a5">A5</option>
                <option value="letter">Letter</option>
                <option value="legal">Legal</option>
              </select>
            </div>

            <div>
              <label>Orientation</label>

              <select
                value={orientation}
                onChange={(e) =>
                  setOrientation(e.target.value)
                }
              >
                <option value="portrait">
                  Portrait
                </option>

                <option value="landscape">
                  Landscape
                </option>
              </select>
            </div>

          </div>

          <div className="image-to-pdf-buttons">

            <button
              className="primary-btn"
              onClick={convertToPDF}
              disabled={loading}
            >
              {loading
                ? "Creating PDF..."
                : "📄 Convert to PDF"}
            </button>

            <button
              className="secondary-btn"
              onClick={clearAll}
            >
              Clear
            </button>

          </div>

        </div>

        <div className="image-to-pdf-card">

          <h3>👀 Image Preview</h3>

          {images.length === 0 ? (
            <div className="empty-preview">
              <span>🖼️</span>
              <p>
                Select images to see preview
              </p>
            </div>
          ) : (
            <div className="image-to-pdf-preview">

              {images.map((image, index) => (
                <div
                  className="preview-item"
                  key={index}
                >
                  <img
                    src={image.url}
                    alt={`Preview ${index + 1}`}
                  />

                  <button
                    className="remove-image"
                    onClick={() =>
                      removeImage(index)
                    }
                  >
                    ✕
                  </button>

                  <span>
                    Image {index + 1}
                  </span>
                </div>
              ))}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default ImageToPDF;