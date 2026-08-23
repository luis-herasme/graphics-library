import { BufferTarget, BufferUsage, GpuBuffer } from "./gpu-buffer";

export type IndexBufferDescriptor = {
  data: Uint8Array | Uint16Array | Uint32Array | number[];
  usage?: BufferUsage;
};

export class IndexBuffer {
  /** Derived from the typed array holding the indices. */
  readonly elementType: number;
  readonly count: number;
  readonly buffer: GpuBuffer;

  constructor(descriptor: IndexBufferDescriptor) {
    const { usage = BufferUsage.StaticDraw } = descriptor;
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
      target: BufferTarget.ElementArrayBuffer,
      usage,
      bytes: new Uint8Array(
        values.buffer,
        values.byteOffset,
        values.byteLength,
      ),
    });
  }
}
