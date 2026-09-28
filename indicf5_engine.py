import sys
import os
import re

import numpy as np
import soundfile as sf
import torch

from huggingface_hub import hf_hub_download
from safetensors.torch import load_file

from f5_tts.model import DiT
from f5_tts.infer.utils_infer import (
    load_model,
    load_vocoder,
    infer_process,
    preprocess_ref_audio_text,
)


# ============================================================
# CONFIG
# ============================================================

REPO = "ai4bharat/IndicF5"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

REF_AUDIO = os.path.join(
    BASE_DIR,
    "indicf5_reference.wav"
)

# IMPORTANT:
# This must remain the exact transcript of the
# official reference audio.
REF_TEXT = (
    "ਹੰਪੀ ਵਿੱਚ ਸਮਾਰਕਾਂ ਦੇ ਭਵਨ ਨਿਰਮਾਣ ਕਲਾ ਦੇ ਵੇਰਵੇ "
    "ਗੁੰਝਲਦਾਰ ਅਤੇ ਹੈਰਾਨ ਕਰਨ ਵਾਲੇ ਹਨ, ਜੋ ਮੈਨੂੰ ਖੁਸ਼ ਕਰਦੇ ਹਨ।"
)


# ============================================================
# COMMON ENGLISH WORDS -> HINDI PHONETIC
# ============================================================

ENGLISH_WORDS = {

    # Story / general
    "ship": "शिप",
    "ships": "शिप्स",
    "crew": "क्रू",
    "crews": "क्रूज़",
    "lighthouse": "लाइटहाउस",
    "light": "लाइट",
    "lights": "लाइट्स",
    "rocky": "रॉकी",
    "coastline": "कोस्टलाइन",
    "coast": "कोस्ट",
    "sea": "सी",
    "ocean": "ओशन",
    "water": "वॉटर",
    "fog": "फॉग",
    "dark": "डार्क",
    "darkness": "डार्कनेस",
    "night": "नाइट",
    "captain": "कैप्टन",
    "direction": "डायरेक्शन",
    "navigation": "नेविगेशन",
    "system": "सिस्टम",
    "signal": "सिग्नल",
    "pattern": "पैटर्न",
    "flashing": "फ्लैशिंग",
    "rock": "रॉक",
    "rocks": "रॉक्स",
    "coast": "कोस्ट",
    "minutes": "मिनट्स",
    "minute": "मिनट",
    "seconds": "सेकंड्स",
    "second": "सेकंड",
    "dangerous": "डेंजरस",
    "danger": "डेंजर",
    "mysterious": "मिस्टिरियस",
    "mystery": "मिस्ट्री",
    "story": "स्टोरी",
    "voice": "वॉइस",
    "audio": "ऑडियो",
    "video": "वीडियो",

    # Common narration words
    "suddenly": "सडनली",
    "again": "अगेन",
    "already": "ऑलरेडी",
    "really": "रियली",
    "clearly": "क्लियरली",
    "quickly": "क्विकली",
    "slowly": "स्लोली",
    "finally": "फाइनली",
    "actually": "एक्चुअली",
    "exactly": "एक्ज़ैक्टली",
    "completely": "कम्प्लीटली",
    "different": "डिफरेंट",
    "direction": "डायरेक्शन",
    "place": "प्लेस",
    "face": "फेस",

    # Technology
    "phone": "फोन",
    "computer": "कंप्यूटर",
    "website": "वेबसाइट",
    "server": "सर्वर",
    "software": "सॉफ्टवेयर",
    "hardware": "हार्डवेयर",
    "internet": "इंटरनेट",
    "online": "ऑनलाइन",
    "offline": "ऑफलाइन",
    "download": "डाउनलोड",
    "upload": "अपलोड",
    "file": "फाइल",
    "files": "फाइल्स",

    # Common words
    "hello": "हेलो",
    "thank": "थैंक",
    "thanks": "थैंक्स",
    "please": "प्लीज़",
    "okay": "ओके",
    "yes": "येस",
    "no": "नो",
    "good": "गुड",
    "bad": "बैड",
    "best": "बेस्ट",
    "new": "न्यू",
    "old": "ओल्ड",
    "first": "फर्स्ट",
    "last": "लास्ट",
    "next": "नेक्स्ट",
    "one": "वन",
    "two": "टू",
    "three": "थ्री",
    "four": "फोर",
    "five": "फाइव",

    # People / action
    "man": "मैन",
    "woman": "वुमन",
    "person": "पर्सन",
    "people": "पीपल",
    "team": "टीम",
    "leader": "लीडर",
    "check": "चेक",
    "checked": "चेक्ड",
    "move": "मूव",
    "moved": "मूव्ड",
    "stop": "स्टॉप",
    "start": "स्टार्ट",
    "started": "स्टार्टेड",
    "see": "सी",
    "seen": "सीन",
    "look": "लुक",
    "looked": "लुक्ड",
}


