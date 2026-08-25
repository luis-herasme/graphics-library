export type BufferTarget =
  | typeof WebGL2RenderingContext.ARRAY_BUFFER
  | typeof WebGL2RenderingContext.UNIFORM_BUFFER
  | typeof WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER;

export type BufferUsage =
  | typeof WebGL2RenderingContext.STATIC_DRAW
  | typeof WebGL2RenderingContext.DYNAMIC_DRAW;

export type GpuBufferDescriptor = {
  target: BufferTarget;
  usage: BufferUsage;
  bytes: Uint8Array;
};

/**
 * A buffer of raw bytes mirrored on the CPU and the GPU. The GPU copy is
 * created lazily and re-uploaded before rendering whenever the CPU copy changed.
 */
export class GpuBuffer {
  readonly target: BufferTarget;
  readonly usage: BufferUsage;

  private bytes: Uint8Array;
  private webglBuffer: WebGLBuffer | null = null;
  private needsUpdate = false;

  constructor(descriptor: GpuBufferDescriptor) {
    this.target = descriptor.target;
    this.usage = descriptor.usage;
    this.bytes = descriptor.bytes;
  }

  getWebGLBuffer(gl: WebGL2RenderingContext): WebGLBuffer {
    if (this.webglBuffer === null) {
      this.webglBuffer = this.createWebGLBuffer(gl);
    }

    return this.webglBuffer;
  }

  private createWebGLBuffer(gl: WebGL2RenderingContext): WebGLBuffer {
    const webglBuffer = gl.createBuffer();

    if (webglBuffer === null) {
      throw new Error("Failed to create WebGL buffer");
    }

    gl.bindBuffer(this.target, webglBuffer);
    gl.bufferData(this.target, this.bytes, this.usage);
    return webglBuffer;
  }

  /** Overwrites part of the CPU buffer. The GPU buffer is updated on the next render. */
  setBytes(byteOffset: number, value: ArrayBufferView): void {
    this.bytes.set(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
      byteOffset,
    );
    this.needsUpdate = true;
  }

  /** Creates the GPU buffer on the first call, then re-uploads only when the bytes changed. */
  upload(gl: WebGL2RenderingContext): void {
    const webglBuffer = this.getWebGLBuffer(gl);

    if (!this.needsUpdate) {
      return;
    }

    gl.bindBuffer(this.target, webglBuffer);
    gl.bufferSubData(this.target, 0, this.bytes);
    this.needsUpdate = false;
  }

  bind(gl: WebGL2RenderingContext): void {
    gl.bindBuffer(this.target, this.getWebGLBuffer(gl));
  }

  /** Frees the GPU buffer. The CPU copy stays, so the next use recreates it. */
  delete(gl: WebGL2RenderingContext): void {
    if (this.webglBuffer !== null) {
      gl.deleteBuffer(this.webglBuffer);
      this.webglBuffer = null;
    }
  }

  get size(): number {
    return this.bytes.byteLength;
  }
}
