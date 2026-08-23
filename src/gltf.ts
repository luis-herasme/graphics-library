const GLB_MAGIC = 0x46546c67; // "glTF"
const GLB_CHUNK_JSON = 0x4e4f534a; // "JSON"
const GLB_CHUNK_BIN = 0x004e4942; // "BIN\0"

type AccessorArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Uint32Array
  | Float32Array;

const COMPONENT_TYPE_TO_ARRAY = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array,
} as const;

const TYPE_TO_COMPONENT_COUNT: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

export type GltfNode = {
  name?: string;
  children?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
  matrix?: number[];
  mesh?: number;
  skin?: number;
};

export type GltfPrimitive = {
  attributes: Record<string, number>;
  indices?: number;
  mode?: number;
};

export type GltfJson = {
  accessors?: {
    bufferView?: number;
    byteOffset?: number;
    componentType: keyof typeof COMPONENT_TYPE_TO_ARRAY;
    count: number;
    type: string;
  }[];
  bufferViews?: {
    buffer: number;
    byteOffset?: number;
    byteLength: number;
    byteStride?: number;
  }[];
  meshes?: { name?: string; primitives: GltfPrimitive[] }[];
  nodes?: GltfNode[];
  skins?: { joints: number[]; skeleton?: number }[];
  [key: string]: unknown;
};

export class GltfParseError extends Error {}

type GltfDescriptor = {
  json: GltfJson;
  bin: Uint8Array | null;
};

/** A minimal reader for binary glTF (.glb) files with an embedded binary chunk. */
export class Gltf {
  readonly json: GltfJson;
  readonly bin: Uint8Array | null;

  private constructor(descriptor: GltfDescriptor) {
    this.json = descriptor.json;
    this.bin = descriptor.bin;
  }

  static fromBytes(bytes: Uint8Array): Gltf {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    if (bytes.byteLength < 12 || view.getUint32(0, true) !== GLB_MAGIC) {
      throw new GltfParseError("Not a binary glTF file (bad magic)");
    }

    const version = view.getUint32(4, true);

    if (version !== 2) {
      throw new GltfParseError(`Unsupported glTF version: ${version}`);
    }

    let json: GltfJson | null = null;
    let bin: Uint8Array | null = null;

    let offset = 12;
    while (offset + 8 <= bytes.byteLength) {
      const chunkLength = view.getUint32(offset, true);
      const chunkType = view.getUint32(offset + 4, true);
      const chunkData = bytes.subarray(offset + 8, offset + 8 + chunkLength);

      if (chunkType === GLB_CHUNK_JSON) {
        json = JSON.parse(new TextDecoder().decode(chunkData)) as GltfJson;
      } else if (chunkType === GLB_CHUNK_BIN) {
        bin = chunkData;
      }

      offset += 8 + chunkLength;
    }

    if (json === null) {
      throw new GltfParseError("Binary glTF file has no JSON chunk");
    }

    return new Gltf({ json, bin });
  }

  /** Reads an accessor's data as a flat typed array of `count * componentCount` values. */
  readAccessor(accessorIndex: number): AccessorArray {
    const accessor = this.json.accessors?.[accessorIndex];

    if (accessor === undefined) {
      throw new GltfParseError(`Accessor ${accessorIndex} does not exist`);
    }

    const TypedArray = COMPONENT_TYPE_TO_ARRAY[accessor.componentType];

    if (TypedArray === undefined) {
      throw new GltfParseError(
        `Unsupported accessor component type: ${accessor.componentType}`,
      );
    }

    const componentCount = TYPE_TO_COMPONENT_COUNT[accessor.type];

    if (componentCount === undefined) {
      throw new GltfParseError(`Unsupported accessor type: ${accessor.type}`);
    }

    if (accessor.bufferView === undefined) {
      // Sparse or empty accessors are not supported; return zeros
      return new TypedArray(accessor.count * componentCount);
    }

    const bufferView = this.json.bufferViews?.[accessor.bufferView];

    if (bufferView === undefined) {
      throw new GltfParseError(
        `Buffer view ${accessor.bufferView} does not exist`,
      );
    }

    if (this.bin === null) {
      throw new GltfParseError("Binary glTF file has no BIN chunk");
    }

    const binBuffer = this.bin.buffer as ArrayBuffer;
    const elementSize = componentCount * TypedArray.BYTES_PER_ELEMENT;
    const start =
      this.bin.byteOffset +
      (bufferView.byteOffset ?? 0) +
      (accessor.byteOffset ?? 0);
    const stride = bufferView.byteStride ?? elementSize;

    if (stride === elementSize && start % TypedArray.BYTES_PER_ELEMENT === 0) {
      // Tightly packed and aligned: create a single view over the data
      return new TypedArray(binBuffer, start, accessor.count * componentCount);
    }

    if (stride === elementSize) {
      // Tightly packed but misaligned: copy the bytes to a fresh, aligned buffer
      const bytes = new Uint8Array(
        binBuffer,
        start,
        accessor.count * elementSize,
      );
      return new TypedArray(bytes.slice().buffer);
    }

    // Interleaved: copy element by element into a tightly packed buffer
    const outputBytes = new Uint8Array(accessor.count * elementSize);
    const sourceBytes = new Uint8Array(binBuffer);

    for (let i = 0; i < accessor.count; i++) {
      const elementStart = start + i * stride;
      outputBytes.set(
        sourceBytes.subarray(elementStart, elementStart + elementSize),
        i * elementSize,
      );
    }

    return new TypedArray(outputBytes.buffer);
  }

  getPrimitive(meshIndex = 0, primitiveIndex = 0): GltfPrimitive {
    const primitive = this.json.meshes?.[meshIndex]?.primitives[primitiveIndex];

    if (primitive === undefined) {
      throw new GltfParseError(
        `Mesh ${meshIndex} primitive ${primitiveIndex} does not exist`,
      );
    }

    return primitive;
  }

  /** Reads a vertex attribute (e.g. "POSITION", "NORMAL", "TEXCOORD_0") of a primitive. */
  readAttribute(
    attribute: string,
    meshIndex = 0,
    primitiveIndex = 0,
  ): AccessorArray {
    const primitive = this.getPrimitive(meshIndex, primitiveIndex);
    const accessorIndex = primitive.attributes[attribute];

    if (accessorIndex === undefined) {
      throw new GltfParseError(`Primitive has no "${attribute}" attribute`);
    }

    return this.readAccessor(accessorIndex);
  }

  readPositions(meshIndex = 0, primitiveIndex = 0): Float32Array {
    return this.readAttribute(
      "POSITION",
      meshIndex,
      primitiveIndex,
    ) as Float32Array;
  }

  readNormals(meshIndex = 0, primitiveIndex = 0): Float32Array {
    return this.readAttribute(
      "NORMAL",
      meshIndex,
      primitiveIndex,
    ) as Float32Array;
  }

  readIndices(meshIndex = 0, primitiveIndex = 0): Uint32Array {
    const primitive = this.getPrimitive(meshIndex, primitiveIndex);

    if (primitive.indices === undefined) {
      throw new GltfParseError("Primitive has no indices");
    }

    const indices = this.readAccessor(primitive.indices);
    return indices instanceof Uint32Array ? indices : new Uint32Array(indices);
  }
}