def normalize_english_words(text):
    """
    Replace common English words with Hindi phonetic forms.

    Unknown English words are left untouched instead of
    making an unsafe guess.
    """

    def replace_word(match):
        word = match.group(0)

        key = word.lower()

        if key in ENGLISH_WORDS:
            replacement = ENGLISH_WORDS[key]

            # Preserve basic capitalization is unnecessary
            # because replacement is Hindi phonetic text.

            return replacement

        return word

    return re.sub(
        r"[A-Za-z]+",
        replace_word,
        text
    )


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_text(text):

    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    # Remove repeated spaces
    text = re.sub(
        r"[ \t]+",
        " ",
        text
    )

    # Remove excessive blank lines
    text = re.sub(
        r"\n{3,}",
        "\n\n",
        text
    )

    text = text.strip()

    return text


# ============================================================
# SENTENCE SPLITTING
# ============================================================

def split_sentences(text):

    # Hindi + English sentence endings
    parts = re.split(
        r"(?<=[.!?।॥])\s+",
        text
    )

    result = []

    for part in parts:

        part = part.strip()

        if part:
            result.append(part)

    return result


# ============================================================
# LONG SENTENCE SPLITTING
# ============================================================

def split_long_sentence(sentence, max_chars=150):

    sentence = sentence.strip()

    if len(sentence) <= max_chars:
        return [sentence]

    # First try commas / pauses
    parts = re.split(
        r"(?<=[,;:،])\s+",
        sentence
    )

    chunks = []
    current = ""

    for part in parts:

        part = part.strip()

        if not part:
            continue

        if not current:

            current = part

        elif len(current) + 1 + len(part) <= max_chars:

            current += " " + part

        else:

            chunks.append(current.strip())
            current = part

    if current:
        chunks.append(current.strip())

    # If still too long, split by words
    final_chunks = []

    for chunk in chunks:

        if len(chunk) <= max_chars:

            final_chunks.append(chunk)
            continue

        words = chunk.split()

        current = ""

        for word in words:

            if not current:

                current = word

            elif len(current) + 1 + len(word) <= max_chars:

                current += " " + word

            else:

                final_chunks.append(
                    current.strip()
                )

                current = word

        if current:
            final_chunks.append(
                current.strip()
            )

    return final_chunks


# ============================================================
# CREATE SAFE AUDIO CHUNKS
# ============================================================

def make_chunks(text):

    sentences = split_sentences(text)

    chunks = []

    for sentence in sentences:

        pieces = split_long_sentence(
            sentence,
            max_chars=150
        )

        for piece in pieces:

            piece = piece.strip()

            if piece:
                chunks.append(piece)

    return chunks


# ============================================================
# AUDIO NORMALIZATION
# ============================================================

