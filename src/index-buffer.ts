import { BufferGPU, BufferKind, BufferUsage } from "./buffer-gpu";
import { toBytes } from "./utils";

const UNSIGNED_BYTE = WebGL2RenderingContext.UNSIGNED_BYTE;
const UNSIGNED_SHORT = WebGL2RenderingContext.UNSIGNED_SHORT;
const UNSIGNED_INT = WebGL2RenderingContext.UNSIGNED_INT;

export class IndexBuffer {
  readonly kind: number;
  readonly count: number;
  readonly offset: number;
  readonly buffer: BufferGPU;

  private constructor(kind: number, count: number, buffer: BufferGPU) {
    this.kind = kind;
    this.count = count;
    this.offset = 0;
    this.buffer = buffer;
  }

  static fromU8(usage: BufferUsage, data: Uint8Array | number[]): IndexBuffer {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    return new IndexBuffer(
      UNSIGNED_BYTE,
      bytes.length,
      new BufferGPU(BufferKind.ElementArrayBuffer, usage, bytes),
    );
  }

  static fromU16(usage: BufferUsage, data: Uint16Array | number[]): IndexBuffer {
    const values = data instanceof Uint16Array ? data : new Uint16Array(data);
    return new IndexBuffer(
      UNSIGNED_SHORT,
      values.length,
      new BufferGPU(BufferKind.ElementArrayBuffer, usage, toBytes(values)),
    );
  }

  static fromU32(usage: BufferUsage, data: Uint32Array | number[]): IndexBuffer {
    const values = data instanceof Uint32Array ? data : new Uint32Array(data);
    return new IndexBuffer(
      UNSIGNED_INT,
      values.length,
      new BufferGPU(BufferKind.ElementArrayBuffer, usage, toBytes(values)),
    );
  }
}
