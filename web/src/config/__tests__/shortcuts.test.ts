import { NODE_EDITOR_SHORTCUTS, Shortcut, shortcutComboText } from "../shortcuts";

describe("NODE_EDITOR_SHORTCUTS", () => {
  describe("resetZoom shortcut", () => {
    const resetZoomShortcut = NODE_EDITOR_SHORTCUTS.find(
      (s: Shortcut) => s.slug === "resetZoom"
    );

    it("should have correct keyCombo for non-Mac", () => {
      expect(resetZoomShortcut?.keyCombo).toEqual(["Control", "0"]);
    });

    it("should have correct category", () => {
      expect(resetZoomShortcut?.category).toBe("editor");
    });

    it("should be registerable", () => {
      expect(resetZoomShortcut?.registerCombo).toBe(true);
    });

    it("should have title", () => {
      expect(resetZoomShortcut?.title).toBe("Reset Zoom");
    });
  });

  describe("shortcut count", () => {
    it("should have expected number of editor shortcuts", () => {
      const editorShortcuts = NODE_EDITOR_SHORTCUTS.filter(
        (s: Shortcut) => s.category === "editor"
      );
      expect(editorShortcuts.length).toBeGreaterThan(20);
    });

    it("should have resetZoom in the list", () => {
      const slugs = NODE_EDITOR_SHORTCUTS.map((s: Shortcut) => s.slug);
      expect(slugs).toContain("resetZoom");
    });

    it("should have unique slugs", () => {
      const slugs = NODE_EDITOR_SHORTCUTS.map((s: Shortcut) => s.slug);
      const uniqueSlugs = new Set(slugs);
      expect(slugs.length).toBe(uniqueSlugs.size);
    });

    it("does not advertise simultaneous multi-digit zoom chords", () => {
      expect(
        NODE_EDITOR_SHORTCUTS.find((shortcut) => shortcut.slug === "zoom50")
          ?.keyCombo
      ).toEqual(["Control", "Alt", "5"]);
      expect(
        NODE_EDITOR_SHORTCUTS.find((shortcut) => shortcut.slug === "zoom100")
          ?.keyCombo
      ).toEqual(["Control", "Alt", "1"]);
      expect(
        NODE_EDITOR_SHORTCUTS.find((shortcut) => shortcut.slug === "zoom200")
          ?.keyCombo
      ).toEqual(["Control", "Alt", "2"]);
    });

    it("keeps directional focus and history on distinct bindings", () => {
      const focusLeft = NODE_EDITOR_SHORTCUTS.find(
        (shortcut) => shortcut.slug === "focusNodeLeft"
      );
      const goBack = NODE_EDITOR_SHORTCUTS.find(
        (shortcut) => shortcut.slug === "goBack"
      );
      expect(goBack?.keyCombo).not.toEqual(focusLeft?.keyCombo);
    });
  });

  describe("clipboard shortcuts", () => {
    it("register copy, cut and paste on every platform", () => {
      // The desktop Edit menu uses plain roles that never reach the renderer,
      // so a canvas combo is the only way nodes get copied there.
      ["copy", "cut", "paste"].forEach((slug) => {
        const shortcut = NODE_EDITOR_SHORTCUTS.find(
          (s: Shortcut) => s.slug === slug
        );
        expect(shortcut).toBeDefined();
        expect(shortcut?.registerCombo).toBe(true);
        expect(shortcut?.electronOnly).toBeFalsy();
        expect(shortcut).not.toHaveProperty("skipInElectron");
      });
    });
  });

  describe("shortcutComboText", () => {
    it("renders a bare key with no separators", () => {
      expect(shortcutComboText("fitView", "mac")).toBe("F");
      expect(shortcutComboText("fitView", "win")).toBe("F");
    });

    it("attaches mac modifier glyphs directly to the key", () => {
      expect(shortcutComboText("duplicate", "mac")).toBe("⌘D");
      expect(shortcutComboText("redo", "mac")).toBe("⌘⇧Z");
      expect(shortcutComboText("runWorkflow", "mac")).toBe("⌘Enter");
      expect(shortcutComboText("resetZoom", "mac")).toBe("⌘0");
    });

    it("joins non-glyph modifiers with +", () => {
      expect(shortcutComboText("duplicate", "win")).toBe("Ctrl+D");
      expect(shortcutComboText("redo", "win")).toBe("Ctrl+Shift+Z");
      expect(shortcutComboText("runWorkflow", "win")).toBe("Ctrl+Enter");
    });

    it("honours an explicit mac combo that keeps literal Control", () => {
      // assetViewerPrevJump pins Control+ArrowLeft on mac — Control stays ⌃,
      // it must not become the ⌘ that mapKeyForMac derives from keyCombo.
      expect(shortcutComboText("assetViewerPrevJump", "mac")).toBe("⌃←");
    });

    it("humanizes space and arrow keys", () => {
      expect(shortcutComboText("openNodeMenu", "win")).toBe("Space");
      expect(shortcutComboText("moveLeft", "win")).toBe("←");
    });

    it("returns an empty string for an unknown slug", () => {
      expect(shortcutComboText("noSuchShortcut", "mac")).toBe("");
      expect(shortcutComboText("noSuchShortcut", "win")).toBe("");
    });
  });
});
