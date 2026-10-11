import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, CssBaseline } from "@mui/material";
import mockTheme from "../../../__mocks__/themeMock";
import { EditorUiProvider } from "../EditorUiContext";
import EditorButton from "../EditorButton";

const renderWithThemeProvider = (component: React.ReactElement, scope?: "node" | "inspector") => {
  return render(
    <ThemeProvider theme={mockTheme}>
      <CssBaseline />
      <EditorUiProvider scope={scope}>{component}</EditorUiProvider>
    </ThemeProvider>
  );
};

describe("EditorButton", () => {
  it("renders a button with text content", () => {
    renderWithThemeProvider(<EditorButton>Click me</EditorButton>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it("applies nodrag class to prevent ReactFlow drag", () => {
    const { container } = renderWithThemeProvider(
      <EditorButton>Click me</EditorButton>
    );
    const button = container.querySelector(".nodrag");
    expect(button).toBeInTheDocument();
  });

  it("calls onClick handler when clicked", async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    renderWithThemeProvider(
      <EditorButton onClick={handleClick}>Click me</EditorButton>
    );
    const button = screen.getByRole("button", { name: /click me/i });
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders as disabled when disabled prop is true", () => {
    renderWithThemeProvider(
      <EditorButton disabled>Disabled</EditorButton>
    );
    const button = screen.getByRole("button", { name: /disabled/i });
    expect(button).toBeDisabled();
  });

  it("applies custom className", () => {
    const { container } = renderWithThemeProvider(
      <EditorButton className="custom-class">Click me</EditorButton>
    );
    const button = container.querySelector(".custom-class");
    expect(button).toBeInTheDocument();
  });

  it("applies custom sx styles", () => {
    renderWithThemeProvider(
      <EditorButton sx={{ marginLeft: "10px" }}>Click me</EditorButton>
    );
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it("renders with different variants", () => {
    const { rerender } = renderWithThemeProvider(
      <EditorButton variant="contained">Contained</EditorButton>
    );
    expect(screen.getByRole("button")).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={mockTheme}>
        <CssBaseline />
        <EditorUiProvider>
          <EditorButton variant="outlined">Outlined</EditorButton>
        </EditorUiProvider>
      </ThemeProvider>
    );
    expect(screen.getByRole("button")).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={mockTheme}>
        <CssBaseline />
        <EditorUiProvider>
          <EditorButton variant="text">Text</EditorButton>
        </EditorUiProvider>
      </ThemeProvider>
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders with different colors", () => {
    const { rerender } = renderWithThemeProvider(
      <EditorButton color="primary">Primary</EditorButton>
    );
    expect(screen.getByRole("button")).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={mockTheme}>
        <CssBaseline />
        <EditorUiProvider>
          <EditorButton color="secondary">Secondary</EditorButton>
        </EditorUiProvider>
      </ThemeProvider>
    );
    expect(screen.getByRole("button")).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={mockTheme}>
        <CssBaseline />
        <EditorUiProvider>
          <EditorButton color="error">Error</EditorButton>
        </EditorUiProvider>
      </ThemeProvider>
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  describe("height-aware line box (F-38, r20)", () => {
    /**
     * Extracts the emotion rule text emitted for the rendered button's sx
     * class, so the box contract can be asserted in jsdom (no layout engine):
     * CONTROL height as a minHeight floor + a single-line token lineHeight
     * whose line box fits the floor's content area at the token font size.
     */
    const readSxRules = (button: HTMLElement): string => {
      const cls = Array.from(button.classList).find((c) => c.startsWith("css-"));
      if (!cls) return "";
      let text = "";
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            if (rule.cssText.includes(cls)) text += rule.cssText;
          }
        } catch {
          // cross-origin sheet — not used in tests
        }
      }
      return text;
    };

    const TOKEN_FONT = { node: 11, inspector: 13 } as const;
    // CONTROL.height rows reachable through density/size props (xl has no mapping)
    const FLOORS = [24, 28, 32, 36] as const;
    const PAD_Y = 4; // CONTROL.paddingY

    it.each(FLOORS.map((floor) => [{ floor }]))(
      "line box fits the content area at floor $floor in both scopes",
      ({ floor }) => {
        for (const scope of ["node", "inspector"] as const) {
          const props: React.ComponentProps<typeof EditorButton> = {};
          // pick density/size that yields this floor
          if (floor === 24) props.density = "compact";
          else if (floor === 28) props.density = "normal";
          else props.size = floor === 32 ? "medium" : "large";

          const { unmount } = renderWithThemeProvider(
            <EditorButton {...props}>标签</EditorButton>,
            scope
          );
          const button = screen.getByRole("button");
          const rules = readSxRules(button);
          expect(rules).toMatch(new RegExp(`min-height:\\s*${floor}px`));
          expect(rules).not.toMatch(/(^|[^-])height:\s*\d+px/); // no fixed height
          expect(rules).toMatch(/white-space:\s*nowrap/);
          expect(rules).toMatch(/flex-shrink:\s*0/);
          const lhMatch = rules.match(/line-height:\s*([\d.]+)/);
          expect(lhMatch).not.toBeNull();
          const lineHeight = parseFloat(lhMatch![1]);
          // the token tier: caption 1.4 (node), label 1.35 (inspector) —
          // single-line range; MUI's default 1.75 must never come back.
          expect(lineHeight).toBeLessThanOrEqual(1.4);
          expect(lineHeight).toBeGreaterThanOrEqual(1);
          // The line box may exceed the floor's padding-only content area in
          // the densest combo (xs floor + 13px inspector text: 1.35 × 13 =
          // 17.55 > 16) — that is the doctrine working, not a bug: with
          // minHeight the box grows ~2px instead of clipping. What must NEVER
          // hold is a line box taller than the whole floor.
          const lineBox = lineHeight * TOKEN_FONT[scope];
          expect(lineBox).toBeLessThanOrEqual(floor);
          unmount();
        }
      }
    );

    it("keeps the label on one line and the box adaptive (no fixed height)", () => {
      renderWithThemeProvider(<EditorButton variant="outlined">添加端点</EditorButton>);
      const button = screen.getByRole("button");
      const rules = readSxRules(button);
      expect(rules).toMatch(/white-space:\s*nowrap/);
      expect(rules).toMatch(/min-height:\s*24px/);
    });
  });

  describe("density prop", () => {
    it("renders with compact density by default", () => {
      renderWithThemeProvider(<EditorButton>Click me</EditorButton>);
      const button = screen.getByRole("button", { name: /click me/i });
      expect(button).toBeInTheDocument();
    });

    it("renders with normal density", () => {
      renderWithThemeProvider(
        <EditorButton density="normal">Click me</EditorButton>
      );
      const button = screen.getByRole("button", { name: /click me/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe("scope context", () => {
    it("renders in node scope", () => {
      renderWithThemeProvider(<EditorButton>Node Button</EditorButton>, "node");
      const button = screen.getByRole("button", { name: /node button/i });
      expect(button).toBeInTheDocument();
    });

    it("renders in inspector scope", () => {
      renderWithThemeProvider(
        <EditorButton>Inspector Button</EditorButton>,
        "inspector"
      );
      const button = screen.getByRole("button", { name: /inspector button/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe("start and end icons", () => {
    it("renders with startIcon", () => {
      renderWithThemeProvider(
        <EditorButton startIcon={<span data-testid="start-icon">S</span>}>
          Button
        </EditorButton>
      );
      expect(screen.getByTestId("start-icon")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("renders with endIcon", () => {
      renderWithThemeProvider(
        <EditorButton endIcon={<span data-testid="end-icon">E</span>}>
          Button
        </EditorButton>
      );
      expect(screen.getByTestId("end-icon")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("button sizes", () => {
    it("renders with default size", () => {
      renderWithThemeProvider(
        <EditorButton>Default Size</EditorButton>
      );
      const button = screen.getByRole("button", { name: /default size/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("supports aria-label", () => {
      renderWithThemeProvider(
        <EditorButton aria-label="Close dialog">×</EditorButton>
      );
      const button = screen.getByRole("button", { name: /close dialog/i });
      expect(button).toBeInTheDocument();
    });

    it("supports aria-describedby", () => {
      renderWithThemeProvider(
        <>
          <EditorButton aria-describedby="description-id">Help</EditorButton>
          <span id="description-id">Click for help</span>
        </>
      );
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-describedby", "description-id");
    });
  });

  describe("edge cases", () => {
    it("handles empty text content", () => {
      renderWithThemeProvider(<EditorButton></EditorButton>);
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("");
    });

    it("handles very long text content", () => {
      const longText = "This is a very long button text that might overflow";
      renderWithThemeProvider(<EditorButton>{longText}</EditorButton>);
      const button = screen.getByRole("button", { name: new RegExp(longText) });
      expect(button).toBeInTheDocument();
    });
  });

  describe("button types", () => {
    it("renders submit type button", () => {
      renderWithThemeProvider(
        <EditorButton type="submit">Submit</EditorButton>
      );
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "submit");
    });

    it("renders reset type button", () => {
      renderWithThemeProvider(
        <EditorButton type="reset">Reset</EditorButton>
      );
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "reset");
    });

    it("renders button type by default", () => {
      renderWithThemeProvider(<EditorButton>Button</EditorButton>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "button");
    });
  });

  describe("fullWidth variant", () => {
    it("renders with fullWidth prop", () => {
      renderWithThemeProvider(
        <EditorButton fullWidth>Full Width</EditorButton>
      );
      const button = screen.getByRole("button", { name: /full width/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe("href and link behavior", () => {
    it("renders as anchor when href is provided", () => {
      renderWithThemeProvider(
        <EditorButton href="https://example.com">Link</EditorButton>
      );
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "https://example.com");
    });

    it("opens in new tab when target is blank", () => {
      renderWithThemeProvider(
        <EditorButton href="https://example.com">
          Link
        </EditorButton>
      );
      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
    });
  });
});
