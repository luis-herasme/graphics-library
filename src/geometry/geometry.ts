import { BufferUsage } from "../gpu/gpu-buffer";
import { IndexBuffer } from "./index-buffer";
import { Transform2D } from "../math";
import {
  VertexAttributeDescriptor,
  VertexBuffer,
  VertexComponentType,
} from "./vertex-buffer";

// prettier-ignore
const QUAD_POSITIONS = [
  [0.5, 0.5],   // Top right
  [0.5, -0.5],  // Bottom right
  [-0.5, -0.5], // Bottom left
  [-0.5, 0.5],  // Top left
];

// prettier-ignore
const QUAD_COLORS = [
  [255, 0, 0], // Top right
  [0, 255, 0], // Bottom right
  [0, 0, 255], // Bottom left
  [0, 255, 0], // Top left
];

// prettier-ignore
const QUAD_UVS = [
  [1, 1], // Top right
  [1, 0], // Bottom right
  [0, 0], // Bottom left
  [0, 1], // Top left
];

// prettier-ignore
const QUAD_INDICES = [
  0, 1, 2, // Triangle #1
  2, 3, 0, // Triangle #2
];

const QUAD_ATTRIBUTES: VertexAttributeDescriptor[] = [
  { name: "position", values: QUAD_POSITIONS, componentCount: 2 },
  {
    name: "color",
    values: QUAD_COLORS,
    componentCount: 3,
    componentType: VertexComponentType.UnsignedByte,
    normalize: true,
  },
  { name: "uv", values: QUAD_UVS, componentCount: 2 },
];

export type GeometryDescriptor = {
  vertexCount: number;
  instanceCount?: number | null;
  indices?: IndexBuffer | null;
  vertexBuffers?: VertexBuffer[];
};

export class Geometry {
  vertexCount: number;
  instanceCount: number | null;
  indices: IndexBuffer | null;
  vertexBuffers: VertexBuffer[];

  constructor(descriptor: GeometryDescriptor) {
    this.vertexCount = descriptor.vertexCount;
    this.instanceCount = null;
    this.indices = null;
    this.vertexBuffers = [];

    if (descriptor.instanceCount !== undefined) {
      this.instanceCount = descriptor.instanceCount;
    }

    if (descriptor.indices !== undefined) {
      this.indices = descriptor.indices;
    }

    if (descriptor.vertexBuffers !== undefined) {
      this.vertexBuffers = descriptor.vertexBuffers;
    }
  }

  /** Overwrites one vertex of one attribute. The change reaches the GPU before the next draw. */
  setVertex(
    attributeName: string,
    vertexIndex: number,
    values: ArrayBufferView | number[],
  ): void {
    for (const vertexBuffer of this.vertexBuffers) {
      for (const attribute of vertexBuffer.attributes) {
        if (attribute.name === attributeName) {
          vertexBuffer.setVertex(attribute, vertexIndex, values);
          return;
        }
      }
    }

    throw new Error(`This geometry has no attribute named "${attributeName}"`);
  }

