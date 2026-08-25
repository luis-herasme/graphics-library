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
 * A buffer of raw bytes. The buffer holds the CPU copy and knows how to create
 * and refill a GPU copy, but a renderer owns the GPU copy.
 */
export class GpuBuffer {
  readonly target: BufferTarget;
  readonly usage: BufferUsage;

  private bytes: Uint8Array;
  private currentVersion = 0;

  constructor(descriptor: GpuBufferDescriptor) {
    this.target = descriptor.target;
    this.usage = descriptor.usage;
    this.bytes = descriptor.bytes;
  }

  /** Counts every CPU-side change; a renderer re-uploads when its copy is behind. */
  get version(): number {
    return this.currentVersion;
  }

  createWebGLBuffer(gl: WebGL2RenderingContext): WebGLBuffer {
    const webglBuffer = gl.createBuffer();

    if (webglBuffer === null) {
      throw new Error("Failed to create WebGL buffer");
    }

    gl.bindBuffer(this.target, webglBuffer);
    gl.bufferData(this.target, this.bytes, this.usage);
    return webglBuffer;
  }

  uploadTo(gl: WebGL2RenderingContext, webglBuffer: WebGLBuffer): void {
    gl.bindBuffer(this.target, webglBuffer);
    gl.bufferSubData(this.target, 0, this.bytes);
  }

  /** Overwrites part of the CPU buffer. A renderer re-uploads on the next draw. */
  setBytes(byteOffset: number, value: ArrayBufferView): void {
    this.bytes.set(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
      byteOffset,
    );
    this.currentVersion += 1;
  }

  get size(): number {
    return this.bytes.byteLength;
  }
}
