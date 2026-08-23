import { BufferGPU, BufferKind, BufferUsage } from "./buffer-gpu";
import { toBytes } from "./utils";

export class IndexBuffer {
  /** The WebGL element type, derived from the typed array holding the indices. */
  readonly kind: number;
  readonly count: number;
  readonly offset = 0;
  readonly buffer: BufferGPU;

  constructor(
    data: Uint8Array | Uint16Array | Uint32Array | number[],
    usage: BufferUsage = BufferUsage.StaticDraw,
  ) {
    const values = Array.isArray(data) ? new Uint32Array(data) : data;

    if (values instanceof Uint8Array) {
      this.kind = WebGL2RenderingContext.UNSIGNED_BYTE;
    } else if (values instanceof Uint16Array) {
      this.kind = WebGL2RenderingContext.UNSIGNED_SHORT;
    } else {
      this.kind = WebGL2RenderingContext.UNSIGNED_INT;
    }

    this.count = values.length;
    this.buffer = new BufferGPU(BufferKind.ElementArrayBuffer, usage, toBytes(values));
  }
}
