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
      validateUpload({ name: "image.png", size: 20 * 1024 * 1024 }),
    ).toBeUndefined();
    expect(
      validateUpload({ name: "image.png", size: 20 * 1024 * 1024 + 1 }),
    ).toContain("20 MB");
    expect(validateUpload({ name: "page.html", size: 1 })).toContain(
      "PNG, JPG",
    );
  });
  it("supports fonts with missing browser MIME types and rejects active formats and empty files", () => {
    for (const name of ["logo.PNG", "photo.jpeg", "animation.gif", "font.ttf", "font.otf"])
      expect(validateUpload({ name, size: 1 })).toBeUndefined();
    for (const name of ["logo.svg", "photo.webp"])
      expect(validateUpload({ name, size: 1 })).toBeDefined();
    expect(validateUpload({ name: "empty.png", size: 0 })).toContain("empty");
  });
});
it("trims design names and enforces the editable limit", () => {
  expect(designNameSchema.parse("  Lunch  ")).toBe("Lunch");
  expect(designNameSchema.safeParse("a".repeat(81)).success).toBe(false);
});
