import { BufferUsage } from "../gpu/gpu-buffer";
import { IndexBuffer } from "./index-buffer";
import { OBJ } from "../loaders/obj";
import { Transform2D } from "../scene/transform";
import {
  AttributeData,
  VertexAttribute,
  VertexComponentType,
} from "./attribute-data";
import { AttributeBuffer, InterleavedVertexBuffer } from "./attribute-buffer";

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

export type GeometryDescriptor = {
  vertexCount: number;
  instanceCount?: number | null;
  indices?: IndexBuffer | null;
  attributeBuffers?: AttributeBuffer[];
  interleavedVertexBuffers?: InterleavedVertexBuffer[];
};

export class Geometry {
  vertexCount: number;
  instanceCount: number | null;
  indices: IndexBuffer | null;
  attributeBuffers: AttributeBuffer[];
  interleavedVertexBuffers: InterleavedVertexBuffer[];

  constructor(descriptor: GeometryDescriptor) {
    const {
      instanceCount = null,
      indices = null,
      attributeBuffers = [],
      interleavedVertexBuffers = [],
    } = descriptor;

    this.vertexCount = descriptor.vertexCount;
    this.instanceCount = instanceCount;
    this.indices = indices;
    this.attributeBuffers = attributeBuffers;
    this.interleavedVertexBuffers = interleavedVertexBuffers;
  }

  getAttributeBuffer(name: string): AttributeBuffer | null {
    for (const attributeBuffer of this.attributeBuffers) {
      if (attributeBuffer.layout.name === name) {
        return attributeBuffer;
      }
    }

    return null;
  }

  /**
   * Returns the [InterleavedVertexBuffer] that contains the specified vertex
   * attribute, if it exists.
   *
   * Note: a single InterleavedVertexBuffer can store multiple attributes when
   * interleaved. Mutating it directly may unintentionally affect other attributes.
   */
  getInterleavedVertexBuffer(name: string): InterleavedVertexBuffer | null {
    for (const interleavedVertexBuffer of this.interleavedVertexBuffers) {
      for (const layout of interleavedVertexBuffer.layouts) {
        if (layout.name === name) {
          return interleavedVertexBuffer;
        }
      }
    }

    return null;
  }

  static fromOBJ(obj: OBJ): Geometry {
    const positions: number[][] = [];
    const normals: number[][] = [];
    const uvs: number[][] = [];

    for (const face of obj.faces) {
      const positionIndex = face[0] - 1;
      const uvIndex = face[1] - 1;
      const normalIndex = face[2] - 1;

      positions.push(obj.positions[positionIndex]);
      normals.push(obj.normals[normalIndex]);
      uvs.push(obj.uvs[uvIndex]);
    }

    const interleavedVertexBuffer = new InterleavedVertexBuffer({
      attributes: [
        {
          name: "position",
          data: new AttributeData({ data: positions, componentCount: 3 }),
        },
        {
          name: "normal",
          data: new AttributeData({ data: normals, componentCount: 3 }),
        },
        {
          name: "uv",
          data: new AttributeData({ data: uvs, componentCount: 2 }),
        },
      ],
    });

    return new Geometry({
      vertexCount: interleavedVertexBuffer.vertexCount,
      interleavedVertexBuffers: [interleavedVertexBuffer],
    });
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
      attributeBuffers: [
        new AttributeBuffer({
          name: "position",
          data: new AttributeData({ data: positions, componentCount: 3 }),
        }),
        new AttributeBuffer({
          name: "normal",
          data: new AttributeData({ data: normals, componentCount: 3 }),
        }),
        new AttributeBuffer({
          name: "uv",
          data: new AttributeData({ data: uvs, componentCount: 2 }),
        }),
      ],
    });
  }

  private static quadAttributes(): VertexAttribute[] {
    return [
      {
        name: "position",
        data: new AttributeData({ data: QUAD_POSITIONS, componentCount: 2 }),
      },
      {
        name: "color",
        data: new AttributeData({
          data: QUAD_COLORS,
          componentCount: 3,
          componentType: VertexComponentType.UnsignedByte,
        }),
        normalize: true,
      },
      {
        name: "uv",
        data: new AttributeData({ data: QUAD_UVS, componentCount: 2 }),
      },
    ];
  }

  static quad(): Geometry {
    return new Geometry({
      vertexCount: 4,
      indices: new IndexBuffer({ data: QUAD_INDICES }),
      attributeBuffers: Geometry.quadAttributes().map(
        (attribute) => new AttributeBuffer(attribute),
      ),
    });
  }

  static quadInterleaved(): Geometry {
    return new Geometry({
      vertexCount: 4,
      indices: new IndexBuffer({ data: QUAD_INDICES }),
      interleavedVertexBuffers: [
        new InterleavedVertexBuffer({ attributes: Geometry.quadAttributes() }),
      ],
    });
  }

  static quadInstanced(count: number): Geometry {
    const transforms: Float32Array[] = [];

    for (let i = 0; i < count; i++) {
      transforms.push(new Transform2D().toMatrix3().elements);
    }

    return new Geometry({
      vertexCount: 4,
      instanceCount: count,
      indices: new IndexBuffer({ data: QUAD_INDICES }),
      attributeBuffers: [
        ...Geometry.quadAttributes().map(
          (attribute) => new AttributeBuffer(attribute),
        ),
        new AttributeBuffer({
          name: "transform",
          data: new AttributeData({
            data: transforms,
            componentCount: 9,
            numberOfColumns: 3,
          }),
          divisor: 1,
          usage: BufferUsage.DynamicDraw,
        }),
      ],
    });
  }

  static quadInstancedAndInterleaved(count: number): Geometry {
    const transforms: Float32Array[] = [];

    for (let i = 0; i < count; i++) {
      transforms.push(new Transform2D().toMatrix3().elements);
    }

    return new Geometry({
      vertexCount: 4,
      instanceCount: count,
      indices: new IndexBuffer({ data: QUAD_INDICES }),
      attributeBuffers: [
        new AttributeBuffer({
          name: "transform",
          data: new AttributeData({
            data: transforms,
            componentCount: 9,
            numberOfColumns: 3,
          }),
          divisor: 1,
        }),
      ],
      interleavedVertexBuffers: [
        new InterleavedVertexBuffer({ attributes: Geometry.quadAttributes() }),
      ],
    });
  }
}
