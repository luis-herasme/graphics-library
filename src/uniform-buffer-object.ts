import { BufferGPU, BufferKind, BufferUsage } from "./buffer-gpu";
import { Renderer } from "./renderer";

const UNIFORM_BUFFER = WebGL2RenderingContext.UNIFORM_BUFFER;

export type UniformBufferObjectDescriptor = {
  renderer: Renderer;
  bufferCPU: Uint8Array;
};

export class UniformBufferObject {
  readonly gl: WebGL2RenderingContext;
  bindingPoint: number | null = null;
  readonly buffer: BufferGPU;

  constructor(descriptor: UniformBufferObjectDescriptor) {
    this.gl = descriptor.renderer.gl;
    this.buffer = new BufferGPU({
      kind: BufferKind.UniformBuffer,
      usage: BufferUsage.DynamicDraw,
      bufferCPU: descriptor.bufferCPU.slice(),
    });
    this.buffer.onBeforeRender(this.gl);
  }

  setBindingPoint(bindingPoint: number): void {
    this.bindingPoint = bindingPoint;
    this.gl.bindBufferBase(
      UNIFORM_BUFFER,
      bindingPoint,
      this.buffer.getBufferGPU(this.gl),
    );
  }

  setBytes(byteOffset: number, data: ArrayBufferView): void {
    this.buffer.setBytes(byteOffset, data);
    this.buffer.onBeforeRender(this.gl);
  }
}
