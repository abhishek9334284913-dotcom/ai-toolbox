import { useState } from "react";
import "./App.css";

import ImageCompressor from "./tools/ImageCompressor";
import ImageResizer from "./tools/ImageResizer";
import QRCodeGenerator from "./tools/QRCodeGenerator";
import ImageToPDF from "./tools/ImageToPDF";
import PDFMerger from "./tools/PDFMerger";
import TextToSpeech from "./tools/TextToSpeech";
import TextToVideo from "./tools/TextToVideo";
import SafeFile from "./tools/SafeFile";
import DeveloperTools from "./tools/DeveloperTools";

function App() {
  const [activeTool, setActiveTool] = useState(null);

  // =========================
  // OPEN TOOL
  // =========================

  const openTool = (tool) => {
    setActiveTool(tool);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================
  // GO HOME
  // =========================

  const goHome = () => {
    setActiveTool(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================
  // RENDER
  // =========================

  return (
    <div className="app">

      {/* ==================================================
          NAVBAR
      ================================================== */}

      <nav className="navbar">

        {/* LOGO */}

        <button
          className="logo"
          onClick={goHome}
        >
          <span>AI</span> ToolBox
        </button>


        {/* NAV LINKS */}

        <div className="nav-links">

          <button onClick={goHome}>
            Home
          </button>


          <button
            onClick={() => {
              setActiveTool(null);

              setTimeout(() => {
                document
                  .getElementById("tools")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
              }, 50);
            }}
          >
            AI Tools
          </button>


          <button
            onClick={() => {
              setActiveTool(null);

              setTimeout(() => {
                document
                  .getElementById("about")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
              }, 50);
            }}
          >
            About
          </button>

        </div>


        {/* EXPLORE BUTTON */}

        <button
          className="nav-button"
          onClick={() => {
            setActiveTool(null);

            setTimeout(() => {
              document
                .getElementById("tools")
                ?.scrollIntoView({
                  behavior: "smooth",
                });
            }, 50);
          }}
        >
          Explore Tools
        </button>

      </nav>


      {/* ==================================================
          TOOL PAGE
      ================================================== */}

      {activeTool === "image-compressor" ? (

        <ImageCompressor />

      ) : activeTool === "image-resizer" ? (

        <ImageResizer />

      ) : activeTool === "qr-generator" ? (

        <QRCodeGenerator />

      ) : activeTool === "image-to-pdf" ? (

        <ImageToPDF />

      ) : activeTool === "pdf-merger" ? (

        <PDFMerger />

      ) : activeTool === "text-to-speech" ? (

        <TextToSpeech />

      ) : activeTool === "text-to-video" ? (

        <TextToVideo />

      ) : activeTool === "safe-file" ? (

        <SafeFile />

      ) : activeTool === "developer-tools" ? (

        <DeveloperTools />

      ) : (

        <>
          {/* ==================================================
              HERO
          ================================================== */}

          <section
            className="hero"
            id="home"
          >

            <div className="hero-content">

              <div className="badge">
                ✨ Free AI & Online Tools
              </div>


              <h1>
                Powerful Tools.
                <br />
                <span>Simple & Free.</span>
              </h1>


              <p>
                Useful AI and online tools for students,
                creators and developers. Fast, simple and
                easy to use.
              </p>


              <div className="hero-buttons">

                {/* EXPLORE TOOLS */}

                <button
                  className="primary-button"
                  onClick={() => {
                    document
                      .getElementById("tools")
                      ?.scrollIntoView({
                        behavior: "smooth",
                      });
                  }}
                >
                  Explore Tools →
                </button>


                {/* LEARN MORE */}

                <button
                  className="secondary-button"
                  onClick={() => {
                    document
                      .getElementById("about")
                      ?.scrollIntoView({
                        behavior: "smooth",
                      });
                  }}
                >
                  Learn More
                </button>

              </div>

            </div>

          </section>


          {/* ==================================================
              TOOLS SECTION
          ================================================== */}

          <section
            className="tools-section"
            id="tools"
          >

            <div className="section-heading">

              <p>
                OUR TOOLS
              </p>

              <h2>
                Everything You Need
              </h2>

              <span>
                Free online tools designed to make your
                everyday work easier.
              </span>

            </div>


            {/* TOOLS GRID */}

            <div className="tools-grid">


              {/* ==================================================
                  IMAGE OPTIMIZER
              ================================================== */}

              <div className="tool-card">

                <div className="tool-icon">
                  🖼️
                </div>


                <h3>
                  Image Optimizer
                </h3>


                <p>
                  Compress images and reduce file size
                  without complicated steps.
                </p>


                <button
                  onClick={() =>
                    openTool("image-compressor")
                  }
                >
                  Use Tool →
                </button>

              </div>


              {/* ==================================================
                  IMAGE RESIZER
              ================================================== */}

              <div className="tool-card">

                <div className="tool-icon">
                  📐
                </div>


                <h3>
                  Image Resizer
                </h3>


                <p>
                  Resize your images to the exact dimensions
                  you need.
                </p>


                <button
                  onClick={() =>
                    openTool("image-resizer")
                  }
                >
                  Use Tool →
                </button>

              </div>


              {/* ==================================================
                  QR CODE GENERATOR
              ================================================== */}

              <div className="tool-card">

                <div className="tool-icon">
                  🔳
                </div>


                <h3>
                  QR Code Generator
                </h3>


                <p>
                  Create QR codes quickly for links, text
                  and other information.
                </p>


                <button
                  onClick={() =>
                    openTool("qr-generator")
                  }
                >
                  Use Tool →
                </button>

              </div>


              {/* ==================================================
                  IMAGE TO PDF
              ================================================== */}

              <div className="tool-card">

                <div className="tool-icon">
                  📄
                </div>


                <h3>
                  Image to PDF
                </h3>


                <p>
                  Convert multiple images into a PDF file
                  quickly and easily.
                </p>


                <button
                  onClick={() =>
                    openTool("image-to-pdf")
                  }
                >
                  Use Tool →
                </button>

              </div>


              {/* ==================================================
                  PDF MERGER
              ================================================== */}

              <div className="tool-card">

                <div className="tool-icon">
                  📑
                </div>


                <h3>
                  PDF Merger
                </h3>


                <p>
                  Merge multiple PDF files into one PDF
                  quickly and easily.
                </p>


                <button
                  onClick={() =>
                    openTool("pdf-merger")
                  }
                >
                  Use Tool →
                </button>

              </div>


              {/* ==================================================
                  TEXT TO SPEECH
              ================================================== */}

              <div className="tool-card">

                <div className="tool-icon">
                  🔊
                </div>


                <h3>
                  Text to Speech
                </h3>


                <p>
                  Convert written text into speech directly
                  from your browser.
                </p>


                <button
                  onClick={() =>
                    openTool("text-to-speech")
                  }
                >
                  Use Tool →
                </button>

              </div>


              {/* ==================================================
                  TEXT TO VIDEO
              ================================================== */}

              <div className="tool-card">

                <div className="tool-icon">
                  🎬
                </div>


                <div className="tool-card-content">

                  <h3>
                    Text to Video
                  </h3>


                  <p>
                    Create cinematic AI videos from text
                    prompts, images and scenes.
                  </p>


                  <div className="tool-badge">
                    AI Video
                  </div>


                  <button
                    onClick={() =>
                      openTool("text-to-video")
                    }
                  >
                    Create Video →
                  </button>

                </div>

              </div>


              {/* ==================================================
                  SAFE FILE
              ================================================== */}

              <div className="tool-card">

                <div className="tool-icon">
                  🔐
                </div>


                <h3>
                  Safe File
                </h3>


                <p>
                  Store your private files securely.
                </p>


                <button
                  onClick={() =>
                    openTool("safe-file")
                  }
                >
                  Use Tool →
                </button>

              </div>


              {/* ==================================================
                  DEVELOPER TOOLS
              ================================================== */}

              <div className="tool-card">

                <div className="tool-icon">
                  💻
                </div>


                <h3>
                  Developer Tools
                </h3>


                <p>
                  Helpful utilities for programmers and
                  web developers.
                </p>


                <button
                  onClick={() =>
                    openTool("developer-tools")
                  }
                >
                  Use Tool →
                </button>

              </div>


            </div>

          </section>


          {/* ==================================================
              ABOUT SECTION
          ================================================== */}

          <section
            className="about-section"
            id="about"
          >

            <div className="section-heading">

              <p>
                ABOUT US
              </p>


              <h2>
                Tools Made Simple
              </h2>


              <span>
                AI ToolBox is designed to provide simple
                and useful online tools that anyone can use
                without complicated software.
              </span>

            </div>

          </section>


          {/* ==================================================
              FOOTER
          ================================================== */}

          <footer className="footer">

            <div className="logo">
              <span>AI</span> ToolBox
            </div>


            <p>
              © 2026 AI ToolBox. All rights reserved.
            </p>

          </footer>

        </>

      )}

    </div>
  );
}

export default App;