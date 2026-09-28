// =====================================================
// TEXT TO AUDIO - ROUTES
// =====================================================

const express = require("express");
const fs = require("fs");
const path = require("path");

const {
  AUDIO_DIR,
  createTTSJob,
  getTTSJob,
  getPublicJob,
  startTTSJob,
  cancelTTSJob,
} = require("./tts.controller.cjs");

const router = express.Router();

// =====================================================
// SERVE GENERATED AUDIO
// =====================================================

router.get(
  "/audio/:fileName",
  (req, res) => {
    try {
      const fileName =
        path.basename(
          req.params.fileName
        );

      const filePath =
        path.join(
          AUDIO_DIR,
          fileName
        );

      // ---------------------------------------------
      // Check file exists
      // ---------------------------------------------

      if (
        !fs.existsSync(filePath)
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Audio file not found.",
        });
      }

      // ---------------------------------------------
      // WAV response headers
      // ---------------------------------------------

      res.setHeader(
        "Content-Type",
        "audio/wav"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${fileName}"`
      );

      // ---------------------------------------------
      // Send audio file
      // ---------------------------------------------

      return res.sendFile(
        filePath
      );

    } catch (error) {
      console.error(
        "TTS AUDIO SERVE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Could not load audio file.",
      });
    }
  }
);

// =====================================================
// CREATE TTS JOB
// =====================================================

router.post(
  "/generate",
  (req, res) => {
    try {
      const {
        text,
        settings = {},
        format = "wav",
        chunkSize = 3000,
      } = req.body;

      // ---------------------------------------------
      // Create job
      // ---------------------------------------------

      const job =
        createTTSJob({
          text,
          settings,
          format,
          chunkSize,
        });

      // ---------------------------------------------
      // Start processing
      // ---------------------------------------------

      startTTSJob(
        job.id
      );

      // ---------------------------------------------
      // Response
      // ---------------------------------------------

      return res.status(202).json({
        success: true,

        message:
          "Text-to-audio job created successfully.",

        job:
          getPublicJob(job),
      });

    } catch (error) {
      console.error(
        "TTS CREATE JOB ERROR:",
        error
      );

      return res.status(400).json({
        success: false,

        message:
          error.message ||
          "Could not create text-to-audio job.",
      });
    }
  }
);

// =====================================================
// GET JOB STATUS
// =====================================================

router.get(
  "/job/:id",
  (req, res) => {
    try {
      const job =
        getTTSJob(
          req.params.id
        );

      // ---------------------------------------------
      // Job not found
      // ---------------------------------------------

      if (!job) {
        return res.status(404).json({
          success: false,

          message:
            "Text-to-audio job not found.",
        });
      }

      // ---------------------------------------------
      // Return job
      // ---------------------------------------------

      return res.json({
        success: true,

        job:
          getPublicJob(job),
      });

    } catch (error) {
      console.error(
        "TTS JOB STATUS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Could not load TTS job status.",
      });
    }
  }
);

// =====================================================
// CANCEL JOB
// =====================================================

router.post(
  "/job/:id/cancel",
  (req, res) => {
    try {
      const job =
        cancelTTSJob(
          req.params.id
        );

      // ---------------------------------------------
      // Job not found
      // ---------------------------------------------

      if (!job) {
        return res.status(404).json({
          success: false,

          message:
            "Text-to-audio job not found.",
        });
      }

      // ---------------------------------------------
      // Return cancellation status
      // ---------------------------------------------

      return res.json({
        success: true,

        message:
          "Text-to-audio job cancellation requested.",

        job:
          getPublicJob(job),
      });

    } catch (error) {
      console.error(
        "TTS CANCEL ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Could not cancel TTS job.",
      });
    }
  }
);

// =====================================================
// TTS HEALTH / ENGINE STATUS
// =====================================================

router.get(
  "/status",
  (req, res) => {
    return res.json({
      success: true,

      service:
        "Text-to-Audio",

      status:
        "backend-ready",

      message:
        "Text-to-Audio backend is ready.",
    });
  }
);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;