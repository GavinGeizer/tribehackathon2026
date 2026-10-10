import { describe, expect, test } from "bun:test";
import {
  assertFileSize,
  decodeTextBytes,
  getExtension,
  getFileKind,
  HttpError,
  MAX_BODY_BYTES,
  MAX_FILE_BYTES,
  sanitizeFilename,
} from "../../server/validation.ts";
import { withBoundedBody } from "../../server/index.ts";
import { extractPlainText } from "../../server/extract.ts";

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

describe("sanitizeFilename", () => {
  test("strips directories and traversal", () => {
    expect(sanitizeFilename("../../etc/passwd.txt")).toBe("passwd.txt");
    expect(sanitizeFilename("C:\\fakepath\\plan.PDF")).toBe("plan.PDF");
  });

  test("never returns empty", () => {
    expect(sanitizeFilename("")).toBe("upload");
    expect(sanitizeFilename("...")).toBe("upload");
  });
});

describe("getExtension", () => {
  test("lowercases and strips dot", () => {
    expect(getExtension("PLAN.PDF")).toBe("pdf");
    expect(getExtension("noext")).toBe("");
  });
});

describe("assertFileSize", () => {
  test("rejects oversize with 413", () => {
    try {
      assertFileSize(MAX_FILE_BYTES + 1);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(413);
    }
  });

  test("rejects empty with 422", () => {
    try {
      assertFileSize(0);
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as HttpError).status).toBe(422);
    }
  });
});

describe("getFileKind", () => {
  test("rejects invalid extension with 415", () => {
    try {
      getFileKind({ filename: "photo.png", mimeType: "image/png", size: 10 }, new Uint8Array(10));
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as HttpError).status).toBe(415);
    }
  });

  test("rejects misnamed pdf without signature with 422", () => {
    try {
      getFileKind(
        { filename: "report.pdf", mimeType: "application/pdf", size: 8 },
        new TextEncoder().encode("not a pdf"),
      );
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as HttpError).status).toBe(422);
    }
  });

  test("accepts real pdf signature and plain text", () => {
    expect(
      getFileKind({ filename: "report.pdf", mimeType: "application/pdf", size: 8 }, PDF_BYTES),
    ).toBe("pdf");
    expect(
      getFileKind(
        { filename: "notes.txt", mimeType: "text/plain", size: 5 },
        new TextEncoder().encode("hello"),
      ),
    ).toBe("text");
  });
});

describe("decodeTextBytes", () => {
  test("rejects invalid utf-8", () => {
    try {
      decodeTextBytes(new Uint8Array([0xff, 0xfe, 0x00]));
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as HttpError).status).toBe(422);
    }
  });
});

describe("withBoundedBody", () => {
  test("passes small bodies through", async () => {
    const req = new Request("http://localhost/api/analyze", { method: "POST", body: "hello" });
    const out = await withBoundedBody(req, MAX_BODY_BYTES);
    expect(await out.text()).toBe("hello");
  });

  test("rejects declared Content-Length above cap without reading", async () => {
    const req = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "content-length": String(MAX_BODY_BYTES + 1) },
      body: "hi",
    });
    try {
      await withBoundedBody(req, MAX_BODY_BYTES);
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as HttpError).status).toBe(413);
    }
  });

  test("rejects streaming bodies over cap even without Content-Length", async () => {
    const big = new Uint8Array(MAX_BODY_BYTES + 100);
    const stream = new ReadableStream({
      start(c) { c.enqueue(big); c.close(); },
    });
    const req = new Request("http://localhost/api/analyze", {
      method: "POST",
      body: stream,
      // @ts-expect-error duplex required for streaming bodies in some runtimes
      duplex: "half",
    });
    try {
      await withBoundedBody(req, MAX_BODY_BYTES);
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as HttpError).status).toBe(413);
    }
  });
});

describe("extractPlainText", () => {
  test("rejects empty text", () => {
    try {
      extractPlainText("   \n  ");
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as HttpError).status).toBe(422);
    }
  });
});
