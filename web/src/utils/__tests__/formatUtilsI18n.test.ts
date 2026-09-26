import {
  formatContentType,
  localizedSizeFilterLabel,
  localizedTypeFilterLabel
} from "../formatUtils";
import { changeAppLanguage, resetI18nForTest } from "../../i18n";

describe("localized MIME and filter labels", () => {
  it("keeps English output byte-for-byte in en", () => {
    expect(formatContentType("image/png")).toBe("PNG image");
    expect(formatContentType("image/avif")).toBe("AVIF image");
    expect(formatContentType(null)).toBe("Unknown");
  });

  it("localizes MIME labels, unknown pattern, and filters in zh", async () => {
    await changeAppLanguage("zh-CN");
    try {
      expect(formatContentType("image/png")).toBe("PNG 图片");
      // Unknown subtype keeps the format token, localizes the kind, no space.
      expect(formatContentType("image/avif")).toBe("AVIF图片");
      expect(formatContentType(null)).toBe("未知");
      expect(localizedTypeFilterLabel("image", "Images")).toBe("图片");
      expect(localizedSizeFilterLabel("all", "All")).toBe("全部");
      // Locale-neutral ranges fall back to the constant label.
      expect(localizedSizeFilterLabel("medium", "1-10 MB")).toBe("1-10 MB");
    } finally {
      await resetI18nForTest();
    }
  });
});
