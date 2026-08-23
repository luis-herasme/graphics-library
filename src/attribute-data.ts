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

/**
 * Accepted input for vertex data: a flat list of numbers (or typed array),
 * nested arrays (one entry per vertex, e.g. `[[x, y, z], ...]`), or objects
 * with a `toArray()` method (e.g. Vector2, Vector3, Matrix3, Transform2D).
 */
export type AttributeDataInput =
  ArrayLike<number> | readonly DataInputElement[];

type DataInputElement =
  | number
  | ArrayLike<number>
  | readonly DataInputElement[]
  | { toArray(): ArrayLike<number> };

function flattenInto(
  output: number[],
  value: AttributeDataInput | DataInputElement,
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
    const componentType = descriptor.componentType ?? VertexComponentType.Float;
    const componentCount = descriptor.componentCount;
    const numberOfColumns = descriptor.numberOfColumns ?? 1;

    const flattened: number[] = [];
    flattenInto(flattened, descriptor.data);

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

  /** The size of one vertex worth of data, in bytes. */
  get sizeInBytes(): number {
    return this.componentCount * componentTypeSizeInBytes(this.componentType);
  }
}