def normalize_audio(audio):

    audio = np.asarray(
        audio,
        dtype=np.float32
    )

    if audio.size == 0:
        return audio

    # Remove NaN / infinity
    audio = np.nan_to_num(
        audio,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    peak = np.max(
        np.abs(audio)
    )

    if peak > 0:

        audio = (
            audio / peak
        ) * 0.90

    return audio


# ============================================================
# SMALL CROSSFADE
# ============================================================

def crossfade_join(
    first,
    second,
    sample_rate,
    fade_ms=35
):

    if first.size == 0:
        return second

    if second.size == 0:
        return first

    fade_samples = int(
        sample_rate *
        fade_ms /
        1000
    )

    fade_samples = min(
        fade_samples,
        len(first),
        len(second)
    )

    if fade_samples <= 0:
        return np.concatenate(
            [first, second]
        )

    fade_out = np.linspace(
        1.0,
        0.0,
        fade_samples,
        dtype=np.float32
    )

    fade_in = np.linspace(
        0.0,
        1.0,
        fade_samples,
        dtype=np.float32
    )

    middle = (
        first[-fade_samples:] *
        fade_out
        +
        second[:fade_samples] *
        fade_in
    )

    return np.concatenate(
        [
            first[:-fade_samples],
            middle,
            second[fade_samples:]
        ]
    )


# ============================================================
# MAIN
# ============================================================

def main():

    if len(sys.argv) < 3:

        print(
            "ERROR: Text file and output path required",
            flush=True
        )

        sys.exit(1)

    text_file = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.isfile(text_file):

        print(
            f"ERROR: Text file not found: {text_file}",
            flush=True
        )

        sys.exit(1)

    if not os.path.isfile(REF_AUDIO):

        print(
            f"ERROR: Reference audio not found: {REF_AUDIO}",
            flush=True
        )

        sys.exit(1)

    # --------------------------------------------------------
    # READ TEXT
    # --------------------------------------------------------

    try:

        with open(
            text_file,
            "r",
            encoding="utf-8"
        ) as file:

            text = file.read()

    except Exception as error:

        print(
            f"ERROR: Could not read text: {error}",
            flush=True
        )

        sys.exit(1)

    text = clean_text(text)

    if not text:

        print(
            "ERROR: Text is empty",
            flush=True
        )

        sys.exit(1)

    # --------------------------------------------------------
    # NORMALIZE ENGLISH
    # --------------------------------------------------------

    original_text = text

    text = normalize_english_words(
        text
    )

    # --------------------------------------------------------
    # CREATE CHUNKS
    # --------------------------------------------------------

    chunks = make_chunks(
        text
    )

    if not chunks:

        print(
            "ERROR: No text chunks created",
            flush=True
        )

        sys.exit(1)

    print(
        "========================================",
        flush=True
    )

    print(
        "AI TOOLBOX - INDICF5 LONG TEXT ENGINE",
        flush=True
    )

    print(
        "========================================",
        flush=True
    )

    print(
        f"Device: {DEVICE}",
        flush=True
    )

    print(
        f"Original characters: {len(original_text)}",
        flush=True
    )

    print(
        f"Processed characters: {len(text)}",
        flush=True
    )

    print(
        f"Total chunks: {len(chunks)}",
        flush=True
    )

    print(
        "----------------------------------------",
        flush=True
    )

    for index, chunk in enumerate(
        chunks,
        start=1
    ):

        print(
            f"Chunk {index}: {chunk}",
            flush=True
        )

    print(
        "========================================",
        flush=True
    )

    # --------------------------------------------------------
    # DOWNLOAD / CACHE MODEL FILES
    # --------------------------------------------------------

    print(
        "Loading model files...",
        flush=True
    )

    vocab_path = hf_hub_download(
        repo_id=REPO,
        filename="checkpoints/vocab.txt"
    )

    checkpoint_path = hf_hub_download(
        repo_id=REPO,
        filename="model.safetensors"
    )

    # --------------------------------------------------------
    # LOAD VOCODER
    # --------------------------------------------------------

    print(
        "Loading Vocos...",
        flush=True
    )

    vocoder = load_vocoder(
        vocoder_name="vocos",
        device=DEVICE
    )

    # --------------------------------------------------------
    # LOAD MODEL
    # --------------------------------------------------------

    print(
        "Loading IndicF5 model...",
        flush=True
    )

    model = load_model(
        DiT,
        dict(
            dim=1024,
            depth=22,
            heads=16,
            ff_mult=2,
            text_dim=512,
            conv_layers=4,
        ),
        mel_spec_type="vocos",
        vocab_file=vocab_path,
        device=DEVICE,
    )

    print(
        "Loading checkpoint...",
        flush=True
    )

    state_dict = load_file(
        checkpoint_path,
        device=DEVICE
    )

    state_dict = {
        key.replace(
            "ema_model._orig_mod.",
            ""
        ): value
        for key, value in state_dict.items()
        if key.startswith("ema_model.")
    }

    model.load_state_dict(
        state_dict
    )

    model.eval()

    # --------------------------------------------------------
    # REFERENCE AUDIO
    # --------------------------------------------------------

    print(
        "Preparing reference voice...",
        flush=True
    )

    ref_audio, ref_text = (
        preprocess_ref_audio_text(
            REF_AUDIO,
            REF_TEXT,
            device=DEVICE
        )
    )

    # --------------------------------------------------------
    # GENERATE EACH CHUNK
    # --------------------------------------------------------

    generated_chunks = []

    sample_rate = 24000

    for index, chunk in enumerate(
        chunks,
        start=1
    ):

        print(
            "",
            flush=True
        )

        print(
            f"[{index}/{len(chunks)}] Generating...",
            flush=True
        )

        try:

            audio, sr, _ = infer_process(

                ref_audio,
                ref_text,
                chunk,

                model,
                vocoder,

                mel_spec_type="vocos",

                device=DEVICE,

                # Official-style inference controls
                target_rms=0.1,
                cfg_strength=2.0,
                nfe_step=32,

                # Slightly slower for clarity
                speed=0.95,

                # Keep silence / pauses natural
                # remove_silence=False,

                cross_fade_duration=0.15,
            )

        except Exception as error:

            print(
                f"ERROR in chunk {index}: {error}",
                flush=True
            )

            sys.exit(1)

        audio = normalize_audio(
            audio
        )

        if audio.size == 0:

            print(
                f"ERROR: Empty audio in chunk {index}",
                flush=True
            )

            sys.exit(1)

        sample_rate = sr

        generated_chunks.append(
            audio
        )

        duration = (
            len(audio) /
            float(sr)
        )

        print(
            f"Chunk {index} duration: "
            f"{duration:.2f}s",
            flush=True
        )

    # --------------------------------------------------------
    # JOIN CHUNKS
    # --------------------------------------------------------

    print(
        "",
        flush=True
    )

    print(
        "Joining audio chunks...",
        flush=True
    )

    final_audio = np.array(
        [],
        dtype=np.float32
    )

    for audio in generated_chunks:

        if final_audio.size == 0:

            final_audio = audio

        else:

            final_audio = crossfade_join(
                final_audio,
                audio,
                sample_rate,
                fade_ms=35
            )

    final_audio = normalize_audio(
        final_audio
    )

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    output_directory = os.path.dirname(
        os.path.abspath(output_path)
    )

    os.makedirs(
        output_directory,
        exist_ok=True
    )

    sf.write(
        output_path,
        final_audio,
        samplerate=sample_rate
    )

    # --------------------------------------------------------
    # VERIFY
    # --------------------------------------------------------

    if not os.path.isfile(
        output_path
    ):

        print(
            "ERROR: Output WAV was not created.",
            flush=True
        )

        sys.exit(1)

    file_size = os.path.getsize(
        output_path
    )

    if file_size < 44:

        print(
            "ERROR: Invalid WAV file.",
            flush=True
        )

        sys.exit(1)

    final_duration = (
        len(final_audio) /
        float(sample_rate)
    )

    print(
        "",
        flush=True
    )

    print(
        "========================================",
        flush=True
    )

    print(
        "VOICE_GENERATION_OK",
        flush=True
    )

    print(
        f"Output: {output_path}",
        flush=True
    )

    print(
        f"Sample rate: {sample_rate} Hz",
        flush=True
    )

    print(
        f"Final duration: {final_duration:.2f}s",
        flush=True
    )

    print(
        f"File size: {file_size} bytes",
        flush=True
    )

    print(
        "========================================",
        flush=True
    )


if __name__ == "__main__":
    main()