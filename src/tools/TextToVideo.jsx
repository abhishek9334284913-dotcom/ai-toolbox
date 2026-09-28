import { useEffect, useState } from "react";
import VideoFocusMode from "./VideoFocusMode";

const ALLOWED_DURATIONS = [8, 10, 15];

const normalizeDuration = (value) => {
  const numeric = Number(value);
  return ALLOWED_DURATIONS.includes(numeric) ? numeric : 10;
};

function TextToVideo() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("10");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [quality, setQuality] = useState("1080p");
  const [style, setStyle] = useState("Cinematic");
  const [camera, setCamera] = useState("Dynamic");

  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPlacement, setMenuPlacement] = useState("down");

  const [characterConsistency, setCharacterConsistency] = useState(false);
  const [faceLock, setFaceLock] = useState(true);
  const [outfitLock, setOutfitLock] = useState(false);
  const [environmentLock, setEnvironmentLock] = useState(false);
  const [styleLock, setStyleLock] = useState(true);

  const [characterImage, setCharacterImage] = useState(null);
  const [characterPreview, setCharacterPreview] = useState("");

  const [generationCount, setGenerationCount] = useState("1");
  const [videos, setVideos] = useState([]);

  const [focusVideo, setFocusVideo] = useState(null);
  const [showAllVideos, setShowAllVideos] = useState(false);
  const [showMoreSettings, setShowMoreSettings] = useState(false);

  // Close menu when clicking outside.
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenMenuId(null);
    };

    document.addEventListener("click", handleOutsideClick);

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  // Clean up character preview URL.
  useEffect(() => {
    return () => {
      if (characterPreview) {
        URL.revokeObjectURL(characterPreview);
      }
    };
  }, [characterPreview]);

  const toggleVideoMenu = (event, videoId) => {
    event.stopPropagation();

    if (openMenuId === videoId) {
      setOpenMenuId(null);
      return;
    }

    const buttonRect = event.currentTarget.getBoundingClientRect();

    const menuHeight = 330;
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    setMenuPlacement(
      spaceBelow < menuHeight && spaceAbove > spaceBelow
        ? "up"
        : "down"
    );

    setOpenMenuId(videoId);
  };

  const handleCharacterUpload = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (characterPreview) {
      URL.revokeObjectURL(characterPreview);
    }

    setCharacterImage(file);
    setCharacterPreview(URL.createObjectURL(file));
  };

  const handleCharacterDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("character-drag-active");

    const file = e.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please drop an image file.");
      return;
    }

    if (characterPreview) {
      URL.revokeObjectURL(characterPreview);
    }

    setCharacterImage(file);
    setCharacterPreview(URL.createObjectURL(file));
  };

  const removeCharacter = () => {
    if (characterPreview) {
      URL.revokeObjectURL(characterPreview);
    }

    setCharacterImage(null);
    setCharacterPreview("");
  };

  const createJob = (videoPrompt, settings = {}) => {
    return {
      id:
        Date.now().toString() +
        "-" +
        Math.random().toString(36).slice(2),

      prompt: videoPrompt,

      status: "generating",
      progress: 0,

      duration: normalizeDuration(settings.duration ?? duration),
      aspectRatio: settings.aspectRatio ?? aspectRatio,
      quality: settings.quality ?? quality,
      style: settings.style ?? style,
      camera: settings.camera ?? camera,

      characterConsistency:
        settings.characterConsistency ?? characterConsistency,

      faceLock: settings.faceLock ?? faceLock,
      outfitLock: settings.outfitLock ?? outfitLock,
      environmentLock:
        settings.environmentLock ?? environmentLock,
      styleLock: settings.styleLock ?? styleLock,

      characterImageName:
        settings.characterImageName ??
        characterImage?.name ??
        "",

      videoUrl: "",
      taskId: "",
      createdAt: new Date().toLocaleTimeString(),
    };
  };

  /*
   * DURATION CONTRACT
   * UI/API duration is limited to 8s, 10s, or 15s.
   * Runway Seedance 2.5 supports these durations.
   * Magic Hour LTX 2.3 also supports these durations.
   * The backend must forward the same numeric duration to the selected provider.
   *
   * IMPORTANT:
   * We pass the job directly into simulateGeneration().
   * We do NOT search for the new job inside `videos`,
   * because React state does not update immediately after setVideos().
   */
  const generateVideo = () => {
    const cleanPrompt = prompt.trim();

    if (!cleanPrompt) {
      alert("Please enter a video prompt.");
      return;
    }

    const safeDuration = normalizeDuration(duration);
    const totalVideos = Number(generationCount);

    if (!Number.isFinite(totalVideos) || totalVideos < 1) {
      alert("Please select a valid number of videos.");
      return;
    }

    const newJobs = [];

    for (let i = 0; i < totalVideos; i++) {
      newJobs.push(
        createJob(cleanPrompt, {
          duration: safeDuration,
          aspectRatio,
          quality,
          style,
          camera,
          characterConsistency,
          faceLock,
          outfitLock,
          environmentLock,
          styleLock,
          characterImageName: characterImage?.name || "",
        })
      );
    }

    // Add jobs to UI immediately.
    setVideos((previous) => [...newJobs, ...previous]);

    // Clear prompt immediately.
    setPrompt("");

    // Start each generation using the actual job object.
    // This fixes the 0% stuck problem.
    newJobs.forEach((job) => {
      simulateGeneration(job.id, job);
    });
  };

  /*
   * REAL VIDEO GENERATION
   *
   * job is passed directly from generateVideo().
   * Therefore this function does not depend on the old `videos` state.
   */
  const simulateGeneration = async (jobId, job) => {
    if (!job) {
      console.error("Video job was not provided.");
      return;
    }

    setVideos((previous) =>
      previous.map((video) =>
        video.id === jobId
          ? {
              ...video,
              status: "generating",
              progress: 5,
              videoUrl: "",
            }
          : video
      )
    );

    try {
      console.log("Starting video generation:", job);

      /*
       * Step 1:
       * Start generation through Supabase Edge Function.
       */
      const { data, error } = await supabase.functions.invoke(
        "generate-video",
        {
          body: {
            prompt: job.prompt,
            duration: normalizeDuration(job.duration),
            aspectRatio: job.aspectRatio,
            quality: job.quality,

            style: job.style,
            camera: job.camera,

            characterConsistency:
              job.characterConsistency,

            faceLock: job.faceLock,
            outfitLock: job.outfitLock,
            environmentLock:
              job.environmentLock,
            styleLock: job.styleLock,

            characterImageName:
              job.characterImageName || "",
          },
        }
      );

      if (error) {
        console.error("Supabase function error:", error);
        throw error;
      }

      console.log("Generate-video response:", data);

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "Video generation request failed."
        );
      }

      const taskId = data?.job?.id;

      if (!taskId) {
        throw new Error(
          "Video task ID was not returned."
        );
      }

      console.log("Runway Task ID:", taskId);

      /*
       * Step 2:
       * Mark job as queued.
       */
      setVideos((previous) =>
        previous.map((video) =>
          video.id === jobId
            ? {
                ...video,
                status: "queued",
                progress: 15,
                taskId,
              }
            : video
        )
      );

      /*
       * Step 3:
       * Poll status.
       */
      let finished = false;
      let attempts = 0;

      const maxAttempts = 120;

      while (!finished && attempts < maxAttempts) {
        attempts += 1;

        await new Promise((resolve) => {
          setTimeout(resolve, 5000);
        });

        const {
          data: statusData,
          error: statusError,
        } = await supabase.functions.invoke(
          "generate-video",
          {
            body: {
              taskId,
            },
          }
        );

        if (statusError) {
          console.error(
            "Video status error:",
            statusError
          );

          throw statusError;
        }

        console.log(
          "Video status response:",
          statusData
        );

        if (!statusData?.success) {
          throw new Error(
            statusData?.message ||
              "Unable to check video status."
          );
        }

        const taskStatus = String(
          statusData.status || "pending"
        ).toLowerCase();

        console.log(
          "Video status:",
          taskStatus,
          `(${attempts}/${maxAttempts})`
        );

        /*
         * Still generating.
         */
        if (
          taskStatus === "pending" ||
          taskStatus === "running" ||
          taskStatus === "queued" ||
          taskStatus === "throttled" ||
          taskStatus === "processing"
        ) {
          const progress = Math.min(
            90,
            15 + attempts * 3
          );

          setVideos((previous) =>
            previous.map((video) =>
              video.id === jobId
                ? {
                    ...video,
                    status: "generating",
                    progress,
                    taskId,
                  }
                : video
            )
          );

          continue;
        }

        /*
         * Video completed.
         */
        if (
          taskStatus === "ready" ||
          taskStatus === "succeeded"
        ) {
          const videoUrl =
            statusData.videoUrl || "";

          if (!videoUrl) {
            throw new Error(
              "Video was generated but no video URL was returned."
            );
          }

          setVideos((previous) =>
            previous.map((video) =>
              video.id === jobId
                ? {
                    ...video,
                    status: "ready",
                    progress: 100,
                    videoUrl,
                    taskId,
                  }
                : video
            )
          );

          console.log(
            "Video ready:",
            videoUrl
          );

          finished = true;
          continue;
        }

        /*
         * Failed / canceled.
         */
        if (
          taskStatus === "failed" ||
          taskStatus === "canceled"
        ) {
          throw new Error(
            statusData?.message ||
              "Video generation failed."
          );
        }

        /*
         * Unknown status.
         */
        throw new Error(
          "Unknown video generation status."
        );
      }

      if (!finished) {
        throw new Error(
          "Video generation is taking too long. Please try again later."
        );
      }
    } catch (error) {
      console.error(
        "Video generation error:",
        error
      );

      setVideos((previous) =>
        previous.map((video) =>
          video.id === jobId
            ? {
                ...video,
                status: "error",
                progress: 0,
                videoUrl: "",
                errorMessage:
                  error?.message ||
                  "Video generation failed.",
              }
            : video
        )
      );
    }
  };

  const deleteVideo = (id) => {
    setVideos((previous) =>
      previous.filter((video) => video.id !== id)
    );

    setOpenMenuId(null);
  };

  const duplicateVideo = (video) => {
    setPrompt(video.prompt || "");
    setDuration(String(normalizeDuration(video.duration || 10)));
    setAspectRatio(
      video.aspectRatio || "9:16"
    );
    setQuality(
      video.quality || "1080p"
    );
    setStyle(
      video.style || "Cinematic"
    );
    setCamera(
      video.camera || "Dynamic"
    );

    setCharacterConsistency(
      Boolean(video.characterConsistency)
    );

    setFaceLock(
      video.faceLock ?? true
    );

    setOutfitLock(
      video.outfitLock ?? false
    );

    setEnvironmentLock(
      video.environmentLock ?? false
    );

    setStyleLock(
      video.styleLock ?? true
    );

    setOpenMenuId(null);
  };

  /*
   * Generate Again
   *
   * IMPORTANT:
   * Pass newJob directly to simulateGeneration().
   */
  const generateAgain = (video) => {
    const newJob = createJob(
      video.prompt || "",
      {
        duration:
          normalizeDuration(video.duration || 10),

        aspectRatio:
          video.aspectRatio || "9:16",

        quality:
          video.quality || "1080p",

        style:
          video.style || "Cinematic",

        camera:
          video.camera || "Dynamic",

        characterConsistency:
          video.characterConsistency ??
          characterConsistency,

        faceLock:
          video.faceLock ??
          faceLock,

        outfitLock:
          video.outfitLock ??
          outfitLock,

        environmentLock:
          video.environmentLock ??
          environmentLock,

        styleLock:
          video.styleLock ??
          styleLock,

        characterImageName:
          video.characterImageName || "",
      }
    );

    setVideos((previous) => [
      newJob,
      ...previous,
    ]);

    setOpenMenuId(null);

    simulateGeneration(
      newJob.id,
      newJob
    );
  };

  const playVideo = (video) => {
    if (!video.videoUrl) {
      alert(
        "Video is not ready yet."
      );

      setOpenMenuId(null);
      return;
    }

    window.open(
      video.videoUrl,
      "_blank",
      "noopener,noreferrer"
    );

    setOpenMenuId(null);
  };

  const downloadVideo = (video) => {
    if (!video.videoUrl) {
      alert(
        "Video download is available after generation is complete."
      );

      setOpenMenuId(null);
      return;
    }

    const link =
      document.createElement("a");

    link.href = video.videoUrl;

    link.download =
      `ai-toolbox-video-${video.id}.mp4`;

    link.target = "_blank";
    link.rel = "noopener noreferrer";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    setOpenMenuId(null);
  };

  const copyVideoLink = async (video) => {
    if (!video.videoUrl) {
      alert(
        "Video link is not available yet."
      );

      setOpenMenuId(null);
      return;
    }

    try {
      await navigator.clipboard.writeText(
        video.videoUrl
      );

      alert("Video link copied!");
    } catch {
      alert(
        "Could not copy video link."
      );
    }

    setOpenMenuId(null);
  };

  const getAspectRatioClass = (ratio) => {
    return `ratio-${String(
      ratio || "16:9"
    ).replace(":", "-")}`;
  };

  const getAspectRatioStyle = (ratio) => {
    if (ratio === "9:16") {
      return {
        aspectRatio: "9 / 16",
      };
    }

    if (ratio === "1:1") {
      return {
        aspectRatio: "1 / 1",
      };
    }

    return {
      aspectRatio: "16 / 9",
    };
  };

  const isGeneratingStatus = (status) => {
    return (
      status === "generating" ||
      status === "queued" ||
      status === "pending" ||
      status === "running" ||
      status === "processing" ||
      status === "throttled"
    );
  };

  /*
   * SINGLE VIDEO FOCUS MODE
   */
  if (focusVideo) {
    return (
      <VideoFocusMode
        video={focusVideo}
        onExit={() =>
          setFocusVideo(null)
        }
        playVideo={playVideo}
        downloadVideo={downloadVideo}
        copyVideoLink={copyVideoLink}
        generateAgain={generateAgain}
        duplicateVideo={duplicateVideo}
        deleteVideo={deleteVideo}
      />
    );
  }

  /*
   * ALL VIDEOS FOCUS MODE
   */
  if (showAllVideos) {
    return (
      <VideoFocusMode
        videos={videos}
        onExit={() =>
          setShowAllVideos(false)
        }
        playVideo={playVideo}
        downloadVideo={downloadVideo}
        copyVideoLink={copyVideoLink}
        generateAgain={generateAgain}
        duplicateVideo={duplicateVideo}
        deleteVideo={deleteVideo}
      />
    );
  }

  return (
    <div className="video-studio-page">

      {/* HEADER */}
      <div className="video-studio-header">
        <div>
          <div className="studio-title-row">
            <span className="studio-icon">
              🎬
            </span>

            <h1>AI Video Studio</h1>
          </div>

          <p>
            Create multiple AI videos from
            your prompts and keep your
            characters consistent.
          </p>
        </div>

        <div className="studio-badge">
          ✨ AI VIDEO
        </div>
      </div>

      {/* CHARACTER CONSISTENCY */}
      <div className="character-panel">

        <div className="character-panel-header">

          <div>
            <h2>
              👤 Character Consistency
            </h2>

            <p>
              Keep the same character
              across multiple videos and
              scenes.
            </p>
          </div>

          <button
            type="button"
            className={
              characterConsistency
                ? "consistency-toggle active"
                : "consistency-toggle"
            }
            onClick={() =>
              setCharacterConsistency(
                (previous) =>
                  !previous
              )
            }
          >
            {characterConsistency
              ? "ON"
              : "OFF"}
          </button>

        </div>

        {characterConsistency && (
          <div className="character-settings">

            {!characterPreview ? (
              <div
                className="character-upload"
                onDragOver={(e) => {
                  e.preventDefault();

                  e.currentTarget.classList.add(
                    "character-drag-active"
                  );
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove(
                    "character-drag-active"
                  );
                }}
                onDrop={handleCharacterDrop}
              >

                <input
                  type="file"
                  accept="image/*"
                  id="character-upload"
                  hidden
                  onChange={
                    handleCharacterUpload
                  }
                />

                <label
                  htmlFor="character-upload"
                  className="character-upload-content"
                >
                  <span className="character-upload-icon">
                    👤
                  </span>

                  <strong>
                    Add Character Reference
                  </strong>

                  <span>
                    Drag & Drop or click
                    to upload
                  </span>

                  <small>
                    Use a clear
                    face/reference image
                  </small>
                </label>

              </div>
            ) : (
              <div className="character-preview-box">

                <img
                  src={characterPreview}
                  alt="Character reference"
                />

                <div className="character-preview-info">

                  <strong>
                    {characterImage?.name ||
                      "Character Reference"}
                  </strong>

                  <button
                    type="button"
                    onClick={
                      removeCharacter
                    }
                  >
                    ✕ Remove
                  </button>

                </div>
              </div>
            )}

            <div className="character-options">

              <label>
                <input
                  type="checkbox"
                  checked={faceLock}
                  onChange={(e) =>
                    setFaceLock(
                      e.target.checked
                    )
                  }
                />

                <span>
                  🔒 Lock Face
                </span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={outfitLock}
                  onChange={(e) =>
                    setOutfitLock(
                      e.target.checked
                    )
                  }
                />

                <span>
                  👕 Lock Outfit
                </span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={
                    environmentLock
                  }
                  onChange={(e) =>
                    setEnvironmentLock(
                      e.target.checked
                    )
                  }
                />

                <span>
                  🌆 Lock Environment
                </span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={styleLock}
                  onChange={(e) =>
                    setStyleLock(
                      e.target.checked
                    )
                  }
                />

                <span>
                  🎨 Lock Style
                </span>
              </label>

            </div>
          </div>
        )}
      </div>

      {/* GENERATED VIDEOS */}
      {videos.length > 0 && (
        <div className="generated-videos-section">

          <div className="generated-videos-header">

            <div>
              <h2>
                🎬 My Videos
              </h2>

              <p>
                {videos.length} video job
                {videos.length > 1
                  ? "s"
                  : ""}
              </p>
            </div>

            <button
              type="button"
              className="view-all-videos-btn"
              onClick={() =>
                setShowAllVideos(true)
              }
            >
              ⛶ View All Videos
            </button>

            <span className="active-jobs">
              {
                videos.filter((video) =>
                  isGeneratingStatus(
                    video.status
                  )
                ).length
              }{" "}
              generating
            </span>

          </div>

          <div
            className="video-gallery"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
              gap: "18px",
              alignItems: "start",
              justifyItems: "stretch",
              width: "100%",
            }}
          >

            {videos.map((video) => (
              <div
                className="generated-video-card"
                key={video.id}
                style={{
                  position: "relative",
                  overflow: "visible",
                  alignSelf: "start",
                  minWidth: 0,
                }}
              >

                {/* VIDEO PREVIEW */}
                <div
                  className={`video-card-preview ${getAspectRatioClass(
                    video.aspectRatio
                  )}`}
                  style={{
                    ...getAspectRatioStyle(
                      video.aspectRatio
                    ),
                    width: "100%",
                    maxWidth: "100%",
                    overflow: "hidden",
                    position: "relative",
                    flex: "none",
                  }}
                >

                  {isGeneratingStatus(
                    video.status
                  ) ? (
                    <div
                      className="video-generating"
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        flexDirection:
                          "column",
                      }}
                    >

                      <div className="video-loading-icon">
                        🎬
                      </div>

                      <strong>
                        {video.status ===
                        "queued"
                          ? "Queued..."
                          : "Generating..."}
                      </strong>

                      <span>
                        {video.progress || 0}%
                      </span>

                      <div className="video-progress">
                        <div
                          style={{
                            width: `${
                              video.progress ||
                              0
                            }%`,
                          }}
                        />
                      </div>

                    </div>
                  ) : video.status ===
                    "error" ? (
                    <div
                      className="video-ready-placeholder"
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        flexDirection:
                          "column",
                        padding: "20px",
                        textAlign:
                          "center",
                      }}
                    >

                      <span>
                        ⚠️
                      </span>

                      <strong>
                        Generation Failed
                      </strong>

                      <small>
                        {video.errorMessage ||
                          "Please try again."}
                      </small>

                    </div>
                  ) : video.status ===
                      "ready" &&
                    video.videoUrl ? (
                    <video
                      src={video.videoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        objectFit:
                          "contain",
                        background:
                          "#000",
                      }}
                    />
                  ) : (
                    <div
                      className="video-ready-placeholder"
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        flexDirection:
                          "column",
                      }}
                    >
                      <span>
                        ⏳
                      </span>

                      <strong>
                        Waiting...
                      </strong>
                    </div>
                  )}

                </div>

                {/* THREE DOT MENU */}
                {(video.status ===
                  "ready" &&
                  video.videoUrl) && (
                  <div
                    className="video-menu-wrapper"
                    style={{
                      zIndex: 100000,
                    }}
                    onClick={(e) =>
                      e.stopPropagation()
                    }
                  >

                    <button
                      type="button"
                      className="video-three-dots"
                      aria-label="Video options"
                      title="Video options"
                      onClick={(e) =>
                        toggleVideoMenu(
                          e,
                          video.id
                        )
                      }
                    >
                      ⋮
                    </button>

                    {openMenuId ===
                      video.id && (
                      <div
                        className={`video-action-menu ${
                          menuPlacement ===
                          "up"
                            ? "menu-up"
                            : ""
                        }`}
                        style={{
                          position:
                            "absolute",
                          right: 0,
                          ...(menuPlacement ===
                          "up"
                            ? {
                                bottom:
                                  "46px",
                                top: "auto",
                              }
                            : {
                                top:
                                  "46px",
                              }),
                        }}
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                      >

                        <button
                          type="button"
                          onClick={() => {
                            playVideo(
                              video
                            );
                            setOpenMenuId(
                              null
                            );
                          }}
                        >
                          ▶ Play
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFocusVideo(
                              video
                            );
                            setOpenMenuId(
                              null
                            );
                          }}
                        >
                          ⛶ Focus Video
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            downloadVideo(
                              video
                            );
                            setOpenMenuId(
                              null
                            );
                          }}
                        >
                          ↓ Download MP4
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            copyVideoLink(
                              video
                            );
                            setOpenMenuId(
                              null
                            );
                          }}
                        >
                          🔗 Copy Link
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            generateAgain(
                              video
                            );
                            setOpenMenuId(
                              null
                            );
                          }}
                        >
                          🔄 Generate Again
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            duplicateVideo(
                              video
                            );
                            setOpenMenuId(
                              null
                            );
                          }}
                        >
                          📋 Duplicate
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() => {
                            deleteVideo(
                              video.id
                            );
                            setOpenMenuId(
                              null
                            );
                          }}
                        >
                          🗑 Delete
                        </button>

                      </div>
                    )}

                  </div>
                )}

                {/* CARD INFORMATION */}
                <div className="video-card-info">

                  <p>
                    {video.prompt}
                  </p>

                  <div className="video-card-meta">
                    <span>
                      {video.duration}s
                    </span>

                    <span>
                      {video.aspectRatio}
                    </span>

                    <span>
                      {video.quality}
                    </span>
                  </div>

                </div>

              </div>
            ))}

          </div>
        </div>
      )}

      {/* PROMPT COMPOSER */}
      <div className="video-composer">

        <textarea
          className="studio-prompt"
          placeholder="What do you want to create?"
          value={prompt}
          onChange={(e) =>
            setPrompt(e.target.value)
          }
          rows="4"
        />

        <div className="composer-toolbar">

          <div className="composer-left">

            <label
              className="composer-add"
              title="Add character/reference"
            >
              +

              <input
                type="file"
                accept="image/*"
                hidden
                onChange={
                  handleCharacterUpload
                }
              />
            </label>

            <button
              type="button"
              className={
                characterConsistency
                  ? "composer-tool active"
                  : "composer-tool"
              }
              onClick={() =>
                setCharacterConsistency(
                  (previous) =>
                    !previous
                )
              }
            >
              👤 Character
            </button>

            <button
              type="button"
              className="composer-tool"
              onClick={() =>
                alert(
                  "Frames option will be connected next."
                )
              }
            >
              🎞️ Frames
            </button>

            <button
              type="button"
              className="composer-tool"
              onClick={() =>
                setShowMoreSettings(
                  (previous) =>
                    !previous
                )
              }
            >
              ⚙ More
            </button>

          </div>

          <div className="composer-right">

            {/* ONLY 8 / 10 / 15 SECONDS */}
            <select
              value={duration}
              onChange={(e) =>
                setDuration(
                  String(
                    normalizeDuration(e.target.value)
                  )
                )
              }
              aria-label="Duration"
            >
              <option value="8">
                8s
              </option>

              <option value="10">
                10s
              </option>

              <option value="15">
                15s
              </option>
            </select>

            {/* ASPECT RATIO */}
            <select
              value={aspectRatio}
              onChange={(e) =>
                setAspectRatio(
                  e.target.value
                )
              }
              aria-label="Aspect ratio"
            >
              <option value="9:16">
                9:16
              </option>

              <option value="16:9">
                16:9
              </option>

              <option value="1:1">
                1:1
              </option>
            </select>

            {/* QUALITY */}
            <select
              value={quality}
              onChange={(e) =>
                setQuality(
                  e.target.value
                )
              }
              aria-label="Quality"
            >
              <option value="720p">
                720p
              </option>

              <option value="1080p">
                1080p
              </option>
            </select>

            {/* NUMBER OF VIDEOS */}
            <select
              value={generationCount}
              onChange={(e) =>
                setGenerationCount(
                  e.target.value
                )
              }
              aria-label="Number of videos"
            >
              <option value="1">
                x1
              </option>

              <option value="2">
                x2
              </option>

              <option value="3">
                x3
              </option>

              <option value="4">
                x4
              </option>
            </select>

            <button
              type="button"
              className="studio-generate-btn"
              onClick={generateVideo}
              aria-label="Generate video"
              title="Generate video"
            >
              ➜
            </button>

          </div>
        </div>

        {/* MORE SETTINGS */}
        {showMoreSettings && (
          <div className="more-settings-panel">

            <div className="more-setting">

              <label>
                🎨 Video Style
              </label>

              <select
                value={style}
                onChange={(e) =>
                  setStyle(
                    e.target.value
                  )
                }
              >
                <option value="Cinematic">
                  Cinematic
                </option>

                <option value="Realistic">
                  Realistic
                </option>

                <option value="3D Animation">
                  3D Animation
                </option>

                <option value="Anime">
                  Anime
                </option>

                <option value="Horror">
                  Horror
                </option>

                <option value="Fantasy">
                  Fantasy
                </option>

                <option value="Cartoon">
                  Cartoon
                </option>
              </select>

            </div>

            <div className="more-setting">

              <label>
                🎥 Camera
              </label>

              <select
                value={camera}
                onChange={(e) =>
                  setCamera(
                    e.target.value
                  )
                }
              >
                <option value="Dynamic">
                  Dynamic
                </option>

                <option value="Static">
                  Static
                </option>

                <option value="Zoom In">
                  Zoom In
                </option>

                <option value="Zoom Out">
                  Zoom Out
                </option>

                <option value="Pan Left">
                  Pan Left
                </option>

                <option value="Pan Right">
                  Pan Right
                </option>

                <option value="Orbit">
                  Orbit
                </option>

                <option value="Tracking">
                  Tracking
                </option>
              </select>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default TextToVideo;