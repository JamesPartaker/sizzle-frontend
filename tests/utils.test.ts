import { describe, expect, it } from "vitest";
import { timeAgo, validateUpload } from "../packages/utils/src";
import { designNameSchema } from "../packages/schemas/src";
describe("relative editing timestamps", () => {
  const now = 2_000_000_000;
  it("handles future timestamps and singular units", () => {
    expect(timeAgo(now + 10, now)).toBe("Just now");
    expect(timeAgo(now - 3_600_000, now)).toBe("1 hour ago");
    expect(timeAgo(now - 86_400_000, now)).toBe("1 day ago");
  });
});
describe("asset upload limits", () => {
  it("accepts the documented exact size boundary and rejects unsupported types", () => {
    expect(
      validateUpload({ type: "image/png", size: 5 * 1024 * 1024 }),
    ).toBeUndefined();
    expect(
      validateUpload({ type: "image/png", size: 5 * 1024 * 1024 + 1 }),
    ).toContain("5 MB");
    expect(validateUpload({ type: "text/html", size: 1 })).toContain(
      "SVG, PNG",
    );
  });
});
it("trims design names and enforces the editable limit", () => {
  expect(designNameSchema.parse("  Lunch  ")).toBe("Lunch");
  expect(designNameSchema.safeParse("a".repeat(81)).success).toBe(false);
});
