// =====================================================
// AI TOOLBOX - WINDOWS TTS ENGINE
// Windows.Media.SpeechSynthesis based
// =====================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

const AUDIO_DIR = path.join(__dirname, "..", "..", "storage", "audio");

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

const DEFAULT_VOICE_SETTINGS = {
  voiceType: "male",
  language: "hi-IN",
  emotion: "auto",
  speed: 1,
  pitch: 0,
  volume: 100,
  storyMode: "storytelling",
  emotionIntensity: 25,
  dramaticPause: 20,
  dialogueDetection: true,
  customPause: 0,
};

const ALLOWED_VOICE_TYPES = [
  "male",
  "female",
  "robot",
  "ai natural",
  "ai-natural",
  "natural",
  "neutral",
];

const ALLOWED_EMOTIONS = [
  "auto",
  "neutral",
  "happy",
  "sad",
  "angry",
  "horror",
  "fear",
  "suspense",
  "emotional",
  "calm",
];

const ALLOWED_STORY_MODES = [
  "storytelling",
  "cinematic",
  "horror",
  "documentary",
  "news",
  "motivational",
  "devotional",
  "kids",
  "whisper",
];

const ALLOWED_AUDIO_FORMATS = ["wav"];

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(Math.max(number, min), max);
}

function normalizeVoiceSettings(settings = {}) {
  const input = {
    ...DEFAULT_VOICE_SETTINGS,
    ...(settings || {}),
  };

  let voiceType = String(input.voiceType || "male").trim().toLowerCase();
  if (!ALLOWED_VOICE_TYPES.includes(voiceType)) voiceType = "male";

  let language = String(input.language || "hi-IN").trim();
  if (!language) language = "hi-IN";

  let emotion = String(input.emotion || "auto").trim().toLowerCase();
  if (!ALLOWED_EMOTIONS.includes(emotion)) emotion = "auto";

  let storyMode = String(input.storyMode || "storytelling").trim().toLowerCase();
  if (!ALLOWED_STORY_MODES.includes(storyMode)) storyMode = "storytelling";

  return {
    voiceType,
    language,
    emotion,
    speed: clamp(input.speed, 0.5, 2),
    pitch: clamp(input.pitch, -50, 50),
    volume: clamp(input.volume, 0, 100),
    storyMode,
    emotionIntensity: clamp(input.emotionIntensity, 0, 100),
    dramaticPause: clamp(input.dramaticPause, 0, 100),
    dialogueDetection:
      input.dialogueDetection === false ||
      String(input.dialogueDetection).toLowerCase() === "false"
        ? false
        : true,
    customPause: clamp(input.customPause, 0, 5000),
  };
}

