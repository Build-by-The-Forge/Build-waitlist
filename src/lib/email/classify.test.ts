import { describe, expect, it } from "vitest";
import { classifyHttpStatus, classifyNetworkError } from "./classify";

const fetchFailed = (code: string) => Object.assign(new TypeError("fetch failed"), { cause: { code } });

describe("classifyNetworkError", () => {
  it.each(["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT"])("%s never reached the provider → transient", (code) => {
    expect(classifyNetworkError(fetchFailed(code))).toEqual({ failure: "transient", errorCode: code });
  });

  it("our request timeout may have been accepted → unknown", () => {
    const timeout = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
    expect(classifyNetworkError(timeout)).toEqual({ failure: "unknown", errorCode: "TimeoutError" });
  });

  it("a connection reset mid-request → unknown", () => {
    expect(classifyNetworkError(fetchFailed("ECONNRESET")).failure).toBe("unknown");
    expect(classifyNetworkError(fetchFailed("UND_ERR_SOCKET")).failure).toBe("unknown");
  });

  it("anything unrecognized → unknown (never assume it wasn't sent)", () => {
    expect(classifyNetworkError(new Error("weird")).failure).toBe("unknown");
    expect(classifyNetworkError(undefined).failure).toBe("unknown");
  });
});

describe("classifyHttpStatus", () => {
  it.each([
    [401, "configuration"],
    [403, "configuration"],
    [429, "transient"],
    [500, "transient"],
    [502, "transient"],
    [503, "transient"],
    [504, "unknown"],
    [400, "permanent"],
    [404, "permanent"],
    [422, "permanent"],
  ] as const)("%i → %s", (status, expected) => {
    expect(classifyHttpStatus(status)).toBe(expected);
  });
});
