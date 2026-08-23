import { BufferGPU, BufferKind, BufferUsage } from "./buffer-gpu";
import { toBytes } from "./utils";

export class IndexBuffer {
  /** The WebGL element type, derived from the typed array holding the indices. */
  readonly kind: number;
  readonly count: number;
  readonly buffer: BufferGPU;

  constructor(
    data: Uint8Array | Uint16Array | Uint32Array | number[],
    usage: BufferUsage = BufferUsage.StaticDraw,
  ) {
    let values = data;

    if (Array.isArray(values)) {
      values = new Uint32Array(values);
    }

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