function prepareSpeechRequest({ text, settings = {}, format = "wav" }) {
  const cleanText = String(text || "").trim();
  if (!cleanText) {
    throw new Error("Text is required for speech generation.");
  }

  let audioFormat = String(format || "wav").trim().toLowerCase();
  if (!ALLOWED_AUDIO_FORMATS.includes(audioFormat)) audioFormat = "wav";

  return {
    text: cleanText,
    settings: normalizeVoiceSettings(settings),
    format: audioFormat,
  };
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function splitSentences(text) {
  const clean = String(text || "").replace(/\r\n/g, "\n");
  const matches = clean.match(/[^.!?।！？]+[.!?।！？]+|[^.!?।！？]+$/g);
  if (!matches) return [clean.trim()].filter(Boolean);
  return matches.map((item) => item.trim()).filter(Boolean);
}

function detectEmotion(text) {
  const value = String(text || "").toLowerCase();

  if (/हंस|हँस|खुश|खुशी|मुस्कान|मुस्कुर|वाह|शानदार|कमाल|great|happy|laugh|smile|wonderful|amazing/i.test(value)) return "happy";
  if (/रो|रोना|दुख|दुःख|आंसू|आँसू|उदास|अकेला|दर्द|sad|cry|tears|pain|lonely/i.test(value)) return "sad";
  if (/गुस्सा|क्रोध|चिल्ला|नफरत|angry|anger|hate|shout|furious/i.test(value)) return "angry";
  if (/डर|डरावना|भय|खौफ|खतरा|भूत|हॉरर|साया|अंधेरा|dark|horror|fear|scared|danger|ghost/i.test(value)) return "horror";
  if (/रहस्य|सस्पेंस|अचानक|क्या होगा|रहस्यमय|mystery|suspense|suddenly|secret/i.test(value)) return "suspense";
  if (/शांत|शांति|सुकून|धीरे|calm|peace|peaceful|soft/i.test(value)) return "calm";
  if (/भावुक|भावना|प्रेम|प्यार|मां|माँ|पिता|याद|emotional|love|mother|father|memory/i.test(value)) return "emotional";

  return "neutral";
}

function getEmotionSettings(emotion, baseSettings) {
  const baseSpeed = Number(baseSettings.speed);
  const basePitch = Number(baseSettings.pitch);
  const baseVolume = Number(baseSettings.volume);

  const profiles = {
    neutral: { speed: baseSpeed, pitch: basePitch, volume: baseVolume },
    happy: { speed: baseSpeed * 1.03, pitch: basePitch + 4, volume: baseVolume + 1 },
    sad: { speed: baseSpeed * 0.94, pitch: basePitch - 4, volume: baseVolume - 2 },
    angry: { speed: baseSpeed * 1.04, pitch: basePitch + 4, volume: baseVolume + 1 },
    horror: { speed: baseSpeed * 0.90, pitch: basePitch - 6, volume: baseVolume - 3 },
    fear: { speed: baseSpeed * 0.94, pitch: basePitch + 5, volume: baseVolume },
    suspense: { speed: baseSpeed * 0.92, pitch: basePitch - 3, volume: baseVolume - 2 },
    emotional: { speed: baseSpeed * 0.95, pitch: basePitch - 2, volume: baseVolume },
    calm: { speed: baseSpeed * 0.94, pitch: basePitch - 1, volume: baseVolume - 1 },
  };

  return profiles[emotion] || profiles.neutral;
}

function getStoryModeSettings(mode) {
  const profiles = {
    storytelling: { speed: 1.00, pitch: 0, volume: 0, pause: 0.90 },
    cinematic: { speed: 0.92, pitch: -2, volume: 1, pause: 1.45 },
    horror: { speed: 0.78, pitch: -8, volume: -4, pause: 1.75 },
    documentary: { speed: 0.96, pitch: -1, volume: 0, pause: 1.05 },
    news: { speed: 1.05, pitch: 0, volume: 1, pause: 0.90 },
    motivational: { speed: 1.05, pitch: 3, volume: 3, pause: 0.95 },
    devotional: { speed: 0.88, pitch: -2, volume: -1, pause: 1.35 },
    kids: { speed: 1.08, pitch: 6, volume: 2, pause: 1.00 },
    whisper: { speed: 0.82, pitch: -4, volume: -18, pause: 1.30 },
  };

  return profiles[mode] || profiles.storytelling;
}

function blendNumber(base, target, intensity) {
  const amount = clamp(intensity, 0, 100) / 100;
  return base + (target - base) * amount;
}

function applyStoryMode(settings, emotionSettings) {
  const mode = getStoryModeSettings(settings.storyMode);
  return {
    speed: emotionSettings.speed * mode.speed,
    pitch: emotionSettings.pitch + mode.pitch,
    volume: emotionSettings.volume + mode.volume,
    pauseMultiplier: mode.pause,
  };
}

function splitDialogueAndText(text) {
  const value = String(text || "");
  const parts = [];
  let remaining = value;

  const quotePattern = /(["“”‘’«»]|'|")/;
  let safety = 0;

  while (remaining && safety < 10000) {
    safety++;

    const match = remaining.match(quotePattern);
    if (!match || match.index === undefined) {
      if (remaining.trim()) parts.push({ text: remaining, dialogue: false });
      break;
    }

    const index = match.index;
    if (index > 0) {
      const before = remaining.slice(0, index);
      if (before.trim()) parts.push({ text: before, dialogue: false });
    }

    const opening = remaining[index];
    const closingMap = {
      "“": "”",
      "‘": "’",
      "«": "»",
      "\"": "\"",
      "'": "'",
    };
    const closing = closingMap[opening] || opening;
    const afterOpen = remaining.slice(index + 1);
    const closeIndex = afterOpen.indexOf(closing);

    if (closeIndex === -1) {
      parts.push({ text: afterOpen, dialogue: true });
      break;
    }

    parts.push({
      text: afterOpen.slice(0, closeIndex),
      dialogue: true,
    });

    remaining = afterOpen.slice(closeIndex + 1);
  }

  return parts.filter((part) => part.text.trim());
}

function extractCustomPauses(text) {
  const pauses = [];
  const cleaned = String(text || "").replace(
    /\[pause\s*:\s*(\d{1,4})\s*(?:ms)?\]/gi,
    (_, ms) => {
      const safe = clamp(Number(ms), 0, 5000);
      pauses.push(safe);
      return ` [CUSTOM_PAUSE_${pauses.length - 1}] `;
    }
  );

  return { cleaned, pauses };
}

function splitSentences(text) {
  const clean = String(text || "").replace(/\r\n/g, "\n");
  const matches = clean.match(/[^.!?।！？\n]+[.!?।！？]+|[^.!?।！？\n]+$/g);
  if (!matches) return [clean.trim()].filter(Boolean);
  return matches.map((item) => item.trim()).filter(Boolean);
}

function getSentenceProfile(sentence, settings, dialogue = false) {
  let emotion = settings.emotion;
  if (emotion === "auto") emotion = detectEmotion(sentence);

  const rawEmotion = getEmotionSettings(emotion, settings);
  const intensity = clamp(settings.emotionIntensity, 0, 100);
  const modeAdjusted = applyStoryMode(settings, rawEmotion);

  let speed = blendNumber(
    Number(settings.speed),
    modeAdjusted.speed,
    intensity
  );
  let pitch = blendNumber(
    Number(settings.pitch),
    modeAdjusted.pitch,
    intensity
  );
  let volume = blendNumber(
    Number(settings.volume),
    modeAdjusted.volume,
    intensity
  );

  // Dialogue gets a small prosody lift so quoted speech sounds distinct.
  if (settings.dialogueDetection && dialogue) {
    speed *= 1.01;
    pitch += 1;
  }

  let pauseAfter = 80 * modeAdjusted.pauseMultiplier;

  if (/[!?！？]$/.test(sentence)) pauseAfter = 120 * modeAdjusted.pauseMultiplier;
  else if (/[।.]$/.test(sentence)) pauseAfter = 120 * modeAdjusted.pauseMultiplier;
  else if (/[,，]$/.test(sentence)) pauseAfter = 60 * modeAdjusted.pauseMultiplier;
  if (/\.{3,}|…/.test(sentence)) pauseAfter = 300 * modeAdjusted.pauseMultiplier;

  const dramatic = clamp(settings.dramaticPause, 0, 100) / 100;
  if (
    dramatic > 0 &&
    /(अचानक|लेकिन|मगर|तभी|फिर|अंत में|सच यह था|suddenly|but|then|finally|however|sudden)/i.test(sentence)
  ) {
    pauseAfter += Math.round(220 * dramatic * modeAdjusted.pauseMultiplier);
  }

  if (settings.customPause > 0) {
    pauseAfter += Number(settings.customPause);
  }

  if (settings.voiceType === "robot") {
    speed *= 0.92;
    pitch -= 6;
  }

  return {
    emotion,
    speed: clamp(speed, 0.5, 2),
    pitch: clamp(pitch, -50, 50),
    volume: clamp(volume, 0, 100),
    pauseAfter: clamp(pauseAfter, 50, 5000),
  };
}

function speedToRate(speed) {
  const value = clamp(Number(speed), 0.5, 2);
  const percent = Math.round((value - 1) * 100);
  return `${percent >= 0 ? "+" : ""}${percent}%`;
}

function pitchToSsml(pitch) {
  const value = clamp(Number(pitch), -50, 50);
  return `${value >= 0 ? "+" : ""}${Math.round(value)}Hz`;
}

function volumeToSsml(volume) {
  const value = clamp(Number(volume), 0, 100);
  if (value <= 0) return "silent";
  if (value >= 100) return "default";
  return `${Math.round(value)}%`;
}

function buildSsmlSegment(sentence, settings, dialogue = false, customPauses = []) {
  let safeSentence = String(sentence || "").trim();

  const customTokenRegex = /_CUSTOM_PAUSE_(\d+)_/g;
  const pieces = [];
  let lastIndex = 0;
  let match;

  while ((match = customTokenRegex.exec(safeSentence)) !== null) {
    const before = safeSentence.slice(lastIndex, match.index);
    if (before.trim()) pieces.push({ text: before, pause: null });

    const index = Number(match[1]);
    pieces.push({
      text: "",
      pause: customPauses[index] || 0,
    });

    lastIndex = match.index + match[0].length;
  }

  const after = safeSentence.slice(lastIndex);
  if (after.trim()) pieces.push({ text: after, pause: null });

  if (pieces.length === 0) {
    pieces.push({ text: safeSentence, pause: null });
  }

  const profile = getSentenceProfile(safeSentence, settings, dialogue);
  const rate = speedToRate(profile.speed);
  const pitch = pitchToSsml(profile.pitch);
  const volume = volumeToSsml(profile.volume);

  return pieces
    .map((piece) => {
      if (piece.pause !== null) {
        return `<break time="${clamp(piece.pause, 0, 5000)}ms"/>`;
      }

      return `<prosody rate="${rate}" pitch="${pitch}" volume="${volume}">${escapeXml(piece.text)}</prosody>`;
    })
    .join("\n") + `\n<break time="${Math.round(profile.pauseAfter)}ms"/>`;
}

function buildSsml(text, settings) {
  const pauseData = extractCustomPauses(text);
  const cleaned = pauseData.cleaned;
  const language = escapeXml(settings.language || "hi-IN");

  let sections;

  if (settings.dialogueDetection) {
    sections = splitDialogueAndText(cleaned);
  } else {
    sections = [{ text: cleaned, dialogue: false }];
  }

  const body = sections
    .flatMap((section) => splitSentences(section.text).map((sentence) => ({
      sentence,
      dialogue: section.dialogue,
    })))
    .map((item) =>
      buildSsmlSegment(
        item.sentence,
        settings,
        item.dialogue,
        pauseData.pauses
      )
    )
    .join("\n");

  return `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">
${body}
</speak>
`.trim();
}

function getVoiceSelectionRules(settings) {
  const language = String(settings.language || "hi-IN").toLowerCase();
  const voiceType = String(settings.voiceType || "male").toLowerCase();

  let gender = "male";
  if (voiceType === "female") gender = "female";
  if (voiceType === "neutral") gender = "neutral";

  return { language, voiceType, gender };
}

// -----------------------------------------------------
// POWERSHELL SCRIPT
// -----------------------------------------------------

function buildPowerShellScript() {
  return String.raw`
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Runtime.WindowsRuntime

$SpeechSynthesizerType = [Windows.Media.SpeechSynthesis.SpeechSynthesizer,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime]
$DataReaderType = [Windows.Storage.Streams.DataReader,Windows.Storage.Streams,ContentType=WindowsRuntime]
$SpeechSynthesisStreamType = [Windows.Media.SpeechSynthesis.SpeechSynthesisStream,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime]

$asTaskMethods = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
        $_.Name -eq "AsTask" -and
        $_.IsGenericMethodDefinition -and
        $_.GetParameters().Count -eq 1
    }

$asTaskGeneric = $asTaskMethods |
    Where-Object {
        $_.GetParameters()[0].ParameterType.Name -eq ("IAsyncOperation" + [char]96 + "1")
    } |
    Select-Object -First 1

if ($null -eq $asTaskGeneric) {
    throw "Could not find Windows Runtime AsTask(IAsyncOperation<T>) method."
}

function Await-WinRtOperation($WinRtOperation, $ResultType) {
    if ($null -eq $WinRtOperation) {
        throw "Windows Runtime async operation is null."
    }

    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtOperation))

    if ($null -eq $netTask) {
        throw "Windows Runtime AsTask returned null."
    }

    $netTask.Wait(-1) | Out-Null
    return $netTask.Result
}

$ssmlBytes = [System.Convert]::FromBase64String($env:TTS_SSML_B64)
$ssml = [System.Text.Encoding]::UTF8.GetString($ssmlBytes)

$outputBytes = [System.Convert]::FromBase64String($env:TTS_OUTPUT_B64)
$outputPath = [System.Text.Encoding]::UTF8.GetString($outputBytes)

$language = [string]$env:TTS_LANGUAGE
$voiceType = [string]$env:TTS_VOICE_TYPE

$synth = $null
$stream = $null
$reader = $null

try {
    $synth = [Activator]::CreateInstance($SpeechSynthesizerType)

    if ($null -eq $synth) {
        throw "Could not create Windows SpeechSynthesizer."
    }

    $voices = $SpeechSynthesizerType::AllVoices

    if ($null -eq $voices -or $voices.Count -eq 0) {
        throw "No Windows speech voices are installed."
    }

    $requestedLanguage = $language.Trim().ToLower()
    $selectedVoice = $null

    foreach ($voice in $voices) {
        $voiceLanguage = [string]$voice.Language
        $voiceGender = [string]$voice.Gender
        $voiceName = [string]$voice.DisplayName

        if ([string]::IsNullOrWhiteSpace($voiceLanguage)) {
            continue
        }

        if ([string]::IsNullOrWhiteSpace($voiceName)) {
            continue
        }

        if ($voiceLanguage.Trim().ToLower() -ne $requestedLanguage) {
            continue
        }

        if ($voiceType -eq "female") {
            if ($voiceGender -eq "Female") {
                $selectedVoice = $voice
                break
            }
        }
        elseif ($voiceType -eq "male") {
            if ($voiceGender -eq "Male") {
                $selectedVoice = $voice
                break
            }
        }
        else {
            $selectedVoice = $voice
            break
        }
    }

    if ($null -eq $selectedVoice) {
        foreach ($voice in $voices) {
            $voiceLanguage = [string]$voice.Language

            if ([string]::IsNullOrWhiteSpace($voiceLanguage)) {
                continue
            }

            if ($voiceLanguage.Trim().ToLower() -eq $requestedLanguage) {
                $selectedVoice = $voice
                break
            }
        }
    }

    if ($null -eq $selectedVoice) {
        $available = @()

        foreach ($voice in $voices) {
            $available += (
                [string]$voice.DisplayName +
                " | " +
                [string]$voice.Language +
                " | " +
                [string]$voice.Gender
            )
        }

        throw (
            "No installed Windows voice supports language: " +
            $language +
            ". Available voices: " +
            ($available -join "; ")
        )
    }

    $synth.Voice = $selectedVoice

    $operation = $synth.SynthesizeSsmlToStreamAsync($ssml)

    if ($null -eq $operation) {
        throw "Windows speech synthesis returned no operation."
    }

    $stream = Await-WinRtOperation $operation $SpeechSynthesisStreamType

    if ($null -eq $stream) {
        throw "Windows speech engine returned an empty audio stream."
    }

    $inputStream = $stream.GetInputStreamAt(0)

    if ($null -eq $inputStream) {
        throw "Could not open Windows speech input stream."
    }

    $reader = [Activator]::CreateInstance($DataReaderType, $inputStream)

    if ($null -eq $reader) {
        throw "Could not create Windows DataReader."
    }

    $streamSize = [uint32]$stream.Size

    if ($streamSize -le 0) {
        throw "Windows speech stream is empty."
    }

    $loadOperation = $reader.LoadAsync($streamSize)
    $null = Await-WinRtOperation $loadOperation ([uint32])

    $audioBytes = New-Object byte[] $streamSize
    $reader.ReadBytes($audioBytes)

    if ($null -eq $audioBytes -or $audioBytes.Length -lt 44) {
        throw "Generated audio data is empty or invalid."
    }

    $outputDirectory = Split-Path $outputPath -Parent

    if (-not [string]::IsNullOrWhiteSpace($outputDirectory)) {
        if (-not (Test-Path $outputDirectory)) {
            New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
        }
    }

    [System.IO.File]::WriteAllBytes($outputPath, $audioBytes)

    if (-not (Test-Path $outputPath)) {
        throw "Windows speech engine did not create the output file."
    }

    $fileInfo = Get-Item $outputPath

    if ($fileInfo.Length -lt 44) {
        throw "Generated WAV file is invalid or empty."
    }

    Write-Output "TTS_SUCCESS"
    Write-Output ("VOICE=" + $selectedVoice.DisplayName)
    Write-Output ("LANGUAGE=" + $selectedVoice.Language)
    Write-Output ("GENDER=" + $selectedVoice.Gender)
    Write-Output ("SIZE=" + $fileInfo.Length)
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}
finally {
    try {
        if ($null -ne $reader) { $reader.Dispose() }
    } catch {}

    try {
        if ($null -ne $stream) { $stream.Dispose() }
    } catch {}

    try {
        if ($null -ne $synth) { $synth.Dispose() }
    } catch {}
}
`;
}

function runWindowsSpeech({ ssml, outputPath, settings }) {
  return new Promise((resolve, reject) => {
    const script = buildPowerShellScript();

    const encodedSsml = Buffer.from(ssml, "utf8").toString("base64");
    const encodedOutput = Buffer.from(outputPath, "utf8").toString("base64");

    const ps = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
      ],
      {
        windowsHide: true,
        env: {
          ...process.env,
          TTS_SSML_B64: encodedSsml,
          TTS_OUTPUT_B64: encodedOutput,
          TTS_LANGUAGE: settings.language,
          TTS_VOICE_TYPE: settings.voiceType,
        },
      }
    );

    let stdout = "";
    let stderr = "";

    ps.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    ps.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ps.on("error", (error) => {
      reject(
        new Error(`Could not start Windows TTS: ${error.message}`)
      );
    });

    ps.on("close", (code) => {
      if (code !== 0) {
        const message =
          stderr.trim() ||
          stdout.trim() ||
          "Windows TTS failed.";

        reject(
          new Error(`WINDOWS TTS ERROR: ${message}`)
        );
        return;
      }

      if (!fs.existsSync(outputPath)) {
        reject(
          new Error(
            "Windows TTS completed but no WAV file was created."
          )
        );
        return;
      }

      const stats = fs.statSync(outputPath);

      if (stats.size < 44) {
        reject(
          new Error("Windows TTS created an invalid WAV file.")
        );
        return;
      }

      resolve({
        outputPath,
        stdout: stdout.trim(),
      });
    });
  });
}

