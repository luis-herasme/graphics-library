import { Geometry } from "../geometry/geometry";
import { Material } from "./material";
import { Transform3D } from "../math";

/** https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/drawArraysInstanced#mode */
export type RenderPrimitive =
  | typeof WebGL2RenderingContext.POINTS
  | typeof WebGL2RenderingContext.LINES
  | typeof WebGL2RenderingContext.LINE_LOOP
  | typeof WebGL2RenderingContext.LINE_STRIP
  | typeof WebGL2RenderingContext.TRIANGLES
  | typeof WebGL2RenderingContext.TRIANGLE_STRIP
  | typeof WebGL2RenderingContext.TRIANGLE_FAN;

export type MeshDescriptor = {
  geometry: Geometry;
  material: Material;
};

export class Mesh {
  transform = new Transform3D();
  // The renderer builds the mesh's vertex array object from this pair, so
  // swapping either one means making a new mesh.
  readonly geometry: Geometry;
  readonly material: Material;
  renderPrimitive: RenderPrimitive = WebGL2RenderingContext.TRIANGLES;

  constructor(descriptor: MeshDescriptor) {
    this.geometry = descriptor.geometry;
    this.material = descriptor.material;
  }
}
