/**
 * Minimal, dependency-free QR Code generator (byte mode, error-correction
 * level M, versions 1–10) rendered to an inline SVG.
 *
 * Why hand-rolled: the platform deliberately avoids extra runtime dependencies
 * for rendering (see the print-CSS PDF approach) and must never send payloads to
 * an external QR/image service — that would breach the data-scope boundary. A
 * shipment confirm URL is short (well under the v10 capacity), so versions 1–10
 * cover every case. Implements ISO/IEC 18004 byte mode with Reed–Solomon ECC and
 * full mask selection.
 */

// ---- Galois field GF(256), primitive polynomial 0x11d ----
const GF_EXP = new Uint8Array(255);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[(GF_LOG[a] + GF_LOG[b]) % 255];
}

function polyMul(a: number[], b: number[]): number[] {
  const res = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      res[i + j] ^= gfMul(a[i], b[j]);
    }
  }
  return res;
}

function rsGenPoly(ec: number): number[] {
  let poly = [1];
  for (let i = 0; i < ec; i += 1) {
    poly = polyMul(poly, [1, GF_EXP[i % 255]]);
  }
  return poly;
}

function rsEncode(data: number[], ec: number): number[] {
  const gen = rsGenPoly(ec);
  const res = data.concat(new Array(ec).fill(0));
  for (let i = 0; i < data.length; i += 1) {
    const coef = res[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j += 1) {
        res[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return res.slice(data.length);
}

// ---- Version tables (ECC level M) ----
type ECBlocks = { ecPerBlock: number; groups: Array<[number, number]> };
const ECC_M: Record<number, ECBlocks> = {
  1: { ecPerBlock: 10, groups: [[1, 16]] },
  2: { ecPerBlock: 16, groups: [[1, 28]] },
  3: { ecPerBlock: 26, groups: [[1, 44]] },
  4: { ecPerBlock: 18, groups: [[2, 32]] },
  5: { ecPerBlock: 24, groups: [[2, 43]] },
  6: { ecPerBlock: 16, groups: [[4, 27]] },
  7: { ecPerBlock: 18, groups: [[4, 31]] },
  8: { ecPerBlock: 22, groups: [[2, 38], [2, 39]] },
  9: { ecPerBlock: 22, groups: [[3, 36], [2, 37]] },
  10: { ecPerBlock: 26, groups: [[4, 43], [1, 44]] }
};
const ALIGN_POS: Record<number, number[]> = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
};

function dataCapacityCw(v: number): number {
  return ECC_M[v].groups.reduce((s, [n, d]) => s + n * d, 0);
}

function chooseVersion(byteLen: number): number {
  for (let v = 1; v <= 10; v += 1) {
    const countBits = v <= 9 ? 8 : 16;
    const capacityBits = dataCapacityCw(v) * 8;
    const usedBits = 4 + countBits + byteLen * 8;
    if (usedBits <= capacityBits) return v;
  }
  throw new Error("QR payload too long (exceeds version 10 byte capacity).");
}

// ---- Data bit stream → final interleaved codewords ----
function encodeData(bytes: number[], v: number): number[] {
  const countBits = v <= 9 ? 8 : 16;
  const totalDataCw = dataCapacityCw(v);
  const capacityBits = totalDataCw * 8;
  const bits: number[] = [];
  const push = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i -= 1) bits.push((val >> i) & 1);
  };
  push(0b0100, 4); // byte mode
  push(bytes.length, countBits);
  for (const b of bytes) push(b, 8);
  push(0, Math.min(4, capacityBits - bits.length)); // terminator
  while (bits.length % 8 !== 0) bits.push(0);
  const pad = [0xec, 0x11];
  let pi = 0;
  while (bits.length < capacityBits) {
    push(pad[pi % 2], 8);
    pi += 1;
  }
  const cw: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j += 1) b = (b << 1) | bits[i + j];
    cw.push(b);
  }
  return cw;
}

function buildCodewords(dataCw: number[], v: number): number[] {
  const spec = ECC_M[v];
  const blocks: Array<{ data: number[]; ec: number[] }> = [];
  let pos = 0;
  for (const [numBlocks, dataPerBlock] of spec.groups) {
    for (let b = 0; b < numBlocks; b += 1) {
      const data = dataCw.slice(pos, pos + dataPerBlock);
      pos += dataPerBlock;
      blocks.push({ data, ec: rsEncode(data, spec.ecPerBlock) });
    }
  }
  const result: number[] = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i += 1) {
    for (const blk of blocks) if (i < blk.data.length) result.push(blk.data[i]);
  }
  const maxEc = Math.max(...blocks.map((b) => b.ec.length));
  for (let i = 0; i < maxEc; i += 1) {
    for (const blk of blocks) if (i < blk.ec.length) result.push(blk.ec[i]);
  }
  return result;
}

