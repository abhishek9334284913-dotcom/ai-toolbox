// =====================================================
// TEXT TO AUDIO - CONTROLLER
// =====================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const {
  createChunks,
} = require("./tts.chunker.cjs");

const {
  generateSpeech,
  normalizeVoiceSettings,
} = require("./tts.engine.cjs");

// -----------------------------------------------------
// AUDIO STORAGE
// -----------------------------------------------------

const AUDIO_DIR = path.join(
  __dirname,
  "..",
  "..",
  "storage",
  "audio"
);

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, {
    recursive: true,
  });
}

// -----------------------------------------------------
// JOB STORAGE
// -----------------------------------------------------

const jobs = new Map();

// -----------------------------------------------------
// JOB LIMITS
// -----------------------------------------------------

const MAX_SCRIPT_CHARACTERS = 500000;
const DEFAULT_CHUNK_SIZE = 3000;

// -----------------------------------------------------
// CREATE JOB ID
// -----------------------------------------------------

function createJobId() {
  return (
    `${Date.now()}-` +
    `${crypto.randomUUID()}`
  );
}

// -----------------------------------------------------
// CREATE JOB
// -----------------------------------------------------

function createTTSJob({
  text,
  settings = {},
  format = "wav",
  chunkSize = DEFAULT_CHUNK_SIZE,
}) {
  const script =
    String(text || "").trim();

  if (!script) {
    throw new Error(
      "Script text is required."
    );
  }

  if (
    script.length >
    MAX_SCRIPT_CHARACTERS
  ) {
    throw new Error(
      `Script is too long. Maximum allowed characters: ${MAX_SCRIPT_CHARACTERS}.`
    );
  }

  const requestedFormat =
    String(format || "wav").toLowerCase();

  if (requestedFormat !== "wav") {
    throw new Error(
      "Only WAV format is currently supported by the local Windows speech engine."
    );
  }

  const chunks = createChunks(
    script,
    chunkSize
  );

  if (!chunks.length) {
    throw new Error(
      "No usable text chunks were created."
    );
  }

  const jobId = createJobId();

  const job = {
    id: jobId,

    status: "queued",

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),

    textCharacters:
      script.length,

    textWords:
      script
        .split(/\s+/)
        .filter(Boolean)
        .length,

    totalChunks:
      chunks.length,

    completedChunks: 0,

    failedChunks: 0,

    currentChunk: 0,

    progress: 0,

    format: requestedFormat,

    settings:
      normalizeVoiceSettings(
        settings
      ),

    chunks: chunks.map(
      (chunk) => ({
        ...chunk,
        status: "queued",
        audioPath: null,
        duration: 0,
        error: null,
      })
    ),

    outputPath: null,

    outputUrl: null,

    duration: 0,

    error: null,

    cancelled: false,
  };

  jobs.set(jobId, job);

  return job;
}

// -----------------------------------------------------
// GET JOB
// -----------------------------------------------------

function getTTSJob(jobId) {
  return jobs.get(jobId) || null;
}

// -----------------------------------------------------
// UPDATE JOB
// -----------------------------------------------------

function updateJob(
  job,
  updates = {}
) {
  Object.assign(
    job,
    updates,
    {
      updatedAt:
        new Date().toISOString(),
    }
  );

  return job;
}

// -----------------------------------------------------
// UPDATE PROGRESS
// -----------------------------------------------------

function updateProgress(job) {
  if (!job.totalChunks) {
    job.progress = 0;
    return;
  }

  job.progress =
    Math.round(
      (
        job.completedChunks /
        job.totalChunks
      ) * 100
    );
}

// =====================================================
// WAV HELPERS
// =====================================================

// -----------------------------------------------------
// READ WAV FILE
// -----------------------------------------------------

function readWavFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `WAV file not found: ${filePath}`
    );
  }

  const buffer =
    fs.readFileSync(filePath);

  if (buffer.length < 12) {
    throw new Error(
      "Invalid WAV file: file is too small."
    );
  }

  const riff =
    buffer.toString(
      "ascii",
      0,
      4
    );

  const wave =
    buffer.toString(
      "ascii",
      8,
      12
    );

  if (
    riff !== "RIFF" ||
    wave !== "WAVE"
  ) {
    throw new Error(
      "Invalid WAV file: RIFF/WAVE header missing."
    );
  }

  let offset = 12;

  let fmtChunk = null;
  let dataChunk = null;

  while (
    offset + 8 <= buffer.length
  ) {
    const chunkId =
      buffer.toString(
        "ascii",
        offset,
        offset + 4
      );

    const chunkSize =
      buffer.readUInt32LE(
        offset + 4
      );

    const dataStart =
      offset + 8;

    const dataEnd =
      dataStart + chunkSize;

    if (
      dataEnd > buffer.length
    ) {
      throw new Error(
        "Invalid WAV chunk size."
      );
    }

    if (
      chunkId === "fmt "
    ) {
      fmtChunk =
        buffer.subarray(
          dataStart,
          dataEnd
        );
    }

    if (
      chunkId === "data"
    ) {
      dataChunk =
        buffer.subarray(
          dataStart,
          dataEnd
        );
    }

    offset =
      dataEnd +
      (chunkSize % 2);
  }

  if (!fmtChunk) {
    throw new Error(
      "WAV fmt chunk not found."
    );
  }

  if (!dataChunk) {
    throw new Error(
      "WAV data chunk not found."
    );
  }

  if (fmtChunk.length < 16) {
    throw new Error(
      "Invalid WAV fmt chunk."
    );
  }

  return {
    fmt: fmtChunk,
    data: dataChunk,
  };
}

// -----------------------------------------------------
// GET WAV DURATION
// -----------------------------------------------------

function getWavDuration(wav) {
  if (
    !wav ||
    !wav.fmt ||
    wav.fmt.length < 16
  ) {
    return 0;
  }

  const byteRate =
    wav.fmt.readUInt32LE(8);

  if (
    !byteRate ||
    !wav.data
  ) {
    return 0;
  }

  return (
    wav.data.length /
    byteRate
  );
}

// -----------------------------------------------------
// MERGE WAV FILES
// -----------------------------------------------------

function mergeWavFiles(
  inputFiles,
  outputFile
) {
  if (
    !Array.isArray(inputFiles) ||
    inputFiles.length === 0
  ) {
    throw new Error(
      "No WAV files available for merging."
    );
  }

  // -----------------------------------------------
  // ONE CHUNK
  // -----------------------------------------------

  if (
    inputFiles.length === 1
  ) {
    const singleFile =
      inputFiles[0];

    if (
      !fs.existsSync(
        singleFile
      )
    ) {
      throw new Error(
        "Generated WAV file does not exist."
      );
    }

    fs.copyFileSync(
      singleFile,
      outputFile
    );

    return;
  }

  // -----------------------------------------------
  // READ ALL WAV FILES
  // -----------------------------------------------

  const wavFiles =
    inputFiles.map(
      (file) =>
        readWavFile(file)
    );

  const first =
    wavFiles[0];

  const firstFmt =
    first.fmt;

  const audioFormat =
    firstFmt.readUInt16LE(0);

  const channels =
    firstFmt.readUInt16LE(2);

  const sampleRate =
    firstFmt.readUInt32LE(4);

  const byteRate =
    firstFmt.readUInt32LE(8);

  const blockAlign =
    firstFmt.readUInt16LE(12);

  const bitsPerSample =
    firstFmt.readUInt16LE(14);

  // -----------------------------------------------
  // REQUIRE PCM
  // -----------------------------------------------

  if (audioFormat !== 1) {
    throw new Error(
      "Only PCM WAV audio can be merged."
    );
  }

  // -----------------------------------------------
  // VERIFY SAME FORMAT
  // -----------------------------------------------

  for (
    let index = 1;
    index < wavFiles.length;
    index++
  ) {
    const fmt =
      wavFiles[index].fmt;

    if (fmt.length < 16) {
      throw new Error(
        "Invalid WAV format in chunk."
      );
    }

    const sameFormat =
      fmt.readUInt16LE(0) ===
        audioFormat &&
      fmt.readUInt16LE(2) ===
        channels &&
      fmt.readUInt32LE(4) ===
        sampleRate &&
      fmt.readUInt32LE(8) ===
        byteRate &&
      fmt.readUInt16LE(12) ===
        blockAlign &&
      fmt.readUInt16LE(14) ===
        bitsPerSample;

    if (!sameFormat) {
      throw new Error(
        "WAV chunks use different audio formats."
      );
    }
  }

  // -----------------------------------------------
  // COMBINE AUDIO DATA
  // -----------------------------------------------

  const audioData =
    Buffer.concat(
      wavFiles.map(
        (wav) =>
          wav.data
      )
    );

  // -----------------------------------------------
  // CREATE WAV HEADER
  // -----------------------------------------------

  const header =
    Buffer.alloc(44);

  header.write(
    "RIFF",
    0,
    4,
    "ascii"
  );

  header.writeUInt32LE(
    36 + audioData.length,
    4
  );

  header.write(
    "WAVE",
    8,
    4,
    "ascii"
  );

  header.write(
    "fmt ",
    12,
    4,
    "ascii"
  );

  header.writeUInt32LE(
    16,
    16
  );

  header.writeUInt16LE(
    audioFormat,
    20
  );

  header.writeUInt16LE(
    channels,
    22
  );

  header.writeUInt32LE(
    sampleRate,
    24
  );

  header.writeUInt32LE(
    byteRate,
    28
  );

  header.writeUInt16LE(
    blockAlign,
    32
  );

  header.writeUInt16LE(
    bitsPerSample,
    34
  );

  header.write(
    "data",
    36,
    4,
    "ascii"
  );

  header.writeUInt32LE(
    audioData.length,
    40
  );

  // -----------------------------------------------
  // WRITE FINAL WAV
  // -----------------------------------------------

  const finalBuffer =
    Buffer.concat([
      header,
      audioData,
    ]);

  fs.writeFileSync(
    outputFile,
    finalBuffer
  );
}

