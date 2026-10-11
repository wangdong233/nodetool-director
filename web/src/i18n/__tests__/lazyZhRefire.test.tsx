/**
 * mig-P1 (B-R1): the lazy-zh re-fire regression test.
 *
 * ensureLanguageLoaded re-runs changeLanguage against the same lng after the
 * addResourceBundle batch. react-i18next's default bindI18nStore:'' does NOT
 * subscribe to store 'added' events, so WITHOUT that re-fire a component that
 * mounted before the lazy zh chunks landed (useTranslation subscriber or raw
 * i18n.t consumer alike) would stay frozen on its English-fallback snapshot.
 *
 * This mirrors the real boot race: a zh-restored session starts with
 * language=zh-CN from localStorage, React mounts while the 13 lazy chunks are
 * still loading (English fallback renders), then the bundles land. The test
 * sets language to zh-CN WITHOUT loading bundles, mounts the subscriber on
 * the fallback, then runs ensureLanguageLoaded and asserts the SAME element
 * flips to Chinese with zero user interaction.
 *
 * Deletion probe (verified at birth, then restored): removing the same-lng
 * changeLanguage re-fire in index.tsx makes the final assertion fail.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach } from "@jest/globals";
import { useTranslation } from "react-i18next";
import { i18n, resetI18nForTest, ensureLanguageLoaded } from "../index";

afterEach(async () => {
  await resetI18nForTest();
});

const Probe = () => {
  const { t } = useTranslation();
  return (
    <span data-testid="probe">
      {t("common:action.cancel", { defaultValue: "Cancel" })}
    </span>
  );
};

describe("lazy zh re-fire reaches useTranslation subscribers", () => {
  it("flips a mounted fallback subscriber once bundles land, without remount", async () => {
    // Boot-race setup: language already zh-CN, bundles NOT loaded.
    await i18n.changeLanguage("zh-CN");

    // NO forced rerender: the flip must be driven purely by the languageChanged
    // event reaching the hook (a manual rerender would re-evaluate t() against
    // the live instance and mask a missing re-fire — caught at birth).
    render(<Probe />);
    // English fallback renders while the lazy chunks are "in flight".
    expect(screen.getByTestId("probe").textContent).toBe("Cancel");

    // The bundles land. The same-lng changeLanguage re-fire inside
    // ensureLanguageLoaded is what must drive the mounted subscriber.
    await ensureLanguageLoaded("zh-CN");

    await waitFor(() => {
      expect(screen.getByTestId("probe").textContent).toBe("取消");
    });
  });
});