// ---- Module matrix ----
type Grid = { m: number[][]; res: boolean[][]; size: number };

function newGrid(size: number): Grid {
  return {
    m: Array.from({ length: size }, () => new Array(size).fill(0)),
    res: Array.from({ length: size }, () => new Array(size).fill(false)),
    size
  };
}

function placeFinder(g: Grid, r: number, c: number) {
  for (let dr = -1; dr <= 7; dr += 1) {
    for (let dc = -1; dc <= 7; dc += 1) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= g.size || cc >= g.size) continue;
      const inFinder = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
      let val = 0;
      if (inFinder) {
        const border = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const center = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        val = border || center ? 1 : 0;
      }
      g.m[rr][cc] = val;
      g.res[rr][cc] = true;
    }
  }
}

function placeAlignment(g: Grid, cr: number, cc: number) {
  for (let dr = -2; dr <= 2; dr += 1) {
    for (let dc = -2; dc <= 2; dc += 1) {
      const border = Math.max(Math.abs(dr), Math.abs(dc)) === 2;
      const center = dr === 0 && dc === 0;
      g.m[cr + dr][cc + dc] = border || center ? 1 : 0;
      g.res[cr + dr][cc + dc] = true;
    }
  }
}

function getBit(value: number, i: number): number {
  return (value >> i) & 1;
}

function drawFunctionPatterns(g: Grid, v: number) {
  const { size } = g;
  placeFinder(g, 0, 0);
  placeFinder(g, 0, size - 7);
  placeFinder(g, size - 7, 0);

  // Timing patterns.
  for (let i = 8; i < size - 8; i += 1) {
    if (!g.res[6][i]) {
      g.m[6][i] = i % 2 === 0 ? 1 : 0;
      g.res[6][i] = true;
    }
    if (!g.res[i][6]) {
      g.m[i][6] = i % 2 === 0 ? 1 : 0;
      g.res[i][6] = true;
    }
  }

  // Alignment patterns (skip ones overlapping finders).
  const pos = ALIGN_POS[v];
  for (const r of pos) {
    for (const c of pos) {
      if ((r <= 7 && c <= 7) || (r <= 7 && c >= size - 8) || (r >= size - 8 && c <= 7)) continue;
      placeAlignment(g, r, c);
    }
  }

  // Dark module + reserve format areas.
  g.m[size - 8][8] = 1;
  g.res[size - 8][8] = true;
  for (let i = 0; i <= 8; i += 1) {
    g.res[8][i] = true;
    g.res[i][8] = true;
  }
  for (let i = 0; i < 8; i += 1) {
    g.res[size - 1 - i][8] = true;
    g.res[8][size - 1 - i] = true;
  }

  // Reserve version info area (v >= 7).
  if (v >= 7) {
    for (let i = 0; i < 18; i += 1) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      g.res[a][b] = true;
      g.res[b][a] = true;
    }
  }
}

function placeData(g: Grid, codewords: number[]) {
  const { size } = g;
  const bits: number[] = [];
  for (const cw of codewords) for (let i = 7; i >= 0; i -= 1) bits.push((cw >> i) & 1);
  let idx = 0;
  let up = true;
  for (let col = size - 1; col > 0; col -= 2) {
    const c0 = col === 6 ? col - 1 : col; // skip timing column
    for (let i = 0; i < size; i += 1) {
      const row = up ? size - 1 - i : i;
      for (let c = 0; c < 2; c += 1) {
        const cc = c0 - c;
        if (!g.res[row][cc]) {
          g.m[row][cc] = idx < bits.length ? bits[idx] : 0;
          idx += 1;
        }
      }
    }
    up = !up;
  }
}

function maskCondition(mask: number, r: number, c: number): boolean {
  switch (mask) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
  }
}

function applyMask(g: Grid, mask: number): number[][] {
  const out = g.m.map((row) => row.slice());
  for (let r = 0; r < g.size; r += 1) {
    for (let c = 0; c < g.size; c += 1) {
      if (!g.res[r][c] && maskCondition(mask, r, c)) out[r][c] ^= 1;
    }
  }
  return out;
}

