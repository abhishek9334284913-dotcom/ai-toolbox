import React, { useEffect, useState } from "react";
import "./VideoFocusMode.css";

function VideoFocusMode({
  videos = [],
  onExit,
  playVideo,
  downloadVideo,
  copyVideoLink,
  generateAgain,
  duplicateVideo,
  deleteVideo,
  setFocusVideo,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);

  /*
   * KAHIN BAHAR CLICK KARNE PAR MENU CLOSE
   */
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenMenuId(null);
    };

    document.addEventListener("click", handleOutsideClick);

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  return (
    <div className="video-focus-page">

      {/* =====================================================
          FOCUS TOP BAR
      ====================================================== */}

      <div className="video-focus-topbar">

        <div className="video-focus-heading">

          <span className="video-focus-icon">
            🎬
          </span>

          <div>
            <h2>My Videos</h2>

            <p>
              {videos.length} video jobs
            </p>
          </div>

        </div>


        <div className="video-focus-actions">

          <span className="video-focus-count">
            {
              videos.filter(
                (video) => video.status === "generating"
              ).length
            } generating
          </span>


          <button
            type="button"
            className="video-focus-exit"
            onClick={onExit}
          >
            ✕ Exit
          </button>

        </div>

      </div>


      {/* =====================================================
          ALL VIDEOS
      ====================================================== */}

      <div className="video-focus-gallery">

        {videos.length === 0 ? (

          /* EMPTY */

          <div className="video-focus-empty">

            <div>🎬</div>

            <strong>
              No videos yet
            </strong>

            <span>
              Generate a video to see it here.
            </span>

          </div>

        ) : (

          /* VIDEO LIST */

          videos.map((video) => (

            <div
              className={`focus-video-card ${
                video.aspectRatio === "9:16"
                  ? "focus-ratio-9-16"
                  : video.aspectRatio === "1:1"
                  ? "focus-ratio-1-1"
                  : "focus-ratio-16-9"
              }`}
              key={video.id}
            >

              {/* =================================================
                  VIDEO PREVIEW
              ================================================== */}

              <div className="focus-video-preview">


                {/* =================================================
                    GENERATING
                ================================================== */}

                {video.status === "generating" ? (

                  <div className="focus-generating">

                    <div className="focus-spinner"></div>

                    <strong>
                      Generating Video...
                    </strong>


                    <div className="focus-progress-bar">

                      <div
                        className="focus-progress-fill"
                        style={{
                          width: `${video.progress || 0}%`,
                        }}
                      ></div>

                    </div>


                    <span>
                      {video.progress || 0}%
                    </span>

                  </div>


                ) : video.videoUrl ? (

                  /* =================================================
                      REAL VIDEO
                  ================================================== */

                  <video
                    src={video.videoUrl}
                    controls
                    playsInline
                    className="focus-video-player"
                  />

                ) : (

                  /* =================================================
                      VIDEO READY
                  ================================================== */

                  <div className="focus-video-ready">

                    <div className="focus-play-icon">
                      ▶
                    </div>

                    <strong>
                      Video Ready
                    </strong>

                  </div>

                )}


                {/* =================================================
                    THREE DOT MENU
                ================================================== */}

                {video.status === "ready" && (

                  <div
                    className="focus-menu-wrapper"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >

                    {/* THREE DOT BUTTON */}

                    <button
                      type="button"
                      className="focus-three-dots"
                      title="Video options"
                      aria-label="Video options"

                      onClick={(e) => {
                        e.stopPropagation();

                        setOpenMenuId((current) => {
                          if (current === video.id) {
                            return null;
                          }

                          return video.id;
                        });
                      }}
                    >
                      ⋮
                    </button>


                    {/* =================================================
                        ACTION MENU
                    ================================================== */}

                    {openMenuId === video.id && (

                      <div
                        className="focus-action-menu"

                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >

                        {/* PLAY */}

                        <button
                          type="button"
                          onClick={() => {
                            playVideo(video);
                            setOpenMenuId(null);
                          }}
                        >
                          ▶ Play
                        </button>


                        {/* FOCUS VIDEO */}

                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            setFocusVideo(video);
                          }}
                        >
                          ⛶ Focus Video
                        </button>


                        {/* DOWNLOAD */}

                        <button
                          type="button"
                          onClick={() => {
                            downloadVideo(video);
                            setOpenMenuId(null);
                          }}
                        >
                          ↓ Download MP4
                        </button>


                        {/* COPY LINK */}

                        <button
                          type="button"
                          onClick={() => {
                            copyVideoLink(video);
                            setOpenMenuId(null);
                          }}
                        >
                          🔗 Copy Link
                        </button>


                        {/* GENERATE AGAIN */}

                        <button
                          type="button"
                          onClick={() => {
                            generateAgain(video);
                            setOpenMenuId(null);
                          }}
                        >
                          🔄 Generate Again
                        </button>


                        {/* DUPLICATE */}

                        <button
                          type="button"
                          onClick={() => {
                            duplicateVideo(video);
                            setOpenMenuId(null);
                          }}
                        >
                          📋 Duplicate
                        </button>


                        {/* DELETE */}

                        <button
                          type="button"
                          className="danger"

                          onClick={() => {
                            deleteVideo(video);
                            setOpenMenuId(null);
                          }}
                        >
                          🗑 Delete
                        </button>

                      </div>

                    )}

                  </div>

                )}

              </div>


              {/* =================================================
                  VIDEO INFO
              ================================================== */}

              <div className="focus-video-info">

                <div className="focus-video-prompt">
                  {video.prompt || "Generated Video"}
                </div>


                <div className="focus-video-meta">

                  {video.duration && (
                    <span>
                      {video.duration}s
                    </span>
                  )}


                  {video.aspectRatio && (
                    <span>
                      {video.aspectRatio}
                    </span>
                  )}


                  {video.quality && (
                    <span>
                      {video.quality}
                    </span>
                  )}

                </div>

              </div>

            </div>

          ))

        )}

      </div>

    </div>
  );
}

export default VideoFocusMode;