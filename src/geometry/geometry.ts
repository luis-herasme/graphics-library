import { IndexBuffer } from "./index-buffer";
import { VertexBuffer } from "./vertex-buffer";

export type GeometryDescriptor = {
  vertexCount: number;
  indices?: IndexBuffer;
  instanceCount?: number;
  vertexBuffers?: VertexBuffer[];
};

export class Geometry {
  vertexCount: number;
  /** Null when drawn without an index buffer. */
  indices: IndexBuffer | null;
  /** Null when drawn without instancing. */
  instanceCount: number | null;
  vertexBuffers: VertexBuffer[];

  constructor(descriptor: GeometryDescriptor) {
    this.vertexCount = descriptor.vertexCount;
    this.indices = null;
    this.instanceCount = null;
    this.vertexBuffers = [];

    if (descriptor.indices !== undefined) {
      this.indices = descriptor.indices;
    }

    if (descriptor.instanceCount !== undefined) {
      this.instanceCount = descriptor.instanceCount;
    }

    if (descriptor.vertexBuffers !== undefined) {
      this.vertexBuffers = descriptor.vertexBuffers;
    }
  }

  /** Overwrites one vertex of one attribute. The change reaches the GPU before the next draw. */
  setVertex(
    attributeName: string,
    vertexIndex: number,
    values: ArrayBufferView,
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