  static box(): Geometry {
    // prettier-ignore
    const positions = [
      // Front face (z = 0.5)
      [0.5, 0.5, 0.5],   // 0: Top-right
      [0.5, -0.5, 0.5],  // 1: Bottom-right
      [-0.5, -0.5, 0.5], // 2: Bottom-left
      [-0.5, 0.5, 0.5],  // 3: Top-left
      // Back face (z = -0.5)
      [0.5, 0.5, -0.5],   // 4: Top-right
      [-0.5, 0.5, -0.5],  // 5: Top-left
      [-0.5, -0.5, -0.5], // 6: Bottom-left
      [0.5, -0.5, -0.5],  // 7: Bottom-right
      // Top face (y = 0.5)
      [0.5, 0.5, -0.5],  // 8: Back-right
      [0.5, 0.5, 0.5],   // 9: Front-right
      [-0.5, 0.5, 0.5],  // 10: Front-left
      [-0.5, 0.5, -0.5], // 11: Back-left
      // Bottom face (y = -0.5)
      [0.5, -0.5, 0.5],   // 12: Front-right
      [0.5, -0.5, -0.5],  // 13: Back-right
      [-0.5, -0.5, -0.5], // 14: Back-left
      [-0.5, -0.5, 0.5],  // 15: Front-left
      // Right face (x = 0.5)
      [0.5, 0.5, -0.5],  // 16: Top-back
      [0.5, -0.5, -0.5], // 17: Bottom-back
      [0.5, -0.5, 0.5],  // 18: Bottom-front
      [0.5, 0.5, 0.5],   // 19: Top-front
      // Left face (x = -0.5)
      [-0.5, 0.5, 0.5],   // 20: Top-front
      [-0.5, -0.5, 0.5],  // 21: Bottom-front
      [-0.5, -0.5, -0.5], // 22: Bottom-back
      [-0.5, 0.5, -0.5],  // 23: Top-back
    ];

    // prettier-ignore
    const normals = [
      // Front face
      [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1],
      // Back face
      [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1],
      // Top face
      [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
      // Bottom face
      [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0],
      // Right face
      [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
      // Left face
      [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0],
    ];

    // prettier-ignore
    const uvs = [
      // Front face
      [1, 1], [1, 0], [0, 0], [0, 1],
      // Back face
      [0, 1], [1, 1], [1, 0], [0, 0],
      // Top face
      [1, 1], [1, 0], [0, 0], [0, 1],
      // Bottom face
      [1, 0], [1, 1], [0, 1], [0, 0],
      // Right face
      [0, 1], [0, 0], [1, 0], [1, 1],
      // Left face
      [1, 1], [1, 0], [0, 0], [0, 1],
    ];

    // prettier-ignore
    const indices = [
      0, 1, 2, 2, 3, 0,       // Front face
      4, 5, 6, 6, 7, 4,       // Back face
      8, 9, 10, 10, 11, 8,    // Top face
      12, 13, 14, 14, 15, 12, // Bottom face
      16, 17, 18, 18, 19, 16, // Right face
      20, 21, 22, 22, 23, 20, // Left face
    ];

    return new Geometry({
      vertexCount: 24,
      indices: new IndexBuffer({ data: indices }),
      vertexBuffers: [
        new VertexBuffer({
          attributes: [
            { name: "position", values: positions, componentCount: 3 },
          ],
        }),
        new VertexBuffer({
          attributes: [{ name: "normal", values: normals, componentCount: 3 }],
        }),
        new VertexBuffer({
          attributes: [{ name: "uv", values: uvs, componentCount: 2 }],
        }),
      ],
    });
  }

  static quad(): Geometry {
    return new Geometry({
      vertexCount: 4,
      indices: new IndexBuffer({ data: QUAD_INDICES }),
      vertexBuffers: QUAD_ATTRIBUTES.map(
        (attribute) => new VertexBuffer({ attributes: [attribute] }),
      ),
    });
  }

  static quadInterleaved(): Geometry {
    return new Geometry({
      vertexCount: 4,
      indices: new IndexBuffer({ data: QUAD_INDICES }),
      vertexBuffers: [new VertexBuffer({ attributes: QUAD_ATTRIBUTES })],
    });
  }

  static quadInstanced(count: number): Geometry {
    return new Geometry({
      vertexCount: 4,
      instanceCount: count,
      indices: new IndexBuffer({ data: QUAD_INDICES }),
      vertexBuffers: [
        ...QUAD_ATTRIBUTES.map(
          (attribute) => new VertexBuffer({ attributes: [attribute] }),
        ),
        new VertexBuffer({
          attributes: [instanceTransforms(count)],
          usage: BufferUsage.DynamicDraw,
        }),
      ],
    });
  }

  static quadInstancedAndInterleaved(count: number): Geometry {
    return new Geometry({
      vertexCount: 4,
      instanceCount: count,
      indices: new IndexBuffer({ data: QUAD_INDICES }),
      vertexBuffers: [
        new VertexBuffer({ attributes: QUAD_ATTRIBUTES }),
        new VertexBuffer({ attributes: [instanceTransforms(count)] }),
      ],
    });
  }
}

/** One identity `mat3` per instance, spread over three attribute locations by the shader. */
function instanceTransforms(count: number): VertexAttributeDescriptor {
  const values: Float32Array[] = [];

  for (let index = 0; index < count; index++) {
    values.push(new Transform2D().toMatrix3().elements);
  }

  return {
    name: "transform",
    values,
    componentCount: 9,
    numberOfColumns: 3,
    divisor: 1,
  };
}
