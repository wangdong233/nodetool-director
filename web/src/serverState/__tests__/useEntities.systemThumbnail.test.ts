/**
 * The display ref a seeded system entity carries. The seeder writes marker
 * rows with no stored bytes, so the synthesized `asset://` ref points at a
 * `get_url` that 404s; the marker's `package://` thumbnail is the tile art.
 */
import { assetToEntity, systemPresetAssetInfo } from "../useEntities";
import type { Asset } from "../../stores/ApiTypes";

const baseAsset = {
  id: "cfcb1c08e67e95a530e2c137e9052d31",
  user_id: "1",
  name: "Painted 2D",
  content_type: "image/jpeg",
  parent_id: "1",
  project_id: "default",
  created_at: "2026-09-30T08:53:29.606Z"
};

const systemMarker = {
  kind: "style",
  name: "Painted 2D",
  descriptor: "Hand-painted 2D game art.",
  system: true,
  preset_id: "painted-2d",
  thumbnail: "package://nodetool-base/styles/game-painted-2d.png"
};

const make = (
  metadata: Asset["metadata"]
): Asset => ({ ...baseAsset, metadata }) as Asset;

describe("assetToEntity system-entity thumbnail", () => {
  it("uses the marker's package thumbnail for a seeded system entity", () => {
    const entity = assetToEntity(
      make({ nodetool_entity: systemMarker })
    );
    expect(entity?.reference_images?.[0]).toEqual({
      type: "image",
      uri: "package://nodetool-base/styles/game-painted-2d.png"
    });
  });

  it("keeps the asset ref for an ordinary entity", () => {
    const entity = assetToEntity(
      make({
        nodetool_entity: {
          kind: "character",
          name: "Mara",
          descriptor: "A tall woman with red hair."
        }
      })
    );
    expect(entity?.reference_images?.[0]).toEqual({
      type: "image",
      uri: `asset://${baseAsset.id}`,
      asset_id: baseAsset.id
    });
  });

  it("keeps the asset ref when a system marker carries no thumbnail", () => {
    const entity = assetToEntity(
      make({
        nodetool_entity: { ...systemMarker, thumbnail: "" }
      })
    );
    expect(entity?.reference_images?.[0]?.asset_id).toBe(baseAsset.id);
  });

  it("keeps a swapped reference asset even on a system entity", () => {
    const entity = assetToEntity(
      make({
        nodetool_entity: {
          ...systemMarker,
          reference_asset_id: "a8472a47faa84c989e45089b5789d9df"
        }
      })
    );
    expect(entity?.reference_images?.[0]?.asset_id).toBe(
      "a8472a47faa84c989e45089b5789d9df"
    );
  });
});

describe("systemPresetAssetInfo (raw asset-row surfaces)", () => {
  it("exposes the seeded name and package thumbnail for a system row", () => {
    const info = systemPresetAssetInfo(make({ nodetool_entity: systemMarker }));
    expect(info).toEqual({
      name: "Painted 2D",
      thumbnail: "package://nodetool-base/styles/game-painted-2d.png"
    });
  });

  it("returns null for an ordinary (non-system) entity row", () => {
    expect(
      systemPresetAssetInfo(
        make({
          nodetool_entity: {
            kind: "style",
            name: "Mara",
            descriptor: "A tall woman with red hair."
          }
        })
      )
    ).toBeNull();
  });

  it("returns null for an unmarked asset", () => {
    expect(systemPresetAssetInfo(make(undefined))).toBeNull();
  });

  it("drops the thumbnail once the picture is swapped, keeps the name", () => {
    const info = systemPresetAssetInfo(
      make({
        nodetool_entity: {
          ...systemMarker,
          reference_asset_id: "a8472a47faa84c989e45089b5789d9df"
        }
      })
    );
    expect(info?.name).toBe("Painted 2D");
    expect(info?.thumbnail).toBeUndefined();
  });
});