function penalty(m: number[][]): number {
  const size = m.length;
  let score = 0;
  // Rule 1: runs of 5+ in rows and columns.
  for (let r = 0; r < size; r += 1) {
    let runV = m[r][0];
    let runC = 1;
    let runVc = m[0][r];
    let runCc = 1;
    for (let c = 1; c < size; c += 1) {
      if (m[r][c] === runV) runC += 1;
      else { if (runC >= 5) score += runC - 2; runV = m[r][c]; runC = 1; }
      if (m[c][r] === runVc) runCc += 1;
      else { if (runCc >= 5) score += runCc - 2; runVc = m[c][r]; runCc = 1; }
    }
    if (runC >= 5) score += runC - 2;
    if (runCc >= 5) score += runCc - 2;
  }
  // Rule 2: 2x2 blocks.
  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
    }
  }
  // Rule 3: finder-like 1:1:3:1:1 patterns with 4-module light run.
  const p1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const p2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  const matches = (get: (i: number) => number, i: number, pat: number[]) => {
    for (let k = 0; k < pat.length; k += 1) if (get(i + k) !== pat[k]) return false;
    return true;
  };
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c <= size - 11; c += 1) {
      if (matches((i) => m[r][i], c, p1) || matches((i) => m[r][i], c, p2)) score += 40;
      if (matches((i) => m[i][r], c, p1) || matches((i) => m[i][r], c, p2)) score += 40;
    }
  }
  // Rule 4: dark proportion.
  let dark = 0;
  for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) dark += m[r][c];
  const pct = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(pct - 50) / 5) * 10;
  return score;
}

function bchFormat(mask: number): number {
  const data = (0 << 3) | mask; // ECC level M = 0b00
  let rem = data;
  for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

function bchVersion(v: number): number {
  let rem = v;
  for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
  return (v << 12) | rem;
}

function drawFormatAndVersion(m: number[][], g: Grid, v: number, mask: number) {
  const { size } = g;
  const fmt = bchFormat(mask);
  for (let i = 0; i <= 5; i += 1) m[8][i] = getBit(fmt, i);
  m[8][7] = getBit(fmt, 6);
  m[8][8] = getBit(fmt, 7);
  m[7][8] = getBit(fmt, 8);
  for (let i = 9; i < 15; i += 1) m[14 - i][8] = getBit(fmt, i);
  for (let i = 0; i < 8; i += 1) m[size - 1 - i][8] = getBit(fmt, i);
  for (let i = 8; i < 15; i += 1) m[8][size - 15 + i] = getBit(fmt, i);
  m[size - 8][8] = 1; // always dark

  if (v >= 7) {
    const vi = bchVersion(v);
    for (let i = 0; i < 18; i += 1) {
      const bit = getBit(vi, i);
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      m[a][b] = bit;
      m[b][a] = bit;
    }
  }
}

/** Build the QR module matrix (true = dark) for the given text. */
export function qrMatrix(text: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));
  const v = chooseVersion(bytes.length);
  const size = 17 + 4 * v;
  const g = newGrid(size);
  drawFunctionPatterns(g, v);
  const codewords = buildCodewords(encodeData(bytes, v), v);
  placeData(g, codewords);

  let best: number[][] | null = null;
  let bestScore = Infinity;
  let bestMask = 0;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = applyMask(g, mask);
    drawFormatAndVersion(candidate, g, v, mask);
    const score = penalty(candidate);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
      bestMask = mask;
    }
  }
  // Re-draw format/version on the chosen matrix to be safe (penalty saw it).
  void bestMask;
  return best!.map((row) => row.map((cell) => cell === 1));
}

/** Render the QR for `text` as a self-contained SVG string. */
export function qrSvg(text: string, opts: { scale?: number; margin?: number } = {}): string {
  const scale = opts.scale ?? 4;
  const margin = opts.margin ?? 4;
  const matrix = qrMatrix(text);
  const size = matrix.length;
  const dim = (size + margin * 2) * scale;
  const rects: string[] = [];
  for (let r = 0; r < size; r += 1) {
    let c = 0;
    while (c < size) {
      if (matrix[r][c]) {
        let run = 1;
        while (c + run < size && matrix[r][c + run]) run += 1;
        const x = (c + margin) * scale;
        const y = (r + margin) * scale;
        rects.push(`<rect x="${x}" y="${y}" width="${run * scale}" height="${scale}"/>`);
        c += run;
      } else {
        c += 1;
      }
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" ` +
    `viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" role="img" aria-label="QR code">` +
    `<rect width="${dim}" height="${dim}" fill="#ffffff"/>` +
    `<g fill="#000000">${rects.join("")}</g></svg>`
  );
}
