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

/** Flat values, one vertex after another. The array type picks the component type. */
export type VertexAttributeValues =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array;

/** One vertex attribute as the caller describes it, before it has a place in a buffer. */
export type VertexAttributeDescriptor = {
  /** The name the shader sees. */
  name: string;
  values: VertexAttributeValues;
  /** Components per vertex (e.g. 3 for a vec3, 9 for a mat3). */
  componentCount: number;
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
  /** The size of one component, which is also the alignment the GPU expects for it. */
  readonly bytesPerComponent: number;
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
 * One or more vertex attributes and their layout inside a shared buffer. With
 * several attributes the values are interleaved, so everything one vertex
 * needs sits together.
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
    webglBuffer: WebGLBuffer,
    shaderProgram: ShaderProgram,
  ): void {
    gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, webglBuffer);

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
      const columnSize = componentsPerColumn * attribute.bytesPerComponent;

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
    values: ArrayBufferView,
  ): void {
    const byteOffset = vertexIndex * this.stride + attribute.offset;
    this.buffer.setBytes(byteOffset, values);
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

  const attributes: VertexAttribute[] = [];
  const vertexCount =
    descriptors[0].values.length / descriptors[0].componentCount;

  let largestComponentSize = 1;
  let offset = 0;

  for (const descriptor of descriptors) {
    if (descriptor.values.length % descriptor.componentCount !== 0) {
      throw new Error(
        `Vertex data length (${descriptor.values.length}) is not a multiple of the component count (${descriptor.componentCount})`,
      );
    }

    if (descriptor.values.length / descriptor.componentCount !== vertexCount) {
      throw new Error(
        `Attribute "${descriptor.name}" describes ${descriptor.values.length / descriptor.componentCount} vertices, but "${descriptors[0].name}" describes ${vertexCount}`,
      );
    }

    let numberOfColumns = descriptor.numberOfColumns;
    let divisor = descriptor.divisor;
    let normalize = descriptor.normalize;

    if (numberOfColumns === undefined) {
      numberOfColumns = 1;
    }

    if (divisor === undefined) {
      divisor = 0;
    }

    if (normalize === undefined) {
      normalize = false;
    }

    const bytesPerComponent = descriptor.values.BYTES_PER_ELEMENT;

    largestComponentSize = Math.max(largestComponentSize, bytesPerComponent);
    offset = alignTo(offset, bytesPerComponent);

    attributes.push({
      name: descriptor.name,
      componentCount: descriptor.componentCount,
      componentType: componentTypeOf(descriptor.values),
      bytesPerComponent,
      numberOfColumns,
      divisor,
      normalize,
      offset,
    });

    offset += descriptor.componentCount * bytesPerComponent;
  }

  // The stride has to keep every attribute aligned. Component sizes are powers
  // of two, so aligning to the largest one is a multiple of all the others.
  const stride = alignTo(offset, largestComponentSize);

  // A lone attribute already sits the way the GPU reads it: offset zero, and a
  // stride of exactly one vertex. Copying it again would change nothing.
  if (attributes.length === 1) {
    return { attributes, stride, bytes: toUint8Array(descriptors[0].values) };
  }

  const bytes = new Uint8Array(stride * vertexCount);

  for (let index = 0; index < attributes.length; index++) {
    const attribute = attributes[index];
    const valueBytes = toUint8Array(descriptors[index].values);
    const size = attribute.componentCount * attribute.bytesPerComponent;

    for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex++) {
      const start = vertexIndex * size;

      bytes.set(
        valueBytes.subarray(start, start + size),
        vertexIndex * stride + attribute.offset,
      );
    }
  }

  return { attributes, stride, bytes };
}

function componentTypeOf(values: VertexAttributeValues): VertexComponentType {
  if (values instanceof Int8Array) {
    return WebGL2RenderingContext.BYTE;
  } else if (values instanceof Uint8Array) {
    return WebGL2RenderingContext.UNSIGNED_BYTE;
  } else if (values instanceof Int16Array) {
    return WebGL2RenderingContext.SHORT;
  } else if (values instanceof Uint16Array) {
    return WebGL2RenderingContext.UNSIGNED_SHORT;
  } else if (values instanceof Int32Array) {
    return WebGL2RenderingContext.INT;
  } else if (values instanceof Uint32Array) {
    return WebGL2RenderingContext.UNSIGNED_INT;
  } else {
    return WebGL2RenderingContext.FLOAT;
  }
}

/** The same values, seen as raw bytes. */
function toUint8Array(values: VertexAttributeValues): Uint8Array {
  return new Uint8Array(values.buffer, values.byteOffset, values.byteLength);
}

function alignTo(value: number, alignment: number): number {
  const remainder = value % alignment;

  if (remainder === 0) {
    return value;
  }

  return value + (alignment - remainder);
}
