/**
 * B0 canary (migration condition 9 — B-R9): first jsdom proof that a REAL
 * migrated component (not a hand-written probe) renders through
 * useTranslation in this repo's Jest environment (React 19 + ts-jest CJS +
 * use-sync-external-store shim; previously zero test coverage of the hook).
 *
 * EmptyState is the migrated target form: memo()-wrapped arrow component with
 * the hook as the first statement of the wrapped body. The zh flip assertions
 * mirror lazyZhRefire.test.tsx: the flip must be driven by the languageChanged
 * event reaching the hook — no manual rerender, which would re-evaluate t()
 * against the live instance and mask a broken subscription.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach } from "@jest/globals";
import { ThemeProvider } from "@mui/material/styles";
import { EmptyState } from "../EmptyState";
import { changeAppLanguage, resetI18nForTest } from "../../../i18n";
import mockTheme from "../../../__mocks__/themeMock";

afterEach(async () => {
  await resetI18nForTest();
});

const renderWithTheme = (component: React.ReactElement) =>
  render(<ThemeProvider theme={mockTheme}>{component}</ThemeProvider>);

describe("useTranslation canary — EmptyState (migrated memo component)", () => {
  it("renders English by default (en is the bundled source of truth)", () => {
    renderWithTheme(<EmptyState variant="empty" />);

    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(
      screen.getByText("Get started by creating your first item.")
    ).toBeInTheDocument();
  });

  it("flips to Chinese on changeAppLanguage without remount or manual rerender", async () => {
    renderWithTheme(<EmptyState variant="empty" />);
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();

    await changeAppLanguage("zh-CN");

    // Subscription proof: the still-mounted memoized component re-renders
    // purely from the languageChanged event reaching the hook.
    await waitFor(() => {
      expect(screen.getByText("这里还没有内容")).toBeInTheDocument();
    });
    expect(
      screen.getByText("从创建第一个条目开始。")
    ).toBeInTheDocument();
  });

  it("shows Chinese on a fresh mount while zh-CN is active", async () => {
    await changeAppLanguage("zh-CN");
    renderWithTheme(<EmptyState variant="empty" />);

    expect(screen.getByText("这里还没有内容")).toBeInTheDocument();
    expect(
      screen.getByText("从创建第一个条目开始。")
    ).toBeInTheDocument();
  });
});
