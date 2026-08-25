import { GpuBuffer } from "./gpu-buffer";

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
      target: WebGL2RenderingContext.UNIFORM_BUFFER,
      usage: WebGL2RenderingContext.DYNAMIC_DRAW,
      bytes: descriptor.bytes.slice(),
    });
  }

  /** Overwrites part of the CPU copy. The GPU copy is updated before the next draw. */
  setBytes(byteOffset: number, data: ArrayBufferView): void {
    this.buffer.setBytes(byteOffset, data);
  }

  /** Frees the GPU buffer. The CPU copy stays, so the next draw recreates it. */
  delete(gl: WebGL2RenderingContext): void {
    this.buffer.delete(gl);
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
