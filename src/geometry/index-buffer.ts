import { BufferUsage, GpuBuffer } from "../gpu/gpu-buffer";

export type IndexElementType =
  | typeof WebGL2RenderingContext.UNSIGNED_INT
  | typeof WebGL2RenderingContext.UNSIGNED_BYTE
  | typeof WebGL2RenderingContext.UNSIGNED_SHORT;

export type IndexBufferDescriptor = {
  data: Uint8Array | Uint16Array | Uint32Array;
  usage?: BufferUsage;
};

export class IndexBuffer {
  readonly count: number;
  readonly buffer: GpuBuffer;
  readonly elementType: IndexElementType;

  constructor(descriptor: IndexBufferDescriptor) {
    let usage = descriptor.usage;

    if (usage === undefined) {
      usage = WebGL2RenderingContext.STATIC_DRAW;
    }

    const values = descriptor.data;

    if (values instanceof Uint32Array) {
      this.elementType = WebGL2RenderingContext.UNSIGNED_INT;
    } else if (values instanceof Uint8Array) {
      this.elementType = WebGL2RenderingContext.UNSIGNED_BYTE;
    } else {
      this.elementType = WebGL2RenderingContext.UNSIGNED_SHORT;
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