// =====================================================
// PROCESS ONE JOB
// =====================================================

async function processTTSJob(
  jobId
) {
  const job =
    getTTSJob(jobId);

  if (!job) {
    return;
  }

  try {
    updateJob(job, {
      status: "processing",
      error: null,
    });

    for (
      let index = 0;
      index < job.chunks.length;
      index++
    ) {
      if (job.cancelled) {
        updateJob(job, {
          status: "cancelled",
        });

        return;
      }

      const chunk =
        job.chunks[index];

      job.currentChunk =
        index + 1;

      chunk.status =
        "processing";

      updateProgress(job);

      try {
        const result =
          await generateSpeech({
            text: chunk.text,

            settings:
              job.settings,

            format:
              job.format,
          });

        if (
          !result ||
          !result.audioPath
        ) {
          throw new Error(
            "Speech engine did not return an audio file."
          );
        }

        if (
          !fs.existsSync(
            result.audioPath
          )
        ) {
          throw new Error(
            "Speech engine returned a WAV path, but the file does not exist."
          );
        }

        chunk.audioPath =
          result.audioPath;

        chunk.duration =
          Number(
            result.duration
          ) || 0;

        // If engine did not provide duration,
        // calculate it from the WAV file.
        if (
          chunk.duration <= 0
        ) {
          try {
            const wav =
              readWavFile(
                result.audioPath
              );

            chunk.duration =
              getWavDuration(wav);
          } catch (durationError) {
            console.warn(
              "Could not calculate chunk duration:",
              durationError.message
            );
          }
        }

        chunk.status =
          "completed";

        job.completedChunks++;

        updateProgress(job);

      } catch (error) {
        chunk.status =
          "failed";

        chunk.error =
          error.message ||
          "Audio generation failed.";

        job.failedChunks++;

        updateJob(job, {
          status: "failed",
          error:
            chunk.error,
        });

        return;
      }
    }

    // -------------------------------------------------
    // COLLECT GENERATED CHUNKS
    // -------------------------------------------------

    const chunkFiles =
      job.chunks
        .map(
          (chunk) =>
            chunk.audioPath
        )
        .filter(Boolean);

    if (
      chunkFiles.length !==
      job.totalChunks
    ) {
      throw new Error(
        "Some audio chunks are missing."
      );
    }

    // -------------------------------------------------
    // FINAL FILE
    // -------------------------------------------------

    const finalFileName =
      `tts-final-${Date.now()}-` +
      `${crypto.randomUUID()}.wav`;

    const finalOutputPath =
      path.join(
        AUDIO_DIR,
        finalFileName
      );

    // -------------------------------------------------
    // MERGE
    // -------------------------------------------------

    mergeWavFiles(
      chunkFiles,
      finalOutputPath
    );

    if (
      !fs.existsSync(
        finalOutputPath
      )
    ) {
      throw new Error(
        "Final WAV file was not created."
      );
    }

    const finalStats =
      fs.statSync(
        finalOutputPath
      );

    if (
      finalStats.size < 44
    ) {
      throw new Error(
        "Final WAV file is invalid or empty."
      );
    }

    // -------------------------------------------------
    // CALCULATE FINAL DURATION
    // -------------------------------------------------

    try {
      const finalWav =
        readWavFile(
          finalOutputPath
        );

      job.duration =
        getWavDuration(
          finalWav
        );
    } catch (durationError) {
      console.warn(
        "Could not calculate final WAV duration:",
        durationError.message
      );

      job.duration = 0;
    }

    // -------------------------------------------------
    // SAVE FINAL OUTPUT
    // -------------------------------------------------

    job.outputPath =
      finalOutputPath;

    job.outputUrl =
      `/api/tts/audio/${encodeURIComponent(
        finalFileName
      )}`;

    // -------------------------------------------------
    // CLEANUP TEMPORARY CHUNKS
    // -------------------------------------------------

    for (
      const chunkFile of chunkFiles
    ) {
      try {
        if (
          fs.existsSync(
            chunkFile
          )
        ) {
          fs.unlinkSync(
            chunkFile
          );
        }
      } catch (cleanupError) {
        console.warn(
          "Could not delete temporary WAV:",
          cleanupError.message
        );
      }
    }

    // -------------------------------------------------
    // COMPLETE
    // -------------------------------------------------

    updateJob(job, {
      status: "completed",
      progress: 100,
      currentChunk:
        job.totalChunks,
    });

  } catch (error) {
    console.error(
      "TTS JOB ERROR:",
      error
    );

    updateJob(job, {
      status: "failed",
      error:
        error.message ||
        "Text-to-audio job failed.",
    });
  }
}

