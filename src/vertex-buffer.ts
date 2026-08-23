import { BufferGPU, BufferKind, BufferUsage } from "./buffer-gpu";
import { toBytes } from "./utils";

export enum VertexComponentType {
  Byte = WebGL2RenderingContext.BYTE,
  UnsignedByte = WebGL2RenderingContext.UNSIGNED_BYTE,
  Short = WebGL2RenderingContext.SHORT,
  UnsignedShort = WebGL2RenderingContext.UNSIGNED_SHORT,
  Int = WebGL2RenderingContext.INT,
  UnsignedInt = WebGL2RenderingContext.UNSIGNED_INT,
  Float = WebGL2RenderingContext.FLOAT,
}

export function componentTypeSizeInBytes(
  componentType: VertexComponentType,
): number {
  switch (componentType) {
    case VertexComponentType.Byte:
    case VertexComponentType.UnsignedByte:
      return 1;
    case VertexComponentType.Short:
    case VertexComponentType.UnsignedShort:
      return 2;
    case VertexComponentType.Int:
    case VertexComponentType.UnsignedInt:
    case VertexComponentType.Float:
      return 4;
  }
}

type TypedArrayConstructor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor;

const TYPED_ARRAY_FOR_COMPONENT_TYPE: Record<
  VertexComponentType,
  TypedArrayConstructor
> = {
  [VertexComponentType.Byte]: Int8Array,
  [VertexComponentType.UnsignedByte]: Uint8Array,
  [VertexComponentType.Short]: Int16Array,
  [VertexComponentType.UnsignedShort]: Uint16Array,
  [VertexComponentType.Int]: Int32Array,
  [VertexComponentType.UnsignedInt]: Uint32Array,
  [VertexComponentType.Float]: Float32Array,
};

/**
 * Accepted input for vertex data: a flat list of numbers (or typed array),
 * nested arrays (one entry per vertex, e.g. `[[x, y, z], ...]`), or objects
 * with a `toArray()` method (e.g. Vector2, Vector3, Matrix3, Transform2D).
 */
export type DataInput = ArrayLike<number> | readonly DataInputElement[];

type DataInputElement =
  | number
  | ArrayLike<number>
  | readonly DataInputElement[]
  | { toArray(): ArrayLike<number> };

function flattenInto(
  output: number[],
  value: DataInput | DataInputElement,
): void {
  if (typeof value === "number") {
    output.push(value);
    return;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toArray" in value &&
    typeof value.toArray === "function"
  ) {
    flattenInto(output, value.toArray());
    return;
  }

  const arrayLike = value as ArrayLike<DataInputElement>;
  for (let i = 0; i < arrayLike.length; i++) {
    flattenInto(output, arrayLike[i]);
  }
}

/** Raw data for a single vertex attribute, along with how the GPU should interpret it. */
export class Data {
  readonly componentType: VertexComponentType;
  /** Components per vertex (e.g. 3 for a vec3, 9 for a mat3). */
  readonly componentCount: number;
  /** Only matrices have more than one column. */
  readonly numberOfColumns: number;
  readonly bytes: Uint8Array;
  /** Number of vertices in the data. */
  readonly count: number;

  private constructor(
    componentType: VertexComponentType,
    componentCount: number,
    numberOfColumns: number,
    input: DataInput,
  ) {
    const flattened: number[] = [];
    flattenInto(flattened, input);

    if (flattened.length % componentCount !== 0) {
      throw new Error(
        `Vertex data length (${flattened.length}) is not a multiple of the component count (${componentCount})`,
      );
    }

    const TypedArray = TYPED_ARRAY_FOR_COMPONENT_TYPE[componentType];

    this.componentType = componentType;
    this.componentCount = componentCount;
    this.numberOfColumns = numberOfColumns;
    this.bytes = toBytes(new TypedArray(flattened));
    this.count = flattened.length / componentCount;
  }

