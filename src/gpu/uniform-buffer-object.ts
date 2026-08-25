import { GpuBuffer } from "./gpu-buffer";

export type UniformBufferObjectDescriptor = {
  bytes: Uint8Array;
};

/**
 * A buffer for a shader uniform block. The renderer uploads and binds it
 * during a draw. Attach it to a material with
 * `material.setUniformBlock(name, ...)`.
 */
export class UniformBufferObject {
  readonly buffer: GpuBuffer;

  constructor(descriptor: UniformBufferObjectDescriptor) {
    this.buffer = new GpuBuffer({
      target: WebGL2RenderingContext.UNIFORM_BUFFER,
      usage: WebGL2RenderingContext.DYNAMIC_DRAW,
      bytes: descriptor.bytes.slice(),
    });
  }

  /** Overwrites part of the CPU copy. The GPU copy is updated before the next draw. */
  setBytes(byteOffset: number, data: ArrayBufferView): void {
    this.buffer.setBytes(byteOffset, data);
  }
}
