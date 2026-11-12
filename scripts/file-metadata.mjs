// What a committed image carries beside its pixels: a C2PA manifest ("Claude provided this file at the request of a user")
// or metadata that names an agent. CLAUDE.md § Attribution keeps both out of the repository. Pure: no I/O, so
// `scripts/attribution.mjs` (the check) and `scripts/strip-metadata.mjs` (the fix) share one reading of the formats.
//
// Read and written as Buffers and never re-encoded: a strip deletes whole metadata pieces and copies every other byte,
// so nothing that renders can change.
import { Buffer } from "node:buffer";
import { inflateSync } from "node:zlib";

export const AGENT_NAMES = "claude|anthropic|codex|openai|copilot|cursoragent|cursor agent|devin|gemini|aider|windsurf";

/** The names and addresses that mark an agent, in a git identity or in a file's metadata. */
export const IDENTITY_RULE = new RegExp(`\\b(?:${AGENT_NAMES})\\b|@anthropic\\.com|@openai\\.com`, "i");

/** The file names whose format this reads; any other file carries nothing it looks for. */
export const COVERED_FILES = /\.(?:svg|jpe?g|png)$/i;

const C2PA = "a C2PA manifest";
const MANIFEST_ELEMENT = /<metadata><c2pa:manifest>[A-Za-z0-9+/=]*<\/c2pa:manifest><\/metadata>/g;
const NAMESPACE_ATTRIBUTE = / xmlns:c2pa="[^"]*"/g;

/** The buffer with each `{ start, end }` range cut out and every other byte copied as it was. */
function withoutRanges(buffer, ranges) {
  const kept = [];
  let from = 0;
  for (const { start, end } of ranges) {
    kept.push(buffer.subarray(from, start));
    from = end;
  }
  kept.push(buffer.subarray(from));
  return Buffer.concat(kept);
}

const extensionOf = path => /\.([^./\\]+)$/.exec(path)?.[1].toLowerCase();

/** `<title>`, `<desc>` and path data are never scanned: only the places metadata lives in. */
function agentNamedIn(text) {
  const named = IDENTITY_RULE.exec(text)?.[0];
  return named
    ? [`metadata that names an agent (${named})`]
    : [];
}

const svgText = buffer => buffer.toString("latin1");

function findInSvg(buffer) {
  const text = svgText(buffer);
  if (text.includes("c2pa:manifest") || text.includes("xmlns:c2pa"))
    return [C2PA];
  const elements = [
    ...text.matchAll(/<metadata[\s>][\s\S]*?<\/metadata>|<!--[\s\S]*?-->/g),
  ].map(([element]) => element);
  return agentNamedIn(elements.join("\n"));
}

function stripSvg(buffer) {
  const text = svgText(buffer);
  let stripped = text.replace(MANIFEST_ELEMENT, "");
  // The declaration goes only when nothing uses the prefix any more.
  if (!stripped.includes("c2pa:"))
    stripped = stripped.replace(NAMESPACE_ATTRIBUTE, "");
  return stripped === text
    ? buffer
    : Buffer.from(stripped, "latin1");
}

/**
 * The marker segments of a JPEG, up to its start-of-scan: everything after that is entropy-coded pixels and is never read.
 *
 * @returns Each segment's marker, its byte range, and where the scan data starts.
 */
export function jpegSegments(buffer) {
  if (buffer.length < 2 || buffer[0] !== 0xFF || buffer[1] !== 0xD8)
    throw new Error("not a JPEG: no start-of-image marker");
  const segments = [];
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xFF)
      throw new Error(`segment marker expected at byte ${offset}`);
    const marker = buffer[offset + 1];
    // 0xFF fill bytes may pad before a marker.
    if (marker === 0xFF) {
      offset += 1;
      continue;
    }
    // Markers that stand alone, with no length: TEM, RSTn, SOI, EOI.
    if (marker === 0x01 || marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7)) {
      segments.push({ marker, start: offset, end: offset + 2 });
      offset += 2;
      if (marker === 0xD9)
        return { segments, scanStart: offset };
      continue;
    }
    if (offset + 4 > buffer.length)
      throw new Error(`segment at byte ${offset} has no length`);
    const end = offset + 2 + buffer.readUInt16BE(offset + 2);
    if (end > buffer.length || end < offset + 4)
      throw new Error(`segment at byte ${offset} has a length that passes the end of the file`);
    segments.push({ marker, start: offset, end });
    offset = end;
    if (marker === 0xDA)
      return { segments, scanStart: offset };
  }
  throw new Error("segment list ends before a start-of-scan");
}

