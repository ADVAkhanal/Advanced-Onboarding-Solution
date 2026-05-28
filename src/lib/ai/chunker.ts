// SOP text chunker. Splits an approved SOP document into retrieval-sized
// chunks while keeping heading context attached to every chunk.
//
// Strategy:
//  1. Walk the raw text line by line.
//  2. Track the current heading path (markdown # / ## / ### style or
//     "Section N.N Title" style).
//  3. Accumulate paragraph blocks until the token budget is reached or a
//     heading change occurs.
//  4. Emit the chunk with its heading path so retrieval can show where the
//     chunk lives in the document.

export type ChunkInput = {
  rawText: string;
  // Approximate token budget per chunk. Default tuned for ~500 tokens.
  targetTokens?: number;
};

export type Chunk = {
  index: number;
  headingPath: string;
  content: string;
  tokenCount: number;
};

const DEFAULT_TARGET = 500;
// Rough words-to-tokens conversion. SOPs are mostly prose so this is close
// enough for chunk sizing; the exact token count is the model's job.
const WORDS_PER_TOKEN = 0.75;

function isHeading(line: string): { level: number; text: string } | null {
  const md = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
  if (md) {
    return { level: md[1].length, text: md[2].trim() };
  }
  const numbered = /^(\d+(?:\.\d+){0,4})\s+(.+?)\s*$/.exec(line);
  if (numbered) {
    return { level: numbered[1].split(".").length, text: `${numbered[1]} ${numbered[2]}`.trim() };
  }
  const allCaps = /^[A-Z0-9][A-Z0-9 \-_:/]{5,}$/.exec(line);
  if (allCaps && line === line.toUpperCase() && line.length <= 80) {
    return { level: 1, text: line.trim() };
  }
  return null;
}

function estimateTokens(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_TOKEN));
}

function joinPath(path: string[]): string {
  return path.filter(Boolean).join(" > ");
}

export function chunkSopText(input: ChunkInput): Chunk[] {
  const target = input.targetTokens ?? DEFAULT_TARGET;
  const lines = input.rawText.replace(/\r\n/g, "\n").split("\n");

  const chunks: Chunk[] = [];
  const headingStack: string[] = [];
  let buffer: string[] = [];
  let bufferTokens = 0;
  let chunkIndex = 0;

  const flush = () => {
    if (buffer.length === 0) {
      return;
    }
    const content = buffer.join("\n").trim();
    if (!content) {
      buffer = [];
      bufferTokens = 0;
      return;
    }
    chunks.push({
      index: chunkIndex,
      headingPath: joinPath(headingStack),
      content,
      tokenCount: estimateTokens(content)
    });
    chunkIndex += 1;
    buffer = [];
    bufferTokens = 0;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const heading = isHeading(line);

    if (heading) {
      flush();
      // Update heading stack: replace at level depth, drop deeper levels.
      headingStack.splice(heading.level - 1, headingStack.length - (heading.level - 1), heading.text);
      continue;
    }

    if (!line.trim()) {
      // Blank line is a soft boundary — keep accumulating but emit if we are
      // past the budget.
      if (bufferTokens >= target) {
        flush();
      } else if (buffer.length && buffer[buffer.length - 1] !== "") {
        buffer.push("");
      }
      continue;
    }

    const lineTokens = estimateTokens(line);
    if (bufferTokens + lineTokens > target * 1.4) {
      flush();
    }
    buffer.push(line);
    bufferTokens += lineTokens;
  }

  flush();
  return chunks;
}
