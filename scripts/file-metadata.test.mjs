import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { assertOnlyMetadataRemoved, findFileMetadata, stripFileMetadata } from "./file-metadata.mjs";

// The guard behind CLAUDE.md § Attribution for images: a C2PA manifest says "Claude provided this file", and nothing
// that draws may change when it goes. The fixtures are built in memory; a fake manifest is any base64 text.
const MANIFEST = "<metadata><c2pa:manifest>SGVsbG8gQ2xhdWRl+/==</c2pa:manifest></metadata>";
const svgWith = (body = "<path d=\"M0 0h4v4z\"/>") => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:c2pa="http://c2pa.org/manifest" viewBox="0 0 4 4">${MANIFEST}${body}</svg>`;
const svgWithout = (body = "<path d=\"M0 0h4v4z\"/>") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4">${body}</svg>`;

function jpegSegment(marker, payload) {
  const body = Buffer.from(payload, "latin1");
  return Buffer.concat([
    Buffer.from([
      0xFF,
      marker,
      (body.length + 2) >> 8,
      (body.length + 2) & 0xFF,
    ]),
    body,
  ]);
}
const SOI = Buffer.from([0xFF, 0xD8]);
const EOI = Buffer.from([0xFF, 0xD9]);
const jfif = jpegSegment(0xE0, "JFIF\0\x01\x01");
const icc = jpegSegment(0xE2, "ICC_PROFILE\0\x01\x01profile");
const tables = Buffer.concat([
  jpegSegment(0xDB, "\0quant"),
  jpegSegment(0xC0, "\x08frame"),
  jpegSegment(0xC4, "\0huff"),
]);
const sos = jpegSegment(0xDA, "\x01\x01\0\0?\0");
function jpegOf(parts, scan = "scan") {
  return Buffer.concat([
    SOI,
    ...parts,
    tables,
    sos,
    Buffer.from(scan, "latin1"),
    EOI,
  ]);
}
const app11 = text => jpegSegment(0xEB, `JP\0\0jumb${text}`);

describe("jPEG", () => {
  it("strips every APP11 segment and copies every other byte as it was", () => {
    const withManifest = jpegOf([
      jfif,
      app11("c2pa Claude"),
      app11("more"),
      icc,
    ]);
    const clean = jpegOf([jfif, icc]);
    expect(findFileMetadata("a.jpg", withManifest)).toEqual(["a C2PA manifest"]);
    const stripped = stripFileMetadata("a.jpg", withManifest);
    expect(stripped.equals(clean)).toBe(true);
    expect(findFileMetadata("a.jpg", stripped)).toEqual([]);
    expect(stripFileMetadata("a.jpg", clean)).toBe(clean);
  });

  it("does not read the scan data: the ASCII of an agent in pixels is not metadata", () => {
    const pixels = jpegOf([jfif, icc], "xx claude c2pa codex xx");
    expect(findFileMetadata("a.jpg", pixels)).toEqual([]);
    expect(stripFileMetadata("a.jpg", pixels)).toBe(pixels);
  });

  it("flags an agent named in XMP or a comment", () => {
    const xmp = jpegSegment(0xE1, "http://ns.adobe.com/xap/1.0/\0<x:xmp CreatorTool=\"Claude\"/>");
    expect(findFileMetadata("a.jpeg", jpegOf([jfif, xmp]))).toEqual(["metadata that names an agent (Claude)"]);
    expect(findFileMetadata("a.JPG", jpegOf([
      jfif,
      jpegSegment(0xFE, "made by Codex"),
    ]))).toEqual(["metadata that names an agent (Codex)"]);
  });

  it("throws on bytes it cannot read, rather than guess", () => {
    const whole = jpegOf([
      jfif,
      app11("c2pa"),
    ]);
    expect(() => findFileMetadata("a.jpg", Buffer.from("<svg/>"))).toThrow(/not a JPEG/);
    expect(() => findFileMetadata("a.jpg", whole.subarray(0, 40))).toThrow(/segment/);
    expect(() => stripFileMetadata("a.jpg", whole.subarray(0, 40))).toThrow(/segment/);
  });
});

