import { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function PDFMerger() {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState({});
  const [merging, setMerging] = useState(false);
  const [progress, setProgress] = useState(0);

  // Add PDF files
  const addFiles = (selectedFiles) => {
    const pdfFiles = Array.from(selectedFiles).filter(
      (file) => file.type === "application/pdf"
    );

    if (pdfFiles.length === 0) {
      alert("Please select PDF files only.");
      return;
    }

    setFiles((prev) => [...prev, ...pdfFiles]);
  };

  // File input
  const handleFileChange = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  // Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Remove one file
  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Move file up
  const moveUp = (index) => {
    if (index === 0) return;

    setFiles((prev) => {
      const updated = [...prev];

      [updated[index - 1], updated[index]] = [
        updated[index],
        updated[index - 1],
      ];

      return updated;
    });
  };

  // Move file down
  const moveDown = (index) => {
    if (index === files.length - 1) return;

    setFiles((prev) => {
      const updated = [...prev];

      [updated[index], updated[index + 1]] = [
        updated[index + 1],
        updated[index],
      ];

      return updated;
    });
  };

  // Generate first-page previews
  useEffect(() => {
    let cancelled = false;

    const generatePreviews = async () => {
      const newPreviews = {};

      for (let i = 0; i < files.length; i++) {
        try {
          const arrayBuffer = await files[i].arrayBuffer();

          const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer,
          }).promise;

          const page = await pdf.getPage(1);

          const viewport = page.getViewport({
            scale: 0.7,
          });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;

          newPreviews[i] = canvas.toDataURL("image/jpeg", 0.8);
        } catch (error) {
          console.error("Preview error:", error);
        }
      }

      if (!cancelled) {
        setPreviews(newPreviews);
      }
    };

    if (files.length > 0) {
      generatePreviews();
    } else {
      setPreviews({});
    }

    return () => {
      cancelled = true;
    };
  }, [files]);

  // Merge PDFs
  const mergePDFs = async () => {
    if (files.length < 2) {
      alert("Please select at least 2 PDF files.");
      return;
    }

    setMerging(true);
    setProgress(0);

    try {
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const arrayBuffer = await file.arrayBuffer();

        const pdf = await PDFDocument.load(arrayBuffer);

        const pages = await mergedPdf.copyPages(
          pdf,
          pdf.getPageIndices()
        );

        pages.forEach((page) => {
          mergedPdf.addPage(page);
        });

        const currentProgress = Math.round(
          ((i + 1) / files.length) * 100
        );

        setProgress(currentProgress);

        await new Promise((resolve) =>
          setTimeout(resolve, 50)
        );
      }

      const pdfBytes = await mergedPdf.save();

      const blob = new Blob([pdfBytes], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "ai-toolbox-merged.pdf";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      setProgress(100);

      alert("PDFs merged successfully!");
    } catch (error) {
      console.error(error);
      alert(
        "Something went wrong while merging PDFs."
      );
    } finally {
      setTimeout(() => {
        setMerging(false);
        setProgress(0);
      }, 800);
    }
  };

  // Clear all
  const clearFiles = () => {
    setFiles([]);
    setPreviews({});
    setProgress(0);
  };

  return (
    <div className="pdf-merger">
      <div className="pdf-header">
        <h1>PDF Merger</h1>

        <p>
          Merge multiple PDF files into one PDF quickly and easily.
        </p>
      </div>

      <div className="pdf-layout">

        {/* LEFT SIDE */}
        <div className="pdf-card">

          <h2>📄 Select PDF Files</h2>

          {/* Drag & Drop */}
          <div
            className="pdf-drop-zone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="drop-icon">📂</div>

            <h3>
              Drag & Drop PDF files here
            </h3>

            <p>or</p>

            <label className="browse-btn">
              Browse Files

              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileChange}
              />
            </label>

            <small>
              You can select multiple PDF files
            </small>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="selected-pdfs">

              <div className="pdf-selected-title">
                <strong>
                  {files.length} PDF file
                  {files.length > 1 ? "s" : ""} selected
                </strong>

                <button
                  className="clear-small-btn"
                  onClick={clearFiles}
                >
                  Clear All
                </button>
              </div>

              {files.map((file, index) => (
                <div
                  className="pdf-file-item"
                  key={`${file.name}-${index}`}
                >

                  {/* Preview */}
                  <div className="pdf-thumbnail">
                    {previews[index] ? (
                      <img
                        src={previews[index]}
                        alt={file.name}
                      />
                    ) : (
                      <div className="preview-loading">
                        ⏳
                      </div>
                    )}
                  </div>

                  {/* File information */}
                  <div className="pdf-file-info">

                    <strong>
                      {index + 1}. {file.name}
                    </strong>

                    <span>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>

                  </div>

                  {/* Controls */}
                  <div className="pdf-file-actions">

                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      title="Move Up"
                    >
                      ↑
                    </button>

                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === files.length - 1}
                      title="Move Down"
                    >
                      ↓
                    </button>

                    <button
                      className="remove-pdf-btn"
                      onClick={() => removeFile(index)}
                      title="Remove PDF"
                    >
                      ✕
                    </button>

                  </div>

                </div>
              ))}

            </div>
          )}

          {/* Merge Button */}
          <div className="pdf-buttons">

            <button
              className="primary-btn"
              onClick={mergePDFs}
              disabled={merging || files.length < 2}
            >
              {merging
                ? `Merging ${progress}%...`
                : "🔗 Merge PDFs"}
            </button>

            <button
              className="secondary-btn"
              onClick={clearFiles}
              disabled={merging}
            >
              Clear
            </button>

          </div>

          {/* Progress */}
          {merging && (
            <div className="pdf-progress">

              <div className="progress-text">
                <span>
                  Preparing your merged PDF...
                </span>

                <strong>
                  {progress}%
                </strong>
              </div>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                ></div>
              </div>

            </div>
          )}

        </div>

        {/* RIGHT SIDE */}
        <div className="pdf-card pdf-info-card">

          <h2>📑 Merge Information</h2>

          {files.length === 0 ? (
            <div className="empty-pdf-state">
              <div>📄</div>

              <h3>No PDF files selected</h3>

              <p>
                Add two or more PDF files to start merging.
              </p>
            </div>
          ) : (
            <>
              <div className="merge-status">
                <span>✅</span>

                <div>
                  <strong>
                    {files.length} PDF files selected
                  </strong>

                  <p>
                    Files will be merged in the order
                    shown on the left.
                  </p>
                </div>
              </div>

              <div className="merge-tips">

                <h3>💡 Quick Tips</h3>

                <p>
                  ↑ ↓ buttons se PDF ka order change kar sakte
                  ho.
                </p>

                <p>
                  ✕ button se kisi individual PDF ko remove
                  kar sakte ho.
                </p>

                <p>
                  Drag & Drop se directly PDF files add kar
                  sakte ho.
                </p>

              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
}

export default PDFMerger;