const APP11 = 0xEB;
const TEXT_MARKERS = new Set([0xE1, 0xFE]); // APP1 (Exif, XMP) and COM

function findInJpeg(buffer) {
  const { segments } = jpegSegments(buffer);
  if (segments.some(({ marker }) => marker === APP11))
    return [C2PA];
  const text = segments.filter(({ marker }) => TEXT_MARKERS.has(marker)).map(({ start, end }) => buffer.toString("latin1", start + 4, end));
  return agentNamedIn(text.join("\n"));
}

function stripJpeg(buffer) {
  const { segments } = jpegSegments(buffer);
  const dropped = segments.filter(({ marker }) => marker === APP11);
  return dropped.length === 0
    ? buffer
    : withoutRanges(buffer, dropped);
}

const PNG_SIGNATURE = Buffer.from([
  0x89,
  0x50,
  0x4E,
  0x47,
  0x0D,
  0x0A,
  0x1A,
  0x0A,
]);

/**
 * The chunks of a PNG, up to and including IEND.
 *
 * @returns Each chunk's type, its byte range (length, type, data and CRC) and its data range.
 */
export function pngChunks(buffer) {
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE))
    throw new Error("not a PNG: the signature is wrong");
  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    if (offset + 12 > buffer.length)
      throw new Error(`chunk at byte ${offset} is cut off`);
    const dataStart = offset + 8;
    const dataEnd = dataStart + buffer.readUInt32BE(offset);
    const end = dataEnd + 4;
    if (end > buffer.length)
      throw new Error(`chunk at byte ${offset} has a length that passes the end of the file`);
    const type = buffer.toString("latin1", offset + 4, dataStart);
    chunks.push({
      type,
      start: offset,
      end,
      dataStart,
      dataEnd,
    });
    offset = end;
    if (type === "IEND")
      return chunks;
  }
  throw new Error("chunk list ends before IEND");
}

/** The text of the chunks that hold metadata; zTXt is inflated, since its text is deflated. */
function pngText(buffer, { type, dataStart, dataEnd }) {
  const data = buffer.subarray(dataStart, dataEnd);
  if (type !== "zTXt")
    return data.toString("latin1");
  const keywordEnd = data.indexOf(0);
  if (keywordEnd < 0)
    throw new Error("a zTXt chunk has no keyword");
  return `${data.toString("latin1", 0, keywordEnd)}\n${inflateSync(data.subarray(keywordEnd + 2)).toString("latin1")}`;
}

const PNG_TEXT_CHUNKS = new Set(["tEXt", "iTXt", "zTXt", "eXIf"]);

function findInPng(buffer) {
  const chunks = pngChunks(buffer);
  if (chunks.some(({ type }) => type === "caBX"))
    return [C2PA];
  return agentNamedIn(chunks.filter(({ type }) => PNG_TEXT_CHUNKS.has(type)).map(chunk => pngText(buffer, chunk)).join("\n"));
}

function stripPng(buffer) {
  const dropped = pngChunks(buffer).filter(({ type }) => type === "caBX");
  return dropped.length === 0
    ? buffer
    : withoutRanges(buffer, dropped);
}

const FINDERS = {
  svg: findInSvg,
  jpg: findInJpeg,
  jpeg: findInJpeg,
  png: findInPng,
};
const STRIPPERS = {
  svg: stripSvg,
  jpg: stripJpeg,
  jpeg: stripJpeg,
  png: stripPng,
};