// The walker never checks a CRC, so each chunk gets four marker bytes: what the test proves is that they travel unchanged.
function pngChunk(type, data = Buffer.alloc(0), crc = [1, 2, 3, 4]) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([
    length,
    Buffer.from(type, "latin1"),
    data,
    Buffer.from(crc),
  ]);
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
function pngOf(...chunks) {
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", Buffer.alloc(13)),
    ...chunks,
    pngChunk("IDAT", Buffer.from("pixels claude")),
    pngChunk("IEND"),
  ]);
}

describe("pNG", () => {
  it("drops the caBX chunk and copies every kept chunk whole, CRC included", () => {
    const withManifest = pngOf(pngChunk("caBX", Buffer.from("jumb c2pa"), [9, 9, 9, 9]), pngChunk("pHYs", Buffer.alloc(9), [5, 6, 7, 8]));
    const clean = pngOf(pngChunk("pHYs", Buffer.alloc(9), [5, 6, 7, 8]));
    expect(findFileMetadata("a.png", withManifest)).toEqual(["a C2PA manifest"]);
    expect(stripFileMetadata("a.png", withManifest).equals(clean)).toBe(true);
    expect(findFileMetadata("a.png", clean)).toEqual([]);
    expect(stripFileMetadata("a.png", clean)).toBe(clean);
  });

  it("flags an agent named in tEXt, iTXt, zTXt or Exif, and reads no pixels", () => {
    const find = chunk => findFileMetadata("a.png", pngOf(chunk));
    expect(find(pngChunk("tEXt", Buffer.from("Software\0Claude")))).toEqual(["metadata that names an agent (Claude)"]);
    expect(find(pngChunk("iTXt", Buffer.from("Comment\0\0\0\0\0made by Codex")))).toEqual(["metadata that names an agent (Codex)"]);
    expect(find(pngChunk("zTXt", Buffer.concat([
      Buffer.from("Software\0\0"),
      deflateSync(Buffer.from("Gemini")),
    ])))).toEqual(["metadata that names an agent (Gemini)"]);
    expect(find(pngChunk("eXIf", Buffer.from("II*\0Anthropic")))).toEqual(["metadata that names an agent (Anthropic)"]);
    expect(find(pngChunk("tEXt", Buffer.from("Title\0A winnie")))).toEqual([]);
  });

  it("throws on bytes it cannot read", () => {
    expect(() => findFileMetadata("a.png", Buffer.from("<svg/>"))).toThrow(/not a PNG/);
    expect(() => findFileMetadata("a.png", pngOf().subarray(0, 30))).toThrow(/chunk/);
  });
});

// What the strip CLI asserts for every file before it writes it: the proof that no pixel moved.
describe("assertOnlyMetadataRemoved", () => {
  it("counts the bytes a strip removed, for each format", () => {
    const svg = Buffer.from(svgWith());
    expect(assertOnlyMetadataRemoved("a.svg", svg, stripFileMetadata("a.svg", svg))).toBe(svg.length - Buffer.from(svgWithout()).length);
    const jpeg = jpegOf([
      jfif,
      app11("c2pa"),
      icc,
    ]);
    expect(assertOnlyMetadataRemoved("a.jpg", jpeg, jpegOf([jfif, icc]))).toBe(app11("c2pa").length);
    const png = pngOf(pngChunk("caBX", Buffer.from("c2pa")));
    expect(assertOnlyMetadataRemoved("a.png", png, pngOf())).toBe(pngChunk("caBX", Buffer.from("c2pa")).length);
  });

  it("refuses a result that lost or changed anything else", () => {
    const svg = Buffer.from(svgWith());
    expect(() => assertOnlyMetadataRemoved("a.svg", svg, Buffer.from(svgWithout("<path d=\"M0 0h5v5z\"/>")))).toThrow(/a\.svg/);
    expect(() => assertOnlyMetadataRemoved("a.svg", svg, svg)).toThrow(/c2pa/);
    const jpeg = jpegOf([
      jfif,
      app11("c2pa"),
      icc,
    ]);
    expect(() => assertOnlyMetadataRemoved("a.jpg", jpeg, jpegOf([jfif]))).toThrow(/a\.jpg/);
    expect(() => assertOnlyMetadataRemoved("a.jpg", jpeg, jpegOf([jfif, icc], "other scan"))).toThrow(/a\.jpg/);
    const png = pngOf(pngChunk("caBX", Buffer.from("c2pa")), pngChunk("pHYs", Buffer.alloc(9)));
    expect(() => assertOnlyMetadataRemoved("a.png", png, pngOf())).toThrow(/a\.png/);
  });
});

