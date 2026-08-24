import { BufferTarget, BufferUsage, GpuBuffer } from "./gpu-buffer";

export type UniformBufferObjectDescriptor = {
  bytes: Uint8Array;
};

/**
 * A buffer for a shader uniform block. Like every other GPU resource, it is
 * created lazily and re-uploaded before the next draw when its bytes changed.
 * Attach it to a material with `material.setUniformBlock(name, ...)`.
 */
export class UniformBufferObject {
  readonly buffer: GpuBuffer;

  constructor(descriptor: UniformBufferObjectDescriptor) {
    this.buffer = new GpuBuffer({
      target: BufferTarget.UniformBuffer,
      usage: BufferUsage.DynamicDraw,
      bytes: descriptor.bytes.slice(),
    });
  }

  /** Overwrites part of the CPU copy. The GPU copy is updated before the next draw. */
  setBytes(byteOffset: number, data: ArrayBufferView): void {
    this.buffer.setBytes(byteOffset, data);
  }

  /** Uploads pending changes and attaches the buffer to a binding point. */
  bind(gl: WebGL2RenderingContext, bindingPoint: number): void {
    this.buffer.upload(gl);
    gl.bindBufferBase(
      gl.UNIFORM_BUFFER,
      bindingPoint,
      this.buffer.getWebGLBuffer(gl),
    );
  }
}
