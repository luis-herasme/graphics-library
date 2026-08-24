import { IndexBuffer } from "./index-buffer";
import { VertexBuffer } from "./vertex-buffer";

export type GeometryDescriptor = {
  vertexCount: number;
  instanceCount?: number | null;
  indices?: IndexBuffer | null;
  vertexBuffers?: VertexBuffer[];
};

export class Geometry {
  vertexCount: number;
  instanceCount: number | null;
  indices: IndexBuffer | null;
  vertexBuffers: VertexBuffer[];

  constructor(descriptor: GeometryDescriptor) {
    this.vertexCount = descriptor.vertexCount;
    this.instanceCount = null;
    this.indices = null;
    this.vertexBuffers = [];

    if (descriptor.instanceCount !== undefined) {
      this.instanceCount = descriptor.instanceCount;
    }

    if (descriptor.indices !== undefined) {
      this.indices = descriptor.indices;
    }

    if (descriptor.vertexBuffers !== undefined) {
      this.vertexBuffers = descriptor.vertexBuffers;
    }
  }

  /** Overwrites one vertex of one attribute. The change reaches the GPU before the next draw. */
  setVertex(
    attributeName: string,
    vertexIndex: number,
    values: ArrayBufferView | number[],
  ): void {
    for (const vertexBuffer of this.vertexBuffers) {
      for (const attribute of vertexBuffer.attributes) {
        if (attribute.name === attributeName) {
          vertexBuffer.setVertex(attribute, vertexIndex, values);
          return;
        }
      }
    }

    throw new Error(`This geometry has no attribute named "${attributeName}"`);
  }
}
