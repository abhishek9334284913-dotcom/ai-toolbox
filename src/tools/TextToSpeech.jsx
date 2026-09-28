import { useState } from "react";

function TextToSpeech() {
  const [text, setText] = useState("");

  const [voiceType, setVoiceType] = useState("natural");
  const [emotion, setEmotion] = useState("auto");
  const [language, setLanguage] = useState("hi-IN");

const [speed, setSpeed] = useState(0.9);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);

  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);
  const [audio, setAudio] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const wordCount = text.trim()
    ? text.trim().split(/\s+/).length
    : 0;

  const characterCount = text.length;

  // Temporary voice for testing








  // const voiceId = "JBFqnCBsd6RMkjVDRZzb";

  // ==========================================
  // FORMAT TIME
  // ==========================================

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) {
      return "00:00";
    }

    const mins = Math.floor(seconds / 60);

    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");

    return `${mins.toString().padStart(2, "0")}:${secs}`;
  };

  // ==========================================
  // GENERATE VOICE
  // ==========================================


















const generateVoice = async () => {
  if (!text.trim()) {
    alert("Please enter some text first.");
    return;
  }

  try {
    setIsGenerating(true);

    // Stop previous audio
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    // Remove old URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl("");
    setAudioBlob(null);
    setAudio(null);
    setIsPlaying(false);
    setDuration(0);
    setCurrentTime(0);

    // ==========================================
    // SEND COMPLETE SCRIPT TO OUR BACKEND
    // ==========================================

    const response = await fetch(
      "http://localhost:5000/api/tts/generate",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          text: text,

          settings: {
            voiceType: voiceType,
            language: language,
            emotion: emotion,
            speed: speed,
            pitch: pitch,
            volume: volume,
          },

          format: "wav",

          // Backend handles long-script chunking
          chunkSize: 3000,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
        "Voice generation job could not be created."
      );
    }

    if (!data.job || !data.job.id) {
      throw new Error(
        "Backend did not return a valid job ID."
      );
    }

    const jobId = data.job.id;

    console.log(
      "TTS Job Created:",
      jobId
    );

    // ==========================================
    // WAIT FOR BACKEND JOB
    // ==========================================

    let finished = false;

    while (!finished) {
      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );

      const statusResponse =
        await fetch(
          `http://localhost:5000/api/tts/job/${jobId}`
        );

      const statusData =
        await statusResponse.json();

      if (
        !statusResponse.ok ||
        !statusData.success
      ) {
        throw new Error(
          statusData.message ||
          "Could not check TTS job status."
        );
      }

      const job =
        statusData.job;

      console.log(
        `TTS Progress: ${job.progress}%`
      );

      if (job.status === "failed") {
        throw new Error(
          job.error ||
          "Voice generation failed."
        );
      }

      if (job.status === "cancelled") {
        throw new Error(
          "Voice generation was cancelled."
        );
      }

    if (job.status === "completed") {
  finished = true;

  console.log(
    "TTS Job Completed:",
    job
  );

  // =============================================
  // CHECK FINAL AUDIO URL
  // =============================================

  if (!job.outputUrl) {
    throw new Error(
      "Backend completed the job but did not return an audio URL."
    );
  }

  // =============================================
  // CREATE FULL AUDIO URL
  // =============================================

  const finalAudioUrl =
    job.outputUrl.startsWith("http")
      ? job.outputUrl
      : `http://localhost:5000${job.outputUrl}`;

  console.log(
    "Final Audio URL:",
    finalAudioUrl
  );

  // =============================================
  // FETCH FINAL AUDIO
  // =============================================

  const audioResponse =
    await fetch(finalAudioUrl);

  if (!audioResponse.ok) {
    throw new Error(
      `Generated audio could not be loaded. HTTP ${audioResponse.status}`
    );
  }

  const blob =
    await audioResponse.blob();

  if (!blob || blob.size === 0) {
    throw new Error(
      "Generated audio file is empty."
    );
  }

  // =============================================
  // CREATE BROWSER AUDIO URL
  // =============================================

  const browserAudioUrl =
    URL.createObjectURL(blob);

  // =============================================
  // CLEAN OLD AUDIO URL
  // =============================================

  if (audioUrl) {
    URL.revokeObjectURL(audioUrl);
  }

  // =============================================
  // SAVE AUDIO
  // =============================================

  setAudioBlob(blob);

  setAudioUrl(
    browserAudioUrl
  );

  setIsPlaying(false);
  setCurrentTime(0);
  setDuration(0);

  // =============================================
  // CREATE AUDIO OBJECT
  // =============================================

  const newAudio =
    new Audio(
      browserAudioUrl
    );

  newAudio.volume =
    volume;

  // =============================================
  // AUDIO METADATA
  // =============================================

  newAudio.onloadedmetadata = () => {
    if (
      Number.isFinite(
        newAudio.duration
      )
    ) {
      setDuration(
        newAudio.duration
      );
    }
  };

  // =============================================
  // AUDIO TIME UPDATE
  // =============================================

  newAudio.ontimeupdate = () => {
    setCurrentTime(
      newAudio.currentTime
    );
  };

  // =============================================
  // PLAY STATE
  // =============================================

  newAudio.onplay = () => {
    setIsPlaying(true);
  };

  // =============================================
  // PAUSE STATE
  // =============================================

  newAudio.onpause = () => {
    setIsPlaying(false);
  };

  // =============================================
  // AUDIO ENDED
  // =============================================

  newAudio.onended = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // =============================================
  // SAVE AUDIO OBJECT
  // =============================================

  setAudio(
    newAudio
  );

  console.log(
    "Audio ready for playback:",
    finalAudioUrl
  );

  break;
}
    }

  } catch (error) {
    console.error(
      "Voice generation error:",
      error
    );

    alert(
      error.message ||
      "Unable to generate voice."
    );

  } finally {
    setIsGenerating(false);
  }
};


















  // ==========================================
  // PLAY
  // ==========================================

  const playAudio = async () => {
    if (!audioUrl) {
      alert("First generate the voice.");
      return;
    }

    try {
      if (!audio) {
        const newAudio =
          new Audio(audioUrl);

        newAudio.volume = volume;

        setAudio(newAudio);

        await newAudio.play();

        return;
      }

      await audio.play();

    } catch (error) {
      console.error(
        "Play error:",
        error
      );

      alert(
        "Audio play nahi ho pa raha hai."
      );
    }
  };

  // ==========================================
  // PAUSE
  // ==========================================

  const pauseAudio = () => {
    if (!audio) {
      alert("First generate the voice.");
      return;
    }

    audio.pause();

    setIsPlaying(false);
  };

  // ==========================================
  // RESUME
  // ==========================================

  const resumeAudio = async () => {
    if (!audio) {
      alert("First generate the voice.");
      return;
    }

    try {
      await audio.play();

      setIsPlaying(true);

    } catch (error) {
      console.error(
        "Resume error:",
        error
      );

      alert(
        "Audio resume nahi ho pa raha hai."
      );
    }
  };

  // ==========================================
  // STOP
  // ==========================================

  const stopAudio = () => {
    if (!audio) {
      return;
    }

    audio.pause();

    audio.currentTime = 0;

    setCurrentTime(0);

    setIsPlaying(false);
  };

  // ==========================================
  // DOWNLOAD MP3
  // ==========================================

  const downloadAudio = () => {
    if (!audioBlob) {
      alert("First generate the voice.");
      return;
    }

    try {
      const downloadUrl =
        URL.createObjectURL(audioBlob);

      const link =
        document.createElement("a");

      link.href = downloadUrl;

      link.download =
        "ai-toolbox-voice.mp3";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 1000);

    } catch (error) {
      console.error(
        "Download error:",
        error
      );

      alert(
        "MP3 download nahi ho pa raha hai."
      );
    }
  };

  // ==========================================
  // CLEAR
  // ==========================================

  const clearText = () => {
    if (audio) {
      audio.pause();

      audio.currentTime = 0;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setText("");

    setAudioUrl("");

    setAudioBlob(null);

    setAudio(null);

    setIsPlaying(false);

    setDuration(0);

    setCurrentTime(0);
  };

  // ==========================================
  // VOLUME
  // ==========================================

  const changeVolume = (value) => {
    const newVolume =
      Number(value);

    setVolume(newVolume);

    if (audio) {
      audio.volume = newVolume;
    }
  };

  // ==========================================
  // SEEK AUDIO
  // ==========================================

  const seekAudio = (value) => {
    const newTime =
      Number(value);

    if (audio) {
      audio.currentTime = newTime;

      setCurrentTime(newTime);
    }
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="tts-tool">

      {/* HEADER */}

      <div className="tts-header">

        <div>

          <h1>
            🎙️ AI Text to Speech
          </h1>

          <p>
            Convert your stories and scripts
            into natural AI voice narration.
          </p>

        </div>

        <div className="tts-badge">
          🎧 AI Voice
        </div>

      </div>

      {/* MAIN LAYOUT */}

      <div className="tts-layout">

        {/* LEFT */}

        <div className="tts-main-card">

          <div className="tts-section-title">

            <span>📝</span>

            <h2>
              Your Story / Script
            </h2>

          </div>

          <textarea
            className="tts-textarea"
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            placeholder="Paste your long story or script here..."
          />

          {/* STATS */}

          <div className="tts-stats">

            <span>
              Words:{" "}
              <b>
                {wordCount}
              </b>
            </span>

            <span>
              Characters:{" "}
              <b>
                {characterCount}
              </b>
            </span>

          </div>

          {/* BUTTONS */}

          <div className="tts-buttons">

            <button
              className="tts-primary-btn"
              onClick={generateVoice}
              disabled={isGenerating}
            >
              {isGenerating
                ? "⏳ Generating..."
                : "🎙️ Generate Voice"}
            </button>

            <button
              className="tts-secondary-btn"
              onClick={playAudio}
              disabled={!audioUrl}
            >
              ▶️ Play
            </button>

            <button
              className="tts-secondary-btn"
              onClick={pauseAudio}
              disabled={!audio}
            >
              ⏸️ Pause
            </button>

            <button
              className="tts-secondary-btn"
              onClick={resumeAudio}
              disabled={!audio}
            >
              ▶️ Resume
            </button>

            <button
              className="tts-danger-btn"
              onClick={stopAudio}
              disabled={!audio}
            >
              ⏹️ Stop
            </button>

            <button
              className="tts-secondary-btn"
              onClick={clearText}
            >
              🗑️ Clear
            </button>

          </div>

          {/* AUDIO PLAYER */}

          {audioUrl && (

            <div
              style={{
                marginTop: "20px",
                padding: "20px",
                borderRadius: "14px",
                background: "#171d2d",
                border: "1px solid #303952",
              }}
            >

              {/* STATUS */}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "14px",
                }}
              >

                <strong
                  style={{
                    fontSize: "16px",
                  }}
                >
                  {isPlaying
                    ? "🎵 Voice is playing..."
                    : "✅ Voice is ready"}
                </strong>

                <span
                  style={{
                    fontSize: "14px",
                    opacity: 0.8,
                  }}
                >
                  {formatTime(currentTime)}
                  {" / "}
                  {formatTime(duration)}
                </span>

              </div>

              {/* PROGRESS BAR */}

              <input
                type="range"
                min="0"
                max={
                  duration || 0
                }
                step="0.1"
                value={currentTime}
                onChange={(e) =>
                  seekAudio(e.target.value)
                }
                disabled={!duration}
                style={{
                  width: "100%",
                  cursor: "pointer",
                }}
              />

              {/* DURATION INFO */}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "8px",
                  fontSize: "13px",
                  opacity: 0.7,
                }}
              >

                <span>
                  ⏱️ Current:{" "}
                  {formatTime(currentTime)}
                </span>

                <span>
                  🕐 Duration:{" "}
                  {formatTime(duration)}
                </span>

              </div>

            </div>

          )}

          {/* DOWNLOAD */}

          <div className="tts-download-box">

            <div>

              <h3>
                ⬇️ Download Audio
              </h3>

              <p>
                Download your generated voice
                as an MP3 file.
              </p>

            </div>

            <button
              className="tts-download-btn"
              onClick={downloadAudio}
              disabled={!audioBlob}
            >
              ⬇️ Download MP3
            </button>

          </div>

        </div>

        {/* RIGHT SETTINGS */}

        <div className="tts-settings-card">

          <div className="tts-section-title">

            <span>⚙️</span>

            <h2>
              Voice Settings
            </h2>

          </div>

          {/* VOICE TYPE */}

          <label>
            Voice Type
          </label>

          <div className="voice-grid">

            <button
              className={
                voiceType === "male"
                  ? "voice-option active"
                  : "voice-option"
              }
              onClick={() =>
                setVoiceType("male")
              }
            >
              👨
              <span>
                Male
              </span>
            </button>

            <button
              className={
                voiceType === "female"
                  ? "voice-option active"
                  : "voice-option"
              }
              onClick={() =>
                setVoiceType("female")
              }
            >
              👩
              <span>
                Female
              </span>
            </button>

            <button
              className={
                voiceType === "robot"
                  ? "voice-option active"
                  : "voice-option"
              }
              onClick={() =>
                setVoiceType("robot")
              }
            >
              🤖
              <span>
                Robot
              </span>
            </button>

            <button
              className={
                voiceType === "natural"
                  ? "voice-option active"
                  : "voice-option"
              }
              onClick={() =>
                setVoiceType("natural")
              }
            >
              🧠
              <span>
                AI Natural
              </span>
            </button>

          </div>

          {/* LANGUAGE */}

          <label>
            Language
          </label>

          <select
            value={language}
            onChange={(e) =>
              setLanguage(e.target.value)
            }
          >

            <option value="hi-IN">
              Hindi (India)
            </option>

            <option value="en-IN">
              English (India)
            </option>

            <option value="en-US">
              English (US)
            </option>

          </select>

          {/* EMOTION */}

          <label>
            Emotion
          </label>

          <select
            value={emotion}
            onChange={(e) =>
              setEmotion(e.target.value)
            }
          >

            <option value="auto">
              🧠 Auto Emotion
            </option>

            <option value="neutral">
              😐 Neutral
            </option>

            <option value="happy">
              😄 Happy
            </option>

            <option value="sad">
              😢 Sad
            </option>

            <option value="angry">
              😡 Angry
            </option>

            <option value="horror">
              😨 Horror
            </option>

            <option value="suspense">
              😱 Suspense
            </option>

            <option value="emotional">
              ❤️ Emotional
            </option>

            <option value="calm">
              😌 Calm
            </option>

          </select>

          {/* SPEED */}

          <div className="tts-slider">

            <div>

              <span>
                🎚️ Speed
              </span>

              <b>
                {speed.toFixed(1)}x
              </b>

            </div>

            <input
              type="range"
              min="0.7"
              max="1.2"
              step="0.1"
              value={speed}
              onChange={(e) =>
                setSpeed(
                  Number(e.target.value)
                )
              }
            />

          </div>

          {/* PITCH */}

          <div className="tts-slider">

            <div>

              <span>
                🎵 Pitch
              </span>

              <b>
                {pitch.toFixed(1)}
              </b>

            </div>

            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={pitch}
              onChange={(e) =>
                setPitch(
                  Number(e.target.value)
                )
              }
            />

          </div>

          {/* VOLUME */}

          <div className="tts-slider">

            <div>

              <span>
                🔊 Volume
              </span>

              <b>
                {Math.round(
                  volume * 100
                )}
                %
              </b>

            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) =>
                changeVolume(
                  e.target.value
                )
              }
            />

          </div>

        </div>

      </div>

      {/* INFO CARDS */}

      <div className="tts-info">

        <div>

          <span>
            📖
          </span>

          <strong>
            Long Stories
          </strong>

          <p>
            Convert stories and scripts
            into voice narration.
          </p>

        </div>

        <div>

          <span>
            🎭
          </span>

          <strong>
            Story Emotion
          </strong>

          <p>
            Choose the emotion for
            your narration.
          </p>

        </div>

        <div>

          <span>
            🎧
          </span>

          <strong>
            Natural Voice
          </strong>

          <p>
            Create realistic AI
            voice narration.
          </p>

        </div>

        <div>

          <span>
            🛡️
          </span>

          <strong>
            MP3 Audio
          </strong>

          <p>
            Download your generated
            narration.
          </p>

        </div>

      </div>

    </div>
  );
}

export default TextToSpeech;