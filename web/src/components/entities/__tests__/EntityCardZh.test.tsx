/** The catalog overlay must translate a seeded style preset's card fields. */
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import mockTheme from "../../../__mocks__/themeMock";
import EntityCard from "../EntityCard";
import type { Entity } from "@nodetool-ai/protocol";
import { changeAppLanguage } from "../../../i18n";

const make = (over: Partial<Entity> = {}): Entity =>
  ({
    id: "e1",
    name: "Painted 2D",
    kind: "style",
    descriptor: "Hand-painted 2D game art in gouache.",
    ...over
  }) as Entity;

describe("EntityCard catalog overlay", () => {
  it("translates a seeded preset name, kind, and descriptor in zh", async () => {
    await changeAppLanguage("zh-CN");
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ThemeProvider theme={mockTheme}>
          <EntityCard entity={make()} onEdit={jest.fn()} onRemove={jest.fn()} />
        </ThemeProvider>
      </QueryClientProvider>
    );
    expect(screen.getByText("手绘二维")).toBeInTheDocument();
    expect(screen.getByText("风格")).toBeInTheDocument();
    expect(screen.getByText(/水粉手绘二维游戏美术/)).toBeInTheDocument();
  });
});
