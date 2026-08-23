
export enum BufferKind {
  ArrayBuffer = WebGL2RenderingContext.ARRAY_BUFFER,
  ElementArrayBuffer = WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER,
  UniformBuffer = WebGL2RenderingContext.UNIFORM_BUFFER,
}

export enum BufferUsage {
  StaticDraw = WebGL2RenderingContext.STATIC_DRAW,
  DynamicDraw = WebGL2RenderingContext.DYNAMIC_DRAW,
}

/**
 * A buffer of raw bytes mirrored on the CPU and the GPU. The GPU copy is
 * created lazily and re-uploaded before rendering whenever the CPU copy changed.
 */
export class BufferGPU {
  readonly kind: BufferKind;
  readonly usage: BufferUsage;

  private bufferCPU: Uint8Array;
  private bufferGPU: WebGLBuffer | null = null;
  private needsUpdate = false;

  constructor(kind: BufferKind, usage: BufferUsage, bufferCPU: Uint8Array) {
    this.kind = kind;
    this.usage = usage;
    this.bufferCPU = bufferCPU;
  }

  getBufferGPU(gl: WebGL2RenderingContext): WebGLBuffer {
    if (this.bufferGPU === null) {
      this.createBufferGPU(gl);
    }

    return this.bufferGPU!;
  }

  private createBufferGPU(gl: WebGL2RenderingContext): void {
    const webglBuffer = gl.createBuffer();

    if (webglBuffer === null) {
      throw new Error("Failed to create WebGL buffer");
    }

    gl.bindBuffer(this.kind, webglBuffer);
    gl.bufferData(this.kind, this.bufferCPU, this.usage);
    this.bufferGPU = webglBuffer;
  }

  /** Overwrites part of the CPU buffer. The GPU buffer is updated on the next render. */
  setBytes(byteOffset: number, value: ArrayBufferView): void {
    this.bufferCPU.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength), byteOffset);
    this.needsUpdate = true;
  }

  onBeforeRender(gl: WebGL2RenderingContext): void {
    if (this.bufferGPU === null) {
      this.createBufferGPU(gl);
    }

    if (!this.needsUpdate) {
      return;
    }

    this.updateBufferGPU(gl);
    this.needsUpdate = false;
  }

  private updateBufferGPU(gl: WebGL2RenderingContext): void {
    gl.bindBuffer(this.kind, this.bufferGPU);
    gl.bufferSubData(this.kind, 0, this.bufferCPU);
  }

  bind(gl: WebGL2RenderingContext): void {
    gl.bindBuffer(this.kind, this.bufferGPU);
  }

  get size(): number {
    return this.bufferCPU.byteLength;
  }
}
