import {
  AttributeData,
  VertexComponentType,
  componentTypeSizeInBytes,
} from "./attribute-data";

/** One vertex attribute: the name the shader sees, its raw data, and optional settings. */
export type VertexAttribute = {
  name: string;
  data: AttributeData;
  /** How many instances share one value (0 = a value per vertex). */
  divisor?: number;
  /** Whether integer data is scaled to the [0, 1] range in the shader. */
  normalize?: boolean;
};

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
