import {
  AttributeData,
  TYPED_ARRAY_FOR_COMPONENT_TYPE,
} from "./attribute-data";
import { BufferKind, BufferUsage, GpuBuffer } from "./gpu-buffer";
import { VertexAttribute, VertexLayout } from "./vertex-layout";

export type VertexBufferDescriptor = {
  /** The attribute name the shader sees. */
  name: string;
  data: AttributeData;
  /** How many instances share one value (0 = a value per vertex). */
  divisor?: number;
  /** Whether integer data is scaled to the [0, 1] range in the shader. */
  normalize?: boolean;
  usage?: BufferUsage;
};

/**
 * A buffer of vertex data stored on the CPU and the GPU, with metadata about
 * how the data should be uploaded to and interpreted by the GPU.
 */
export class VertexBuffer {
  readonly layout: VertexLayout;
  readonly buffer: GpuBuffer;

  constructor(descriptor: VertexBufferDescriptor) {
    const { usage = BufferUsage.StaticDraw } = descriptor;

    this.layout = new VertexLayout(descriptor);
    this.buffer = new GpuBuffer({
      kind: BufferKind.ArrayBuffer,
      usage,
      bytes: descriptor.data.bytes,
    });
  }

  get vertexCount(): number {
    return this.buffer.size / this.layout.stride;
  }

  setVertex(vertexIndex: number, value: ArrayBufferView | number[]): void {
    this.buffer.setBytes(
      vertexIndex * this.layout.stride,
      this.coerceToBytes(value),
    );
  }

  private coerceToBytes(value: ArrayBufferView | number[]): ArrayBufferView {
    if (Array.isArray(value)) {
      const TypedArray =
        TYPED_ARRAY_FOR_COMPONENT_TYPE[this.layout.componentType];
      return new TypedArray(value);
    }

    return value;
  }
}

export type InterleavedVertexBufferDescriptor = {
  attributes: VertexAttribute[];
  usage?: BufferUsage;
};

/** A single GPU buffer holding several vertex attributes interleaved per vertex. */
export class InterleavedVertexBuffer {
  readonly buffer: GpuBuffer;
  readonly layouts: VertexLayout[];

  constructor(descriptor: InterleavedVertexBufferDescriptor) {
    const { attributes, usage = BufferUsage.StaticDraw } = descriptor;

    if (attributes.length === 0) {
      throw new Error(
        "InterleavedVertexBuffer requires at least one attribute",
      );
    }

    this.layouts = VertexLayout.fromAttributes(attributes);

    const bytes = InterleavedVertexBuffer.interleave(
      attributes.map((attribute) => attribute.data),
      this.layouts,
    );

    this.buffer = new GpuBuffer({
      kind: BufferKind.ArrayBuffer,
      usage,
      bytes,
    });
  }

  get vertexCount(): number {
    return this.buffer.size / this.stride;
  }

  get stride(): number {
    return this.layouts[0].stride;
  }

  private static interleave(
    dataArray: AttributeData[],
    layoutArray: VertexLayout[],
  ): Uint8Array {
    const vertexCount = dataArray[0].count;
    const stride = layoutArray[0].stride;

    const interleavedBuffer = new Uint8Array(stride * vertexCount);

    for (let i = 0; i < dataArray.length; i++) {
      const data = dataArray[i];
      const offset = layoutArray[i].offset;
      const vertexSizeInBytes = data.sizeInBytes;

      for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex++) {
        const sourceStart = vertexIndex * vertexSizeInBytes;
        const destinationStart = vertexIndex * stride + offset;

        interleavedBuffer.set(
          data.bytes.subarray(sourceStart, sourceStart + vertexSizeInBytes),
          destinationStart,
        );
      }
    }

    return interleavedBuffer;
  }

  /**
   * Updates a specific vertex attribute for a given vertex index.
   *
   * Returns `true` if the update was successful, `false` if the attribute
   * name was not found in the layout.
   */
  updateVertex(
    name: string,
    vertexIndex: number,
    value: ArrayBufferView,
  ): boolean {
    const byteOffset = this.getVertexByteOffset(name, vertexIndex);

    if (byteOffset === null) {
      return false;
    }

    this.buffer.setBytes(byteOffset, value);
    return true;
  }

  /** Calculates the byte offset inside the buffer for a specific vertex attribute. */
  getVertexByteOffset(
    attributeName: string,
    vertexIndex: number,
  ): number | null {
    for (const layout of this.layouts) {
      if (layout.name !== attributeName) {
        continue;
      }

      return vertexIndex * layout.stride + layout.offset;
    }

    return null;
  }
}
