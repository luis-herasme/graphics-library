import { BufferUsage, GpuBuffer } from "../gpu/gpu-buffer";
import { ShaderProgram } from "../gpu/shader-program";

export type VertexComponentType =
  | typeof WebGL2RenderingContext.BYTE
  | typeof WebGL2RenderingContext.UNSIGNED_BYTE
  | typeof WebGL2RenderingContext.SHORT
  | typeof WebGL2RenderingContext.UNSIGNED_SHORT
  | typeof WebGL2RenderingContext.INT
  | typeof WebGL2RenderingContext.UNSIGNED_INT
  | typeof WebGL2RenderingContext.FLOAT;

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
  [WebGL2RenderingContext.BYTE]: Int8Array,
  [WebGL2RenderingContext.UNSIGNED_BYTE]: Uint8Array,
  [WebGL2RenderingContext.SHORT]: Int16Array,
  [WebGL2RenderingContext.UNSIGNED_SHORT]: Uint16Array,
  [WebGL2RenderingContext.INT]: Int32Array,
  [WebGL2RenderingContext.UNSIGNED_INT]: Uint32Array,
  [WebGL2RenderingContext.FLOAT]: Float32Array,
};

type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array;

/** Flat values, or one array per vertex (e.g. `[[x, y, z], ...]`). */
export type VertexAttributeValues =
  number[] | number[][] | TypedArray | TypedArray[];

/** One vertex attribute as the caller describes it, before it has a place in a buffer. */
export type VertexAttributeDescriptor = {
  /** The name the shader sees. */
  name: string;
  values: VertexAttributeValues;
  /** Components per vertex (e.g. 3 for a vec3, 9 for a mat3). */
  componentCount: number;
  /** Defaults to `WebGL2RenderingContext.FLOAT`. */
  componentType?: VertexComponentType;
  /** Only matrices have more than one column. Defaults to 1. */
  numberOfColumns?: number;
  /** How many instances share one value (0 = a value per vertex). Defaults to 0. */
  divisor?: number;
  /** Whether integer values are scaled to the [0, 1] range in the shader. Defaults to false. */
  normalize?: boolean;
};

/** One vertex attribute and where its values sit inside a vertex. */
export type VertexAttribute = {
  readonly name: string;
  readonly componentCount: number;
  readonly componentType: VertexComponentType;
  readonly numberOfColumns: number;
  readonly divisor: number;
  readonly normalize: boolean;
  /** Bytes from the start of a vertex to this attribute's first component. */
  readonly offset: number;
};

export type VertexBufferDescriptor = {
  attributes: VertexAttributeDescriptor[];
  usage?: BufferUsage;
};

/**
 * A GPU buffer holding one or more vertex attributes. With several attributes
 * the values are interleaved, so everything one vertex needs sits together.
 */
export class VertexBuffer {
  readonly attributes: VertexAttribute[];
  /** Bytes from one vertex to the next. Every attribute in the buffer shares it. */
  readonly stride: number;
  readonly buffer: GpuBuffer;

  constructor(descriptor: VertexBufferDescriptor) {
    let usage = descriptor.usage;

    if (usage === undefined) {
      usage = WebGL2RenderingContext.STATIC_DRAW;
    }

    const { attributes, stride, bytes } = interleave(descriptor.attributes);

    this.attributes = attributes;
    this.stride = stride;
    this.buffer = new GpuBuffer({
      target: WebGL2RenderingContext.ARRAY_BUFFER,
      usage,
      bytes,
    });
  }

  get vertexCount(): number {
    return this.buffer.size / this.stride;
  }

  /** Binds the buffer and points every attribute the shader uses at it. */
  bindAttributes(
    gl: WebGL2RenderingContext,
    shaderProgram: ShaderProgram,
  ): void {
    this.buffer.bind(gl);

    for (const attribute of this.attributes) {
      const location = shaderProgram.getAttributeLocation(attribute.name);

      if (location === undefined) {
        continue;
      }

      // Only matrices have more than one column, and each column occupies its
      // own attribute location. A single column is just the ordinary case of
      // this loop.
      const componentsPerColumn =
        attribute.componentCount / attribute.numberOfColumns;
      const columnSize =
        componentsPerColumn * componentSizeInBytes(attribute.componentType);

      for (let column = 0; column < attribute.numberOfColumns; column++) {
        const columnLocation = location + column;

        gl.enableVertexAttribArray(columnLocation);
        gl.vertexAttribPointer(
          columnLocation,
          componentsPerColumn,
          attribute.componentType,
          attribute.normalize,
          this.stride,
          attribute.offset + column * columnSize,
        );

        if (attribute.divisor !== 0) {
          gl.vertexAttribDivisor(columnLocation, attribute.divisor);
        }
      }
    }
  }

