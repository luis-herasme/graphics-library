import { Vector2 } from "./vector2";

// prettier-ignore
const IDENTITY = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
];

/** A 3x3 column-major matrix, stored as a Float32Array of 9 elements. */
export class Matrix3 {
  elements: Float32Array;

  constructor(elements: ArrayLike<number> = IDENTITY) {
    if (elements.length !== 9) {
      throw new Error(`Matrix3 requires 9 elements, got ${elements.length}`);
    }

    this.elements = new Float32Array(elements);
  }

  static identity(): Matrix3 {
    return new Matrix3();
  }

  static fromScaleAngleTranslation(
    scale: Vector2,
    angle: number,
    translation: Vector2,
  ): Matrix3 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // prettier-ignore
    return new Matrix3([
      cos * scale.x,  sin * scale.x,  0,
      -sin * scale.y, cos * scale.y,  0,
      translation.x,  translation.y,  1,
    ]);
  }

  clone(): Matrix3 {
    return new Matrix3(this.elements);
  }
}
