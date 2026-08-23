export enum VertexComponentType {
  Byte = WebGL2RenderingContext.BYTE,
  UnsignedByte = WebGL2RenderingContext.UNSIGNED_BYTE,
  Short = WebGL2RenderingContext.SHORT,
  UnsignedShort = WebGL2RenderingContext.UNSIGNED_SHORT,
  Int = WebGL2RenderingContext.INT,
  UnsignedInt = WebGL2RenderingContext.UNSIGNED_INT,
  Float = WebGL2RenderingContext.FLOAT,
}

type TypedArrayConstructor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor;

export const TYPED_ARRAY_FOR_COMPONENT_TYPE: Record<
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

export function componentTypeSizeInBytes(
  componentType: VertexComponentType,
): number {
  return TYPED_ARRAY_FOR_COMPONENT_TYPE[componentType].BYTES_PER_ELEMENT;
}

type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array;

/** Flat values, or one array per vertex (e.g. `[[x, y, z], ...]`). */
export type AttributeDataInput =
  number[] | number[][] | TypedArray | TypedArray[];

function flatten(input: AttributeDataInput): number[] {
  const output: number[] = [];

  for (const element of input) {
    if (typeof element === "number") {
      output.push(element);
    } else {
      for (const value of element) {
        output.push(value);
      }
    }
  }

  return output;
}

export type AttributeDataDescriptor = {
  data: AttributeDataInput;
  /** Components per vertex (e.g. 3 for a vec3, 9 for a mat3). */
  componentCount: number;
  /** Defaults to `VertexComponentType.Float`. */
  componentType?: VertexComponentType;
  /** Only matrices have more than one column. Defaults to 1. */
  numberOfColumns?: number;
};

/** Raw data for a single vertex attribute, along with how the GPU should interpret it. */
export class AttributeData {
  readonly componentType: VertexComponentType;
  /** Components per vertex (e.g. 3 for a vec3, 9 for a mat3). */
  readonly componentCount: number;
  /** Only matrices have more than one column. */
  readonly numberOfColumns: number;
  readonly bytes: Uint8Array;
  /** Number of vertices in the data. */
  readonly count: number;

  constructor(descriptor: AttributeDataDescriptor) {
    const {
      componentType = VertexComponentType.Float,
      componentCount,
      numberOfColumns = 1,
    } = descriptor;

    const flattened = flatten(descriptor.data);

    if (flattened.length % componentCount !== 0) {
      throw new Error(
        `Vertex data length (${flattened.length}) is not a multiple of the component count (${componentCount})`,
      );
    }

    const TypedArray = TYPED_ARRAY_FOR_COMPONENT_TYPE[componentType];
    const values = new TypedArray(flattened);

    this.componentType = componentType;
    this.componentCount = componentCount;
    this.numberOfColumns = numberOfColumns;
    this.bytes = new Uint8Array(values.buffer);
    this.count = flattened.length / componentCount;
  }

  /** The size of one vertex worth of data, in bytes. */
  get sizeInBytes(): number {
    return this.componentCount * componentTypeSizeInBytes(this.componentType);
  }
}