  static byte(data: DataInput): Data {
    return new Data(VertexComponentType.Byte, 1, 1, data);
  }
  static byteVector2(data: DataInput): Data {
    return new Data(VertexComponentType.Byte, 2, 1, data);
  }
  static byteVector3(data: DataInput): Data {
    return new Data(VertexComponentType.Byte, 3, 1, data);
  }
  static byteVector4(data: DataInput): Data {
    return new Data(VertexComponentType.Byte, 4, 1, data);
  }

  static unsignedByte(data: DataInput): Data {
    return new Data(VertexComponentType.UnsignedByte, 1, 1, data);
  }
  static unsignedByteVector2(data: DataInput): Data {
    return new Data(VertexComponentType.UnsignedByte, 2, 1, data);
  }
  static unsignedByteVector3(data: DataInput): Data {
    return new Data(VertexComponentType.UnsignedByte, 3, 1, data);
  }
  static unsignedByteVector4(data: DataInput): Data {
    return new Data(VertexComponentType.UnsignedByte, 4, 1, data);
  }

  static short(data: DataInput): Data {
    return new Data(VertexComponentType.Short, 1, 1, data);
  }
  static shortVector2(data: DataInput): Data {
    return new Data(VertexComponentType.Short, 2, 1, data);
  }
  static shortVector3(data: DataInput): Data {
    return new Data(VertexComponentType.Short, 3, 1, data);
  }
  static shortVector4(data: DataInput): Data {
    return new Data(VertexComponentType.Short, 4, 1, data);
  }

  static unsignedShort(data: DataInput): Data {
    return new Data(VertexComponentType.UnsignedShort, 1, 1, data);
  }
  static unsignedShortVector2(data: DataInput): Data {
    return new Data(VertexComponentType.UnsignedShort, 2, 1, data);
  }
  static unsignedShortVector3(data: DataInput): Data {
    return new Data(VertexComponentType.UnsignedShort, 3, 1, data);
  }
  static unsignedShortVector4(data: DataInput): Data {
    return new Data(VertexComponentType.UnsignedShort, 4, 1, data);
  }

  static int(data: DataInput): Data {
    return new Data(VertexComponentType.Int, 1, 1, data);
  }
  static intVector2(data: DataInput): Data {
    return new Data(VertexComponentType.Int, 2, 1, data);
  }
  static intVector3(data: DataInput): Data {
    return new Data(VertexComponentType.Int, 3, 1, data);
  }
  static intVector4(data: DataInput): Data {
    return new Data(VertexComponentType.Int, 4, 1, data);
  }

  static unsignedInt(data: DataInput): Data {
    return new Data(VertexComponentType.UnsignedInt, 1, 1, data);
  }
  static unsignedIntVector2(data: DataInput): Data {
    return new Data(VertexComponentType.UnsignedInt, 2, 1, data);
  }
  static unsignedIntVector3(data: DataInput): Data {
    return new Data(VertexComponentType.UnsignedInt, 3, 1, data);
  }
  static unsignedIntVector4(data: DataInput): Data {
    return new Data(VertexComponentType.UnsignedInt, 4, 1, data);
  }

  static float(data: DataInput): Data {
    return new Data(VertexComponentType.Float, 1, 1, data);
  }
  static vector2(data: DataInput): Data {
    return new Data(VertexComponentType.Float, 2, 1, data);
  }
  static vector3(data: DataInput): Data {
    return new Data(VertexComponentType.Float, 3, 1, data);
  }
  static vector4(data: DataInput): Data {
    return new Data(VertexComponentType.Float, 4, 1, data);
  }

  static matrix2(data: DataInput): Data {
    return new Data(VertexComponentType.Float, 4, 2, data);
  }
  static matrix3(data: DataInput): Data {
    return new Data(VertexComponentType.Float, 9, 3, data);
  }
  static matrix4(data: DataInput): Data {
    return new Data(VertexComponentType.Float, 16, 4, data);
  }