  /** Overwrites one vertex of one attribute. The attribute must be one of this buffer's. */
  setVertex(
    attribute: VertexAttribute,
    vertexIndex: number,
    values: ArrayBufferView | number[],
  ): void {
    const byteOffset = vertexIndex * this.stride + attribute.offset;
    this.buffer.setBytes(byteOffset, toArrayBufferView(values, attribute));
  }
}

type InterleavedVertices = {
  attributes: VertexAttribute[];
  stride: number;
  bytes: Uint8Array;
};

/**
 * Gives every attribute its offset inside a vertex, picks the stride they all
 * share, and copies their values into that arrangement.
 */
function interleave(
  descriptors: VertexAttributeDescriptor[],
): InterleavedVertices {
  if (descriptors.length === 0) {
    throw new Error("A vertex buffer needs at least one attribute");
  }

  const valueBytes = descriptors.map(toBytes);
  const attributes: VertexAttribute[] = [];

  let largestComponentSize = 1;
  let offset = 0;

  for (const descriptor of descriptors) {
    let componentType = descriptor.componentType;
    let numberOfColumns = descriptor.numberOfColumns;
    let divisor = descriptor.divisor;
    let normalize = descriptor.normalize;

    if (componentType === undefined) {
      componentType = WebGL2RenderingContext.FLOAT;
    }

    if (numberOfColumns === undefined) {
      numberOfColumns = 1;
    }

    if (divisor === undefined) {
      divisor = 0;
    }

    if (normalize === undefined) {
      normalize = false;
    }

    const componentSize = componentSizeInBytes(componentType);

    largestComponentSize = Math.max(largestComponentSize, componentSize);
    offset = alignTo(offset, componentSize);

    attributes.push({
      name: descriptor.name,
      componentCount: descriptor.componentCount,
      componentType,
      numberOfColumns,
      divisor,
      normalize,
      offset,
    });

    offset += descriptor.componentCount * componentSize;
  }

  // The stride has to keep every attribute aligned. Component sizes are powers
  // of two, so aligning to the largest one is a multiple of all the others.
  const stride = alignTo(offset, largestComponentSize);
  const vertexCount =
    valueBytes[0].byteLength / vertexSizeInBytes(attributes[0]);

  // A lone attribute already sits the way the GPU reads it: offset zero, and a
  // stride of exactly one vertex. Copying it again would change nothing.
  if (attributes.length === 1) {
    return { attributes, stride, bytes: valueBytes[0] };
  }

  const bytes = new Uint8Array(stride * vertexCount);

  for (let index = 0; index < attributes.length; index++) {
    const attribute = attributes[index];
    const size = vertexSizeInBytes(attribute);

    for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex++) {
      const start = vertexIndex * size;

      bytes.set(
        valueBytes[index].subarray(start, start + size),
        vertexIndex * stride + attribute.offset,
      );
    }
  }

  return { attributes, stride, bytes };
}

/** Flattens the caller's values and converts them to the attribute's component type. */
function toBytes(descriptor: VertexAttributeDescriptor): Uint8Array {
  let componentType = descriptor.componentType;

  if (componentType === undefined) {
    componentType = WebGL2RenderingContext.FLOAT;
  }

  const values: number[] = [];

  for (const element of descriptor.values) {
    if (typeof element === "number") {
      values.push(element);
    } else {
      for (const value of element) {
        values.push(value);
      }
    }
  }

  if (values.length % descriptor.componentCount !== 0) {
    throw new Error(
      `Vertex data length (${values.length}) is not a multiple of the component count (${descriptor.componentCount})`,
    );
  }

  const TypedArray = TYPED_ARRAY_FOR_COMPONENT_TYPE[componentType];
  return new Uint8Array(new TypedArray(values).buffer);
}

function toArrayBufferView(
  values: ArrayBufferView | number[],
  attribute: VertexAttribute,
): ArrayBufferView {
  if (Array.isArray(values)) {
    const TypedArray = TYPED_ARRAY_FOR_COMPONENT_TYPE[attribute.componentType];
    return new TypedArray(values);
  }

  return values;
}

/** The bytes one vertex of this attribute takes, ignoring any padding after it. */
function vertexSizeInBytes(attribute: VertexAttribute): number {
  return (
    attribute.componentCount * componentSizeInBytes(attribute.componentType)
  );
}

/** The size of one component, which is also the alignment the GPU expects for it. */
function componentSizeInBytes(componentType: VertexComponentType): number {
  return TYPED_ARRAY_FOR_COMPONENT_TYPE[componentType].BYTES_PER_ELEMENT;
}

function alignTo(value: number, alignment: number): number {
  const remainder = value % alignment;

  if (remainder === 0) {
    return value;
  }

  return value + (alignment - remainder);
}