const lengthOf = ranges => ranges.reduce((sum, { start, end }) => sum + end - start, 0);

/** Throws unless `after` holds every piece of `before` that is not dropped, byte for byte, and the bytes past the last piece. */
function assertPieces(path, before, after, listBefore, listAfter, isDropped) {
  const kept = listBefore.pieces.filter(piece => !isDropped(piece));
  const dropped = listBefore.pieces.filter(isDropped);
  const same = kept.length === listAfter.pieces.length
    && kept.every((piece, index) => before.subarray(piece.start, piece.end).equals(after.subarray(listAfter.pieces[index].start, listAfter.pieces[index].end)))
    && before.subarray(listBefore.tail).equals(after.subarray(listAfter.tail))
    && before.length - after.length === lengthOf(dropped);
  if (!same)
    throw new Error(`${path}: the strip changed something besides the manifest`);
  return lengthOf(dropped);
}

/**
 * The proof that a strip moved no pixel: `after` is `before` minus the manifest, every other byte as it was.
 * The strip CLI asserts it for every file before it writes any.
 *
 * @param path The file's name; its extension picks the format.
 * @param before The bytes as committed.
 * @param after The bytes `stripFileMetadata` returned.
 * @returns How many bytes the strip removed.
 * @throws When anything else differs, or a manifest is left.
 */
export function assertOnlyMetadataRemoved(path, before, after) {
  const extension = extensionOf(path);
  if (extension === "svg") {
    const text = svgText(before);
    const removed = [
      ...text.matchAll(MANIFEST_ELEMENT),
    ].reduce((sum, [element]) => sum + element.length, 0)
    + (text.match(NAMESPACE_ATTRIBUTE)?.[0].length ?? 0);
    if (svgText(after).includes("c2pa"))
      throw new Error(`${path}: a c2pa mention is left after the strip`);
    // Same length is not enough: what is left must be the original with those two pieces cut out.
    const remainder = text.replace(MANIFEST_ELEMENT, "").replace(NAMESPACE_ATTRIBUTE, "");
    if (before.length - after.length !== removed || svgText(after) !== remainder)
      throw new Error(`${path}: the strip changed something besides the manifest`);
    return removed;
  }
  if (extension === "jpg" || extension === "jpeg") {
    const list = (buffer) => {
      const { segments, scanStart } = jpegSegments(buffer);
      return { pieces: segments, tail: scanStart };
    };
    return assertPieces(path, before, after, list(before), list(after), ({ marker }) => marker === APP11);
  }
  if (extension === "png") {
    const list = (buffer) => {
      const chunks = pngChunks(buffer);
      return { pieces: chunks, tail: chunks.at(-1).end };
    };
    return assertPieces(path, before, after, list(before), list(after), ({ type }) => type === "caBX");
  }
  if (!before.equals(after))
    throw new Error(`${path}: the strip changed a file it does not read`);
  return 0;
}

/**
 * What a file carries that CLAUDE.md § Attribution keeps out.
 *
 * @param path The file's name; its extension picks the format (`.svg`, `.jpg`, `.jpeg`, `.png`). Anything else carries nothing this reads.
 * @param buffer The file's bytes.
 * @returns One reason per finding, e.g. `a C2PA manifest`; empty when clean.
 * @throws When the file does not parse as its extension says: a file that cannot be read is not known to be clean.
 */
export function findFileMetadata(path, buffer) {
  return FINDERS[extensionOf(path)]?.(buffer) ?? [];
}

/**
 * The file without its C2PA manifest, every other byte as it was.
 *
 * @param path The file's name; its extension picks the format.
 * @param buffer The file's bytes.
 * @returns The same `buffer` object when nothing is removed; otherwise a new one.
 * @throws When the file does not parse as its extension says.
 */
export function stripFileMetadata(path, buffer) {
  return STRIPPERS[extensionOf(path)]?.(buffer) ?? buffer;
}
