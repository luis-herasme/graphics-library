import {
  AttributeData,
  TYPED_ARRAY_FOR_COMPONENT_TYPE,
  VertexComponentType,
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
export class AttributeLayout {
  name: string;
  componentCount: number;
  componentType: VertexComponentType;
  normalize: boolean;
  stride: number;
  offset: number;
  divisor: number;
  numberOfColumns: number;

  constructor(attribute: VertexAttribute) {
    const { normalize = false, divisor = 0 } = attribute;

    this.name = attribute.name;
    this.componentCount = attribute.data.componentCount;
    this.componentType = attribute.data.componentType;
    this.normalize = normalize;
    this.stride = attribute.data.sizeInBytes;
    this.offset = 0;
    this.divisor = divisor;
    this.numberOfColumns = attribute.data.numberOfColumns;
  }

  /** Computes interleaved layouts for a set of attributes stored in a single buffer. */
  static fromAttributes(attributes: VertexAttribute[]): AttributeLayout[] {
    const attributeLayouts: AttributeLayout[] = [];

    let maxAlignment = 0;
    let currentOffset = 0;

    for (const attribute of attributes) {
      const alignment =
        TYPED_ARRAY_FOR_COMPONENT_TYPE[attribute.data.componentType]
          .BYTES_PER_ELEMENT;

      maxAlignment = Math.max(maxAlignment, alignment);
      currentOffset = AttributeLayout.alignTo(currentOffset, alignment);

      const layout = new AttributeLayout(attribute);
      layout.offset = currentOffset;

      currentOffset += attribute.data.sizeInBytes;
      attributeLayouts.push(layout);
    }

    // The stride must be aligned to a value that is valid for all attributes.
    // Since possible alignment values for attributes are powers of two,
    // aligning to the maximum alignment ensures it is a multiple of all smaller alignments.
    const stride = AttributeLayout.alignTo(currentOffset, maxAlignment);

    for (const attributeLayout of attributeLayouts) {
      attributeLayout.stride = stride;
    }

    return attributeLayouts;
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
