import { BufferGPU, BufferKind, BufferUsage } from "./buffer-gpu";
import { Renderer } from "./renderer";

const UNIFORM_BUFFER = WebGL2RenderingContext.UNIFORM_BUFFER;

export class UniformBufferObject {
  readonly gl: WebGL2RenderingContext;
  bindingPoint: number | null = null;
  readonly buffer: BufferGPU;

  constructor(renderer: Renderer, bufferCPU: Uint8Array) {
    this.gl = renderer.gl;
    this.buffer = new BufferGPU(BufferKind.UniformBuffer, BufferUsage.DynamicDraw, bufferCPU.slice());
    this.buffer.onBeforeRender(this.gl);
  }

  setBindingPoint(bindingPoint: number): void {
    this.bindingPoint = bindingPoint;
    this.gl.bindBufferBase(UNIFORM_BUFFER, bindingPoint, this.buffer.getBufferGPU(this.gl));
  }

  setBytes(byteOffset: number, data: ArrayBufferView): void {
    this.buffer.setBytes(byteOffset, data);
    this.buffer.onBeforeRender(this.gl);
  }
}
