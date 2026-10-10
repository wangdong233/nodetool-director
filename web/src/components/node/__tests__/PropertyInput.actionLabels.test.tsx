import { render, screen } from "@testing-library/react";
import { FC } from "react";
import { ThemeProvider } from "@mui/material/styles";

import mockTheme from "../../../__mocks__/themeMock";
import { NodeProvider } from "../../../contexts/NodeContext";
import { createNodeStore } from "../../../stores/NodeStore";
import type { NodeData } from "../../../stores/NodeData";
import PropertyInput from "../PropertyInput";
import { changeAppLanguage, resetI18nForTest } from "../../../i18n";

// The typed input control is irrelevant to the action icons under test.
jest.mock("../PropertyInput.resolver", () => ({
  __esModule: true,
  getComponentForProperty: () => () => null
}));

jest.mock("../../../stores/ContextMenuStore", () => ({
  __esModule: true,
  default: <T,>(selector: (state: { openContextMenu: jest.Mock }) => T) =>
    selector({ openContextMenu: jest.fn() }),
  useContextMenuActions: () => ({
    openContextMenu: jest.fn(),
    closeContextMenu: jest.fn()
  })
}));

const data: NodeData = {
  workflow_id: "wf1",
  properties: {},
  selectable: true,
  dynamic_properties: { videoA: null }
};

const Harness: FC = () => (
  <ThemeProvider theme={mockTheme}>
    <NodeProvider createStore={() => createNodeStore()}>
      <PropertyInput
        id="node1"
        nodeType="nodetool.logic.Invoke"
        data={data}
        value={null}
        property={{ name: "videoA", type: { type: "any" } } as never}
        isDynamicProperty
      />
    </NodeProvider>
  </ThemeProvider>
);

describe("PropertyInput dynamic-slot action labels (r32)", () => {
  afterEach(async () => {
    await resetI18nForTest();
  });

  it("labels the rename/delete icon buttons in English by default", () => {
    render(<Harness />);
    expect(
      screen.getByRole("button", { name: "Rename videoA" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete videoA" })
    ).toBeInTheDocument();
  });

  it("localizes both labels once the language switches to zh-CN", async () => {
    render(<Harness />);
    await changeAppLanguage("zh-CN");
    expect(
      screen.getByRole("button", { name: "重命名 videoA" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "删除 videoA" })
    ).toBeInTheDocument();
  });
});
