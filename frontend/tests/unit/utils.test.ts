import { describe, expect, it } from "vitest";
import { formatMoney, headlineLines, isExternal } from "@/lib/utils";

describe("utils", () => {
  it("splits CMS headlines on newlines and ignores blanks", () => {
    expect(headlineLines("Line one.\n\nLine two.\n")).toEqual(["Line one.", "Line two."]);
  });
  it("formats money without decimals", () => {
    expect(formatMoney("5000.00", "USD")).toBe("$5,000");
    expect(formatMoney(null)).toBe("");
  });
  it("detects external urls", () => {
    expect(isExternal("https://x.com")).toBe(true);
    expect(isExternal("/contact")).toBe(false);
  });
});