  /** The size of one vertex worth of data, in bytes. */
  get sizeInBytes(): number {
    return this.componentCount * componentTypeSizeInBytes(this.componentType);
  }
}

/** One vertex attribute: the name the shader sees, its raw data, and optional settings. */
export interface VertexAttribute {
  name: string;
  data: Data;
  /** How many instances share one value (0 = a value per vertex). */
  divisor?: number;
  /** Whether integer data is scaled to the [0, 1] range in the shader. */
  normalize?: boolean;
}

/** Describes how the bytes of a buffer map to a single vertex attribute. */
export class VertexLayout {
  name: string;
  componentCount: number;
  componentType: VertexComponentType;
  normalize: boolean;
  stride: number;
  offset: number;
  divisor: number;
  numberOfColumns: number;

  constructor(attribute: VertexAttribute) {
    this.name = attribute.name;
    this.componentCount = attribute.data.componentCount;
    this.componentType = attribute.data.componentType;
    this.normalize = attribute.normalize ?? false;
    this.stride = attribute.data.sizeInBytes;
    this.offset = 0;
    this.divisor = attribute.divisor ?? 0;
    this.numberOfColumns = attribute.data.numberOfColumns;
  }

  /** Computes interleaved layouts for a set of attributes stored in a single buffer. */
  static fromAttributes(attributes: VertexAttribute[]): VertexLayout[] {
    const vertexLayouts: VertexLayout[] = [];

    let maxAlignment = 0;
    let currentOffset = 0;

    for (const attribute of attributes) {
      const alignment = componentTypeSizeInBytes(attribute.data.componentType);

      maxAlignment = Math.max(maxAlignment, alignment);
      currentOffset = VertexLayout.alignTo(currentOffset, alignment);

      const layout = new VertexLayout(attribute);
      layout.offset = currentOffset;

      currentOffset += attribute.data.sizeInBytes;
      vertexLayouts.push(layout);
    }

    // The stride must be aligned to a value that is valid for all attributes.
    // Since possible alignment values for attributes are powers of two,
    // aligning to the maximum alignment ensures it is a multiple of all smaller alignments.
    const stride = VertexLayout.alignTo(currentOffset, maxAlignment);

    for (const vertexLayout of vertexLayouts) {
      vertexLayout.stride = stride;
    }

    return vertexLayouts;
  }

  /** Aligns a value to the specified alignment boundary. */
  static alignTo(value: number, alignment: number): number {
    if (alignment === 0) {
      return value;
    }

    const remainder = value % alignment;

    if (remainder === 0) {
      return value;
    }

    return value + (alignment - remainder);
  }
}

/**
 * A buffer of vertex data stored on the CPU and the GPU, with metadata about
 * how the data should be uploaded to and interpreted by the GPU.
 */
export class VertexBuffer {
  readonly layout: VertexLayout;
  readonly buffer: BufferGPU;

  constructor(
    name: string,
    data: Data,
    options: {
      divisor?: number;
      normalize?: boolean;
      usage?: BufferUsage;
    } = {},
  ) {
    this.layout = new VertexLayout({ name, data, ...options });
    this.buffer = new BufferGPU(
      BufferKind.ArrayBuffer,
      options.usage ?? BufferUsage.StaticDraw,
      data.bytes,
    );
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

/** A single GPU buffer holding several vertex attributes interleaved per vertex. */
export class InterleavedVertexBuffer {
  readonly buffer: BufferGPU;
  readonly layouts: VertexLayout[];

  constructor(
    attributes: VertexAttribute[],
    usage: BufferUsage = BufferUsage.StaticDraw,
  ) {
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

    this.buffer = new BufferGPU(BufferKind.ArrayBuffer, usage, bytes);
  }

  get vertexCount(): number {
    return this.buffer.size / this.stride;
  }

  get stride(): number {
    return this.layouts[0].stride;
  }

  private static interleave(
    dataArray: Data[],
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