// -----------------------------------------------------
// START JOB IN BACKGROUND
// -----------------------------------------------------

function startTTSJob(
  jobId
) {
  setImmediate(() => {
    processTTSJob(jobId)
      .catch((error) => {
        console.error(
          "BACKGROUND TTS ERROR:",
          error
        );
      });
  });
}

// -----------------------------------------------------
// CANCEL JOB
// -----------------------------------------------------

function cancelTTSJob(
  jobId
) {
  const job =
    getTTSJob(jobId);

  if (!job) {
    return null;
  }

  if (
    job.status === "completed" ||
    job.status === "failed"
  ) {
    return job;
  }

  job.cancelled = true;

  updateJob(job, {
    status: "cancelling",
  });

  return job;
}

// -----------------------------------------------------
// DELETE OLD JOB
// -----------------------------------------------------

function deleteTTSJob(
  jobId
) {
  const job =
    getTTSJob(jobId);

  if (!job) {
    return false;
  }

  // Remove generated final audio if it still exists.
  if (
    job.outputPath &&
    fs.existsSync(job.outputPath)
  ) {
    try {
      fs.unlinkSync(
        job.outputPath
      );
    } catch (error) {
      console.warn(
        "Could not delete final TTS audio:",
        error.message
      );
    }
  }

  jobs.delete(jobId);

  return true;
}

// -----------------------------------------------------
// JOB RESPONSE
// -----------------------------------------------------

function getPublicJob(
  job
) {
  if (!job) {
    return null;
  }

  return {
    id:
      job.id,

    status:
      job.status,

    progress:
      job.progress,

    currentChunk:
      job.currentChunk,

    totalChunks:
      job.totalChunks,

    completedChunks:
      job.completedChunks,

    failedChunks:
      job.failedChunks,

    textCharacters:
      job.textCharacters,

    textWords:
      job.textWords,

    format:
      job.format,

    outputPath:
      job.outputPath,

    outputUrl:
      job.outputUrl,

    duration:
      job.duration,

    error:
      job.error,

    createdAt:
      job.createdAt,

    updatedAt:
      job.updatedAt,
  };
}

// -----------------------------------------------------
// EXPORTS
// -----------------------------------------------------

module.exports = {
  AUDIO_DIR,

  MAX_SCRIPT_CHARACTERS,

  createTTSJob,

  getTTSJob,

  getPublicJob,

  startTTSJob,

  cancelTTSJob,

  deleteTTSJob,

  processTTSJob,
};