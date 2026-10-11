/**
 * @jest-environment jsdom
 *
 * Step 1 of the image flow: the inspiration chips. The chip's display text IS
 * the brief it writes (显示即所发), so the localized label and the inserted
 * text cannot diverge.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import mockTheme from "../../../../__mocks__/themeMock";
import { changeAppLanguage } from "../../../../i18n";
import { useSketchStore } from "../../../sketch/state/useSketchStore";
import { createDefaultDocument } from "../../../sketch/types";
import { IdeaStep } from "../IdeaStep";
import type { UploadFirstLayerResult } from "../../../../hooks/sketch/useUploadFirstLayer";

jest.mock("../../../../hooks/useResolvedMediaUri");
jest.mock("../../../../serverState/useEntities", () => ({
  useEntities: () => ({ data: [] })
}));
// The model picker is not what these tests exercise.
jest.mock("../BriefModelSelect", () => ({
  __esModule: true,
  default: () => null
}));

const upload: UploadFirstLayerResult = {
  uploadFirstLayer: jest.fn(),
  uploading: false,
  error: null,
  clearError: jest.fn(),
  cancel: jest.fn()
};

const renderStep = () =>
  render(
    <ThemeProvider theme={mockTheme}>
      <IdeaStep onStartBlank={jest.fn()} upload={upload} />
    </ThemeProvider>
  );

const briefNow = () => useSketchStore.getState().document.setup?.brief ?? "";

beforeEach(() => {
  useSketchStore.getState().setDocument(createDefaultDocument(1024, 1024));
});

afterEach(async () => {
  await changeAppLanguage("en");
});

describe("image IdeaStep examples", () => {
  it("fills the brief from an inspiration chip", async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(
      screen.getByRole("button", { name: /pour-over coffee dripper/ })
    );

    expect(briefNow()).toBe(
      "A ceramic pour-over coffee dripper on a sunlit kitchen counter"
    );
  });

  it("inserts the same localized text a chip shows (zh)", async () => {
    await changeAppLanguage("zh-CN");
    const user = userEvent.setup();
    renderStep();

    const zh = "阳光洒落的厨房台面上，一只陶瓷手冲咖啡滤杯";
    const chip = await screen.findByText(zh);
    await user.click(chip);

    expect(briefNow()).toBe(zh);
  });
});