describe("any other extension", () => {
  it("reads nothing and strips nothing, whatever its bytes say", () => {
    const bytes = Buffer.from("c2pa:manifest claude");
    expect(findFileMetadata("a.woff2", bytes)).toEqual([]);
    expect(findFileMetadata("a.ts", bytes)).toEqual([]);
    expect(stripFileMetadata("a.woff2", bytes)).toBe(bytes);
  });
});

describe("sVG", () => {
  it("strips the manifest element and its namespace, and nothing else", () => {
    const original = Buffer.from(svgWith());
    const stripped = stripFileMetadata("a.svg", original);
    expect(stripped.toString()).toBe("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 4 4\"><path d=\"M0 0h4v4z\"/></svg>");
    // The invariant: only the two substrings are gone, so nothing that draws changed.
    const removed = MANIFEST.length + " xmlns:c2pa=\"http://c2pa.org/manifest\"".length;
    expect(stripped.length).toBe(original.length - removed);
    expect(findFileMetadata("a.svg", original)).toEqual(["a C2PA manifest"]);
    expect(findFileMetadata("a.svg", stripped)).toEqual([]);
  });

  it("hands back the same buffer when there is nothing to strip", () => {
    const clean = Buffer.from(svgWithout());
    expect(stripFileMetadata("a.svg", clean)).toBe(clean);
    expect(findFileMetadata("a.svg", clean)).toEqual([]);
  });

  it("removes a namespace declaration that has no element, and keeps one that is still used", () => {
    const declared = Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:c2pa=\"http://c2pa.org/manifest\"><path d=\"M0 0\"/></svg>");
    expect(stripFileMetadata("a.svg", declared).toString()).toBe("<svg xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M0 0\"/></svg>");
    const used = Buffer.from(`<svg xmlns:c2pa="http://c2pa.org/manifest">${MANIFEST}<g c2pa:keep="1"/></svg>`);
    expect(stripFileMetadata("a.svg", used).toString()).toBe("<svg xmlns:c2pa=\"http://c2pa.org/manifest\"><g c2pa:keep=\"1\"/></svg>");
  });

  it("flags metadata and comments that name an agent, and nothing that is drawn or titled", () => {
    const find = body => findFileMetadata("a.svg", Buffer.from(svgWithout(body)));
    expect(find("<metadata><x>Created with Claude</x></metadata><path d=\"M0 0\"/>")).toEqual(["metadata that names an agent (Claude)"]);
    expect(find("<!-- Codex --><path d=\"M0 0\"/>")).toEqual(["metadata that names an agent (Codex)"]);
    expect(find("<title>Claude</title><path d=\"M0 0\"/>")).toEqual([]);
    expect(find("<title>Claude Design</title><desc>made by Gemini</desc>")).toEqual([]);
  });
});

// The whole tree, once, here: the pre-commit hook and the Attribution job look only at the files a change touches, so a
// hotfix on main (which still carries the manifests until 1.0.0) is not held up by files it did not write.
describe("the repository", () => {
  it("has no tracked image with a manifest or an agent in its metadata", () => {
    const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", maxBuffer: 1 << 26 }).split("\0").filter(path => /\.(?:svg|jpe?g|png)$/i.test(path));
    expect(tracked.length).toBeGreaterThan(0);
    const findings = tracked.flatMap(path => findFileMetadata(path, readFileSync(path)).map(reason => `${path} carries ${reason}: node scripts/strip-metadata.mjs ${path}`));
    expect(findings).toEqual([]);
  }, 30_000);
});
