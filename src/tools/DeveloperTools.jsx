import { useState } from "react";
import "./DeveloperTools.css";

function DeveloperTools() {
  const [activeTool, setActiveTool] = useState("json");

  // JSON
  const [jsonInput, setJsonInput] = useState("");
  const [jsonOutput, setJsonOutput] = useState("");

  // Base64
  const [base64Input, setBase64Input] = useState("");
  const [base64Output, setBase64Output] = useState("");

  // URL
  const [urlInput, setUrlInput] = useState("");
  const [urlOutput, setUrlOutput] = useState("");

  // Regex
  const [regexPattern, setRegexPattern] = useState("");
  const [regexText, setRegexText] = useState("");
  const [regexOutput, setRegexOutput] = useState("");

  // Color
  const [colorInput, setColorInput] = useState("#7C4DFF");
  const [colorOutput, setColorOutput] = useState("");

  // UUID
  const [uuidOutput, setUuidOutput] = useState("");

  // Timestamp
  const [timestampOutput, setTimestampOutput] = useState("");

  // =========================
  // JSON FORMATTER
  // =========================

  const formatJSON = () => {
    if (!jsonInput.trim()) {
      setJsonOutput("Please enter JSON data.");
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);

      setJsonOutput(JSON.stringify(parsed, null, 2));
    } catch (error) {
      setJsonOutput(
        `Invalid JSON\n\n${error.message}`
      );
    }
  };

  // =========================
  // JSON MINIFY
  // =========================

  const minifyJSON = () => {
    if (!jsonInput.trim()) {
      setJsonOutput("Please enter JSON data.");
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);

      setJsonOutput(JSON.stringify(parsed));
    } catch (error) {
      setJsonOutput(
        `Invalid JSON\n\n${error.message}`
      );
    }
  };

  // =========================
  // BASE64 ENCODE
  // =========================

  const encodeBase64 = () => {
    if (!base64Input) {
      setBase64Output("Please enter text.");
      return;
    }

    try {
      const encoded = btoa(
        unescape(
          encodeURIComponent(base64Input)
        )
      );

      setBase64Output(encoded);
    } catch (error) {
      setBase64Output("Base64 encoding failed.");
    }
  };

  // =========================
  // BASE64 DECODE
  // =========================

  const decodeBase64 = () => {
    if (!base64Input) {
      setBase64Output("Please enter Base64 text.");
      return;
    }

    try {
      const decoded = decodeURIComponent(
        escape(atob(base64Input))
      );

      setBase64Output(decoded);
    } catch (error) {
      setBase64Output("Invalid Base64 string.");
    }
  };

  // =========================
  // URL ENCODE
  // =========================

  const encodeURL = () => {
    if (!urlInput) {
      setUrlOutput("Please enter URL/text.");
      return;
    }

    try {
      setUrlOutput(
        encodeURIComponent(urlInput)
      );
    } catch (error) {
      setUrlOutput("URL encoding failed.");
    }
  };

  // =========================
  // URL DECODE
  // =========================

  const decodeURL = () => {
    if (!urlInput) {
      setUrlOutput("Please enter encoded URL/text.");
      return;
    }

    try {
      setUrlOutput(
        decodeURIComponent(urlInput)
      );
    } catch (error) {
      setUrlOutput("Invalid encoded URL.");
    }
  };

  // =========================
  // REGEX TESTER
  // =========================

  const testRegex = () => {
    if (!regexPattern.trim()) {
      setRegexOutput(
        "Please enter a regular expression."
      );
      return;
    }

    try {
      const regex = new RegExp(
        regexPattern,
        "g"
      );

      const matches = [
        ...regexText.matchAll(regex)
      ];

      if (matches.length === 0) {
        setRegexOutput("No matches found.");
        return;
      }

      const result = matches.map(
        (match, index) =>
          `${index + 1}. ${match[0]}`
      );

      setRegexOutput(
        `Matches Found: ${matches.length}\n\n${result.join(
          "\n"
        )}`
      );
    } catch (error) {
      setRegexOutput(
        `Invalid Regular Expression\n\n${error.message}`
      );
    }
  };

  // =========================
  // COLOR CONVERTER
  // =========================

  const convertColor = () => {
    const hex = colorInput
      .replace("#", "")
      .trim();

    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
      setColorOutput(
        "Please enter a valid 6-digit HEX color."
      );
      return;
    }

    const r = parseInt(
      hex.substring(0, 2),
      16
    );

    const g = parseInt(
      hex.substring(2, 4),
      16
    );

    const b = parseInt(
      hex.substring(4, 6),
      16
    );

    setColorOutput(
      `HEX: #${hex.toUpperCase()}\nRGB: rgb(${r}, ${g}, ${b})`
    );
  };

  // =========================
  // UUID
  // =========================

  const generateUUID = async () => {
    const uuid = crypto.randomUUID();

    setUuidOutput(uuid);

    try {
      await navigator.clipboard.writeText(uuid);
    } catch {
      // Clipboard permission not available.
    }
  };

  // =========================
  // TIMESTAMP
  // =========================

  const generateTimestamp = () => {
    const timestamp = Date.now();

    const date = new Date(timestamp);

    setTimestampOutput(
      `Unix Timestamp:\n${timestamp}\n\nISO Date:\n${date.toISOString()}`
    );
  };

  const tools = [
    {
      id: "json",
      icon: "🧾",
      title: "JSON Formatter",
      description:
        "Format, validate and minify JSON data.",
    },

    {
      id: "base64",
      icon: "🔐",
      title: "Base64 Encoder",
      description:
        "Encode and decode Base64 text.",
    },

    {
      id: "url",
      icon: "🔗",
      title: "URL Encoder",
      description:
        "Encode and decode URL components.",
    },

    {
      id: "regex",
      icon: "🔎",
      title: "Regex Tester",
      description:
        "Test regular expressions instantly.",
    },

    {
      id: "color",
      icon: "🎨",
      title: "Color Converter",
      description:
        "Convert HEX colors into RGB values.",
    },

    {
      id: "uuid",
      icon: "🆔",
      title: "UUID Generator",
      description:
        "Generate unique UUID identifiers.",
    },

    {
      id: "timestamp",
      icon: "⏱️",
      title: "Timestamp",
      description:
        "Generate current Unix timestamp.",
    },
  ];

  return (
    <div className="developer-page">

      {/* HEADER */}

      <div className="developer-header">

        <div>

          <h1>
            💻 Developer Tools
          </h1>

          <p>
            Useful tools for programmers and
            web developers.
          </p>

        </div>

      </div>

      {/* TOOL LIST */}

      <div className="developer-tools-grid">

        {tools.map((tool) => (

          <button
            key={tool.id}
            className={`developer-tool-card ${
              activeTool === tool.id
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveTool(tool.id)
            }
          >

            <div className="developer-tool-icon">
              {tool.icon}
            </div>

            <div>

              <h3>
                {tool.title}
              </h3>

              <p>
                {tool.description}
              </p>

            </div>

          </button>

        ))}

      </div>

      {/* ========================= */}
      {/* JSON */}
      {/* ========================= */}

      {activeTool === "json" && (

        <div className="developer-workspace">

          <div className="tool-panel">

            <div className="tool-title">

              <span>🧾</span>

              <div>
                <h2>
                  JSON Formatter
                </h2>

                <p>
                  Format, validate and minify
                  JSON data.
                </p>
              </div>

            </div>

            <div className="developer-editor-grid">

              <div>

                <label>
                  JSON Input
                </label>

                <textarea
                  value={jsonInput}
                  onChange={(e) =>
                    setJsonInput(
                      e.target.value
                    )
                  }
                  placeholder='{"name":"AI ToolBox","version":"1.0"}'
                />

                <div className="developer-button-row">

                  <button
                    onClick={formatJSON}
                  >
                    Format JSON
                  </button>

                  <button
                    className="secondary"
                    onClick={minifyJSON}
                  >
                    Minify
                  </button>

                  <button
                    className="danger"
                    onClick={() => {
                      setJsonInput("");
                      setJsonOutput("");
                    }}
                  >
                    Clear
                  </button>

                </div>

              </div>

              <div>

                <label>
                  Output
                </label>

                <textarea
                  value={jsonOutput}
                  readOnly
                  placeholder="Output will appear here..."
                />

              </div>

            </div>

          </div>

        </div>

      )}

      {/* ========================= */}
      {/* BASE64 */}
      {/* ========================= */}

      {activeTool === "base64" && (

        <div className="developer-workspace">

          <div className="tool-panel">

            <div className="tool-title">

              <span>🔐</span>

              <div>
                <h2>
                  Base64 Encoder / Decoder
                </h2>

                <p>
                  Encode and decode Base64 text.
                </p>
              </div>

            </div>

            <label>
              Input
            </label>

            <textarea
              value={base64Input}
              onChange={(e) =>
                setBase64Input(
                  e.target.value
                )
              }
              placeholder="Enter your text..."
            />

            <div className="developer-button-row">

              <button
                onClick={encodeBase64}
              >
                Encode
              </button>

              <button
                className="secondary"
                onClick={decodeBase64}
              >
                Decode
              </button>

              <button
                className="danger"
                onClick={() => {
                  setBase64Input("");
                  setBase64Output("");
                }}
              >
                Clear
              </button>

            </div>

            <label>
              Output
            </label>

            <textarea
              value={base64Output}
              readOnly
              placeholder="Result will appear here..."
            />

          </div>

        </div>

      )}

      {/* ========================= */}
      {/* URL */}
      {/* ========================= */}

      {activeTool === "url" && (

        <div className="developer-workspace">

          <div className="tool-panel">

            <div className="tool-title">

              <span>🔗</span>

              <div>
                <h2>
                  URL Encoder / Decoder
                </h2>

                <p>
                  Encode or decode URL text.
                </p>
              </div>

            </div>

            <label>
              Input
            </label>

            <textarea
              value={urlInput}
              onChange={(e) =>
                setUrlInput(
                  e.target.value
                )
              }
              placeholder="https://example.com/?name=hello world"
            />

            <div className="developer-button-row">

              <button
                onClick={encodeURL}
              >
                Encode URL
              </button>

              <button
                className="secondary"
                onClick={decodeURL}
              >
                Decode URL
              </button>

              <button
                className="danger"
                onClick={() => {
                  setUrlInput("");
                  setUrlOutput("");
                }}
              >
                Clear
              </button>

            </div>

            <label>
              Output
            </label>

            <textarea
              value={urlOutput}
              readOnly
              placeholder="Result will appear here..."
            />

          </div>

        </div>

      )}

      {/* ========================= */}
      {/* REGEX */}
      {/* ========================= */}

      {activeTool === "regex" && (

        <div className="developer-workspace">

          <div className="tool-panel">

            <div className="tool-title">

              <span>🔎</span>

              <div>
                <h2>
                  Regex Tester
                </h2>

                <p>
                  Test regular expressions.
                </p>
              </div>

            </div>

            <label>
              Regular Expression
            </label>

            <input
              type="text"
              value={regexPattern}
              onChange={(e) =>
                setRegexPattern(
                  e.target.value
                )
              }
              placeholder="Example: [A-Za-z]+"
            />

            <label>
              Test Text
            </label>

            <textarea
              value={regexText}
              onChange={(e) =>
                setRegexText(
                  e.target.value
                )
              }
              placeholder="Enter text to test..."
            />

            <div className="developer-button-row">

              <button
                onClick={testRegex}
              >
                Test Regex
              </button>

              <button
                className="danger"
                onClick={() => {
                  setRegexPattern("");
                  setRegexText("");
                  setRegexOutput("");
                }}
              >
                Clear
              </button>

            </div>

            <label>
              Result
            </label>

            <textarea
              value={regexOutput}
              readOnly
              placeholder="Regex results will appear here..."
            />

          </div>

        </div>

      )}

      {/* ========================= */}
      {/* COLOR */}
      {/* ========================= */}

      {activeTool === "color" && (

        <div className="developer-workspace">

          <div className="tool-panel">

            <div className="tool-title">

              <span>🎨</span>

              <div>
                <h2>
                  Color Converter
                </h2>

                <p>
                  Convert HEX color into RGB.
                </p>
              </div>

            </div>

            <div
              className="developer-color-preview"
              style={{
                backgroundColor:
                  colorInput,
              }}
            />

            <label>
              HEX Color
            </label>

            <input
              type="text"
              value={colorInput}
              onChange={(e) =>
                setColorInput(
                  e.target.value
                )
              }
              placeholder="#7C4DFF"
            />

            <div className="developer-button-row">

              <button
                onClick={convertColor}
              >
                Convert Color
              </button>

              <button
                className="danger"
                onClick={() => {
                  setColorInput(
                    "#7C4DFF"
                  );

                  setColorOutput("");
                }}
              >
                Clear
              </button>

            </div>

            <label>
              Result
            </label>

            <textarea
              value={colorOutput}
              readOnly
              placeholder="RGB result will appear here..."
            />

          </div>

        </div>

      )}

      {/* ========================= */}
      {/* UUID */}
      {/* ========================= */}

      {activeTool === "uuid" && (

        <div className="developer-workspace">

          <div className="tool-panel developer-simple-tool">

            <div className="tool-title">

              <span>🆔</span>

              <div>
                <h2>
                  UUID Generator
                </h2>

                <p>
                  Generate a unique UUID.
                </p>
              </div>

            </div>

            <div className="developer-big-result">
              {uuidOutput ||
                "Your UUID will appear here"}
            </div>

            <button
              onClick={generateUUID}
            >
              Generate UUID
            </button>

          </div>

        </div>

      )}

      {/* ========================= */}
      {/* TIMESTAMP */}
      {/* ========================= */}

      {activeTool === "timestamp" && (

        <div className="developer-workspace">

          <div className="tool-panel developer-simple-tool">

            <div className="tool-title">

              <span>⏱️</span>

              <div>
                <h2>
                  Unix Timestamp
                </h2>

                <p>
                  Generate the current Unix
                  timestamp.
                </p>
              </div>

            </div>

            <div className="developer-big-result">
              {timestampOutput ||
                "Timestamp will appear here"}
            </div>

            <button
              onClick={generateTimestamp}
            >
              Generate Timestamp
            </button>

          </div>

        </div>

      )}

    </div>
  );
}

export default DeveloperTools;