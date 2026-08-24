import { BufferUsage, GpuBuffer } from "../gpu/gpu-buffer";

export type IndexElementType =
  | typeof WebGL2RenderingContext.UNSIGNED_INT
  | typeof WebGL2RenderingContext.UNSIGNED_BYTE
  | typeof WebGL2RenderingContext.UNSIGNED_SHORT;

export type IndexBufferDescriptor = {
  data: Uint8Array | Uint16Array | Uint32Array | number[];
  usage?: BufferUsage;
};

export class IndexBuffer {
  /** Derived from the typed array holding the indices. */
  readonly elementType: IndexElementType;
  readonly count: number;
  readonly buffer: GpuBuffer;

  constructor(descriptor: IndexBufferDescriptor) {
    let usage = descriptor.usage;

    if (usage === undefined) {
      usage = WebGL2RenderingContext.STATIC_DRAW;
    }

    let values = descriptor.data;

    if (Array.isArray(values)) {
      values = new Uint32Array(values);
    }

    if (values instanceof Uint8Array) {
      this.elementType = WebGL2RenderingContext.UNSIGNED_BYTE;
    } else if (values instanceof Uint16Array) {
      this.elementType = WebGL2RenderingContext.UNSIGNED_SHORT;
    } else {
      this.elementType = WebGL2RenderingContext.UNSIGNED_INT;
    }

    this.count = values.length;
    this.buffer = new GpuBuffer({
      target: WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER,
      usage,
      bytes: new Uint8Array(
        values.buffer,
        values.byteOffset,
        values.byteLength,
      ),
    });
  }
}
