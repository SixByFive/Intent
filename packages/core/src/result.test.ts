import { describe, it, expect } from "vitest";
import { ok, err, intentError } from "./result.js";

describe("ok", () => {
  it("creates an Ok result", () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });

  it("works with undefined", () => {
    const r = ok(undefined);
    expect(r.ok).toBe(true);
  });
});

describe("err", () => {
  it("creates an Err result", () => {
    const r = err(intentError("GIT_ERROR", "something failed"));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("GIT_ERROR");
      expect(r.error.message).toBe("something failed");
    }
  });
});

describe("intentError", () => {
  it("includes cause when provided", () => {
    const cause = new Error("root cause");
    const e = intentError("PARSE_ERROR", "msg", cause);
    expect(e.cause).toBe(cause);
  });

  it("omits cause when not provided", () => {
    const e = intentError("WRITE_ERROR", "msg");
    expect(e.cause).toBeUndefined();
  });
});
