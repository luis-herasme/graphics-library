import { BufferTarget, BufferUsage, GpuBuffer } from "./gpu-buffer";
import { Renderer } from "./renderer";

export type UniformBufferObjectDescriptor = {
  renderer: Renderer;
  bytes: Uint8Array;
};

export class UniformBufferObject {
  readonly gl: WebGL2RenderingContext;
  bindingPoint: number | null = null;
  readonly buffer: GpuBuffer;

  constructor(descriptor: UniformBufferObjectDescriptor) {
    this.gl = descriptor.renderer.gl;
    this.buffer = new GpuBuffer({
      target: BufferTarget.UniformBuffer,
      usage: BufferUsage.DynamicDraw,
      bytes: descriptor.bytes.slice(),
    });
    this.buffer.upload(this.gl);
  }

  setBindingPoint(bindingPoint: number): void {
    this.bindingPoint = bindingPoint;
    this.gl.bindBufferBase(
      this.gl.UNIFORM_BUFFER,
      bindingPoint,
      this.buffer.getWebGLBuffer(this.gl),
    );
  }

  setBytes(byteOffset: number, data: ArrayBufferView): void {
    this.buffer.setBytes(byteOffset, data);
    this.buffer.upload(this.gl);
  }
}
