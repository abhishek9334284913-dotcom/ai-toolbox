// =====================================================
// TEXT TO AUDIO - LONG SCRIPT CHUNKER
// =====================================================

const DEFAULT_CHUNK_SIZE = 3000;
const MIN_CHUNK_SIZE = 500;
const MAX_CHUNK_SIZE = 8000;

/**
 * Clean incoming script text
 */
function cleanText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Split long text into manageable chunks.
 *
 * Priority:
 * 1. Paragraph
 * 2. Sentence
 * 3. Word
 *
 * This prevents long scripts from being sent
 * as one huge request.
 */
function splitText(
  text,
  chunkSize = DEFAULT_CHUNK_SIZE
) {
  const cleaned = cleanText(text);

  if (!cleaned) {
    return [];
  }

  let size = Number(chunkSize);

  if (!Number.isFinite(size)) {
    size = DEFAULT_CHUNK_SIZE;
  }

  size = Math.min(
    Math.max(size, MIN_CHUNK_SIZE),
    MAX_CHUNK_SIZE
  );

  if (cleaned.length <= size) {
    return [cleaned];
  }

  const paragraphs = cleaned.split(/\n\s*\n/);

  const chunks = [];
  let current = "";

  function pushCurrent() {
    const value = current.trim();

    if (value) {
      chunks.push(value);
    }

    current = "";
  }

  function addTextPart(part) {
    const value = part.trim();

    if (!value) {
      return;
    }

    if (!current) {
      current = value;
      return;
    }

    const combined =
      `${current}\n\n${value}`;

    if (combined.length <= size) {
      current = combined;
      return;
    }

    pushCurrent();

    if (value.length <= size) {
      current = value;
      return;
    }

    // Paragraph itself is too large.
    const sentences = value.match(
      /[^.!?।]+[.!?।]+|[^.!?।]+$/g
    ) || [value];

    for (const sentence of sentences) {
      const sentenceText =
        sentence.trim();

      if (!sentenceText) {
        continue;
      }

      if (!current) {
        current = sentenceText;
        continue;
      }

      const combinedSentence =
        `${current} ${sentenceText}`;

      if (
        combinedSentence.length <= size
      ) {
        current = combinedSentence;
      } else {
        pushCurrent();

        if (
          sentenceText.length <= size
        ) {
          current = sentenceText;
        } else {
          // Single sentence is still too long.
          // Split safely by words.
          const words =
            sentenceText.split(/\s+/);

          for (const word of words) {
            if (!current) {
              current = word;
              continue;
            }

            const combinedWord =
              `${current} ${word}`;

            if (
              combinedWord.length <= size
            ) {
              current = combinedWord;
            } else {
              pushCurrent();
              current = word;
            }
          }
        }
      }
    }
  }

  for (const paragraph of paragraphs) {
    addTextPart(paragraph);
  }

  pushCurrent();

  return chunks;
}

/**
 * Create detailed chunk information
 */
function createChunks(
  text,
  chunkSize = DEFAULT_CHUNK_SIZE
) {
  const chunks = splitText(
    text,
    chunkSize
  );

  return chunks.map(
    (chunk, index) => ({
      index,
      number: index + 1,
      text: chunk,
      characters: chunk.length,
      words: chunk
        .split(/\s+/)
        .filter(Boolean)
        .length,
    })
  );
}

module.exports = {
  cleanText,
  splitText,
  createChunks,
  DEFAULT_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
};