function getWavDuration(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);

    if (buffer.length < 44) return 0;

    let offset = 12;
    let byteRate = 0;
    let dataSize = 0;

    while (offset + 8 <= buffer.length) {
      const chunkId = buffer.toString(
        "ascii",
        offset,
        offset + 4
      );

      const chunkSize = buffer.readUInt32LE(offset + 4);
      const dataStart = offset + 8;

      if (
        chunkId === "fmt " &&
        chunkSize >= 16 &&
        dataStart + 16 <= buffer.length
      ) {
        byteRate = buffer.readUInt32LE(dataStart + 8);
      }

      if (chunkId === "data") {
        dataSize = Math.min(
          chunkSize,
          buffer.length - dataStart
        );
        break;
      }

      offset = dataStart + chunkSize;
      if (offset % 2 !== 0) offset++;
    }

    if (byteRate <= 0 || dataSize <= 0) return 0;
    return dataSize / byteRate;
  } catch {
    return 0;
  }
}






















async function generateSpeech({
  text,
  settings = {},
  format = "wav",
}) {
  const request = prepareSpeechRequest({
    
    text,
    settings,
    format,
  });
  // console.log("TTS TEXT FROM WEBSITE:", JSON.stringify(request.text));

  const jobId =
    `${Date.now()}-${crypto.randomUUID()}`;

  const fileName =
    `tts-${jobId}.wav`;

  const outputPath =
    path.join(
      AUDIO_DIR,
      fileName
    );

  const projectRoot =
    path.join(
      __dirname,
      "..",
      ".."
    );

  const pythonExe =
    path.join(
      projectRoot,
      ".venv-tts",
      "Scripts",
      "python.exe"
    );

  const indicF5Engine =
    path.join(
      projectRoot,
      "indicf5_engine.py"
    );

  // ---------------------------------------------------
  // Check Python environment
  // ---------------------------------------------------

  if (!fs.existsSync(pythonExe)) {
    throw new Error(
      `IndicF5 Python environment not found: ${pythonExe}`
    );
  }

  // ---------------------------------------------------
  // Check IndicF5 engine
  // ---------------------------------------------------

  if (!fs.existsSync(indicF5Engine)) {
    throw new Error(
      `IndicF5 engine not found: ${indicF5Engine}`
    );
  }

  // ---------------------------------------------------
  // Create temporary UTF-8 text file
  // ---------------------------------------------------

  const textFile =
    path.join(
      AUDIO_DIR,
      `tts-input-${jobId}.txt`
    );

  try {

    // -------------------------------------------------
    // Write EXACT website text as UTF-8
    // -------------------------------------------------

    fs.writeFileSync(
      textFile,
      request.text,
      {
        encoding: "utf8"
      }
    );


    // -------------------------------------------------
    // Run IndicF5
    // -------------------------------------------------

    await new Promise(
      (resolve, reject) => {

        const python =
          spawn(
            pythonExe,
            [
              indicF5Engine,
              textFile,
              outputPath,
            ],
            {
              windowsHide: true,
              cwd: projectRoot,
              env: {
                ...process.env,
                PYTHONIOENCODING: "utf-8",
              },
            }
          );


        let stdout = "";

        let stderr = "";


        // ---------------------------------------------
        // Python stdout
        // ---------------------------------------------

        python.stdout.on(
          "data",
          (data) => {

            stdout +=
              data.toString("utf8");

          }
        );


        // ---------------------------------------------
        // Python stderr
        // ---------------------------------------------

        python.stderr.on(
          "data",
          (data) => {

            stderr +=
              data.toString("utf8");

          }
        );


        // ---------------------------------------------
        // Process error
        // ---------------------------------------------

        python.on(
          "error",
          (error) => {

            reject(
              new Error(
                `Could not start IndicF5: ${error.message}`
              )
            );

          }
        );


        // ---------------------------------------------
        // Process finished
        // ---------------------------------------------

        python.on(
          "close",
          (code) => {

            if (code !== 0) {

              reject(
                new Error(
                  `IndicF5 failed:\n${
                    stderr.trim() ||
                    stdout.trim() ||
                    `Process exited with code ${code}`
                  }`
                )
              );

              return;
            }


            // -----------------------------------------
            // Check output
            // -----------------------------------------

            if (
              !fs.existsSync(
                outputPath
              )
            ) {

              reject(
                new Error(
                  "IndicF5 completed but no WAV file was created."
                )
              );

              return;
            }


            const stats =
              fs.statSync(
                outputPath
              );


            if (
              stats.size < 44
            ) {

              reject(
                new Error(
                  "IndicF5 created an invalid WAV file."
                )
              );

              return;
            }


            console.log(
              "========================================"
            );

            console.log(
              "IndicF5 TTS SUCCESS"
            );

            console.log(
              stdout.trim()
            );

            console.log(
              "========================================"
            );


            resolve();

          }
        );

      }
    );

  } finally {

    // -------------------------------------------------
    // Delete temporary text file
    // -------------------------------------------------

    try {

      if (
        fs.existsSync(
          textFile
        )
      ) {

        fs.unlinkSync(
          textFile
        );

      }

    } catch {
      // Ignore temporary-file cleanup errors
    }

  }


  // ---------------------------------------------------
  // Get WAV duration
  // ---------------------------------------------------

  const duration =
    getWavDuration(
      outputPath
    );


  // ---------------------------------------------------
  // Return result
  // ---------------------------------------------------

  return {

    audioPath:
      outputPath,

    duration,

    format:
      "wav",

    voice:
      request.settings.voiceType,

    language:
      request.settings.language,

  };
}

















function getEngineStatus() {
  return {
    engine: "Windows.Media.SpeechSynthesis",
    platform: process.platform,
    available: process.platform === "win32",
    audioFormat: "wav",
    local: true,
    thirdPartyApi: false,
  };
}

module.exports = {
  DEFAULT_VOICE_SETTINGS,
  ALLOWED_VOICE_TYPES,
  ALLOWED_EMOTIONS,
  ALLOWED_STORY_MODES,
  ALLOWED_AUDIO_FORMATS,
  normalizeVoiceSettings,
  prepareSpeechRequest,
  generateSpeech,
  getEngineStatus,
  buildSsml,
};
