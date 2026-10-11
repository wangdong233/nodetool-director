/**
 * A seeded system entity's card shows the marker's package thumbnail: the
 * seeder stores no bytes, so the ref the library maps is the `package://` tile
 * art, and the card must render it through the package-asset URL path rather
 * than a broken `asset://` image.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import mockTheme from "../../../__mocks__/themeMock";
import EntityCard from "../EntityCard";
import type { Entity } from "@nodetool-ai/protocol";

// The real image ladder renders ImageView's hover actions, whose asset hooks
// read the auth store; a logged-in user keeps them on their happy path.
jest.mock("../../../stores/useAuth", () => ({
  __esModule: true,
  default: (selector: (state: { user: { id: string } }) => unknown) =>
    selector({ user: { id: "u1" } })
}));

const seededStyle: Entity = {
  type: "entity",
  id: "cfcb1c08e67e95a530e2c137e9052d31",
  kind: "style",
  name: "Painted 2D",
  descriptor: "Hand-painted 2D game art in gouache.",
  reference_images: [
    { type: "image", uri: "package://nodetool-base/styles/game-painted-2d.png" }
  ]
};

const renderCard = (entity: Entity) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={mockTheme}>
        <MemoryRouter>
          <EntityCard entity={entity} />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe("EntityCard seeded-system-entity thumbnail", () => {
  it("renders the package thumbnail through the package-asset URL path", async () => {
    renderCard(seededStyle);
    const img = await waitFor(() => screen.getByRole("img"));
    // `BASE_URL` prefixes the path per environment; the path is the contract.
    expect(new URL(img.getAttribute("src") as string).pathname).toBe(
      "/api/assets/packages/nodetool-base/styles/game-painted-2d.png"
    );
  });

  it("shows the no-image placeholder when the ref carries no image", () => {
    renderCard({ ...seededStyle, reference_images: [] });
    expect(screen.getByText("No image")).toBeInTheDocument();
  });
});
