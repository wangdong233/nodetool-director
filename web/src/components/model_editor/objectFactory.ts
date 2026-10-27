import * as THREE from "three";
import { i18n } from "../../i18n";

export type PrimitiveKind =
  | "box"
  | "sphere"
  | "plane"
  | "cylinder"
  | "torus"
  | "cone"
  | "empty"
  | "directionalLight"
  | "pointLight"
  | "spotLight";

export const PRIMITIVE_LABELS = {
  box: "Box",
  sphere: "Sphere",
  plane: "Plane",
  cylinder: "Cylinder",
  torus: "Torus",
  cone: "Cone",
  empty: "Empty",
  directionalLight: "Directional Light",
  pointLight: "Point Light",
  spotLight: "Spot Light"
} satisfies Record<PrimitiveKind, string>;

// MeshPhysicalMaterial (extends MeshStandardMaterial) so the Properties panel
// can expose the full PBR set — clearcoat, transmission, sheen, iridescence, …
const standardMaterial = () =>
  new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xcccccc),
    metalness: 0.1,
    roughness: 0.8
  });

/**
 * Build a fresh Three.js object for the given primitive kind. The caller is
 * responsible for adding it to the scene and giving it a unique name.
 */
export const createPrimitive = (kind: PrimitiveKind): THREE.Object3D => {
  switch (kind) {
    case "box":
      return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), standardMaterial());
    case "sphere":
      return new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 32, 16),
        standardMaterial()
      );
    case "plane": {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(0xcccccc),
          metalness: 0.1,
          roughness: 0.8,
          side: THREE.DoubleSide
        })
      );
      mesh.rotation.x = -Math.PI / 2;
      return mesh;
    }
    case "cylinder":
      return new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
        standardMaterial()
      );
    case "torus":
      return new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.2, 16, 64),
        standardMaterial()
      );
    case "cone":
      return new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 1, 32),
        standardMaterial()
      );
    case "empty":
      return new THREE.Group();
    case "directionalLight": {
      // glTF lights shine down their node's -Z, so the target rides along as a
      // child at (0, 0, -1): the exported direction matches what the editor
      // shows, and the rotate gizmo aims the light.
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(2, 3, 2);
      light.target.position.set(0, 0, -1);
      light.add(light.target);
      light.lookAt(0, 0, 0);
      return light;
    }
    case "pointLight": {
      const light = new THREE.PointLight(0xffffff, 1, 0, 2);
      light.position.set(0, 2, 0);
      return light;
    }
    case "spotLight": {
      // Aimed like the directional light: the target is a child down -Z.
      const light = new THREE.SpotLight(0xffffff, 10, 0, Math.PI / 6, 0.2, 2);
      light.position.set(0, 3, 2);
      light.target.position.set(0, 0, -1);
      light.add(light.target);
      light.lookAt(0, 0, 0);
      return light;
    }
    default:
      return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), standardMaterial());
  }
};

/**
 * Localized display label for a primitive kind (editor:ui.primitive.*).
 * Full-literal switch — dynamic template keys would escape the dead-key guard.
 */
export function primitiveLabel(kind: PrimitiveKind): string {
  switch (kind) {
    case "box": return i18n.t("editor:ui.primitive.box", { defaultValue: PRIMITIVE_LABELS.box });
    case "sphere": return i18n.t("editor:ui.primitive.sphere", { defaultValue: PRIMITIVE_LABELS.sphere });
    case "plane": return i18n.t("editor:ui.primitive.plane", { defaultValue: PRIMITIVE_LABELS.plane });
    case "cylinder": return i18n.t("editor:ui.primitive.cylinder", { defaultValue: PRIMITIVE_LABELS.cylinder });
    case "torus": return i18n.t("editor:ui.primitive.torus", { defaultValue: PRIMITIVE_LABELS.torus });
    case "cone": return i18n.t("editor:ui.primitive.cone", { defaultValue: PRIMITIVE_LABELS.cone });
    case "empty": return i18n.t("editor:ui.primitive.empty", { defaultValue: PRIMITIVE_LABELS.empty });
    case "directionalLight": return i18n.t("editor:ui.primitive.directionalLight", { defaultValue: PRIMITIVE_LABELS.directionalLight });
    case "pointLight": return i18n.t("editor:ui.primitive.pointLight", { defaultValue: PRIMITIVE_LABELS.pointLight });
    case "spotLight": return i18n.t("editor:ui.primitive.spotLight", { defaultValue: PRIMITIVE_LABELS.spotLight });
  }
}
