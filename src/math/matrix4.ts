import { Quaternion } from "./quaternion";
import { Vector3 } from "./vector3";

// prettier-ignore
const IDENTITY = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

/** A 4x4 column-major matrix, stored as a Float32Array of 16 elements. */
export class Matrix4 {
  elements: Float32Array;

  constructor(elements: ArrayLike<number> = IDENTITY) {
    if (elements.length !== 16) {
      throw new Error(`Matrix4 requires 16 elements, got ${elements.length}`);
    }

    this.elements = new Float32Array(elements);
  }

  static identity(): Matrix4 {
    return new Matrix4();
  }

  static zero(): Matrix4 {
    return new Matrix4(new Float32Array(16));
  }

  /** A right-handed perspective projection with a [-1, 1] depth range (OpenGL convention). */
  static perspective(fovYRadians: number, aspect: number, near: number, far: number): Matrix4 {
    const f = 1 / Math.tan(fovYRadians / 2);
    const range = 1 / (near - far);

    // prettier-ignore
    return new Matrix4([
      f / aspect, 0, 0,                        0,
      0,          f, 0,                        0,
      0,          0, (near + far) * range,    -1,
      0,          0, 2 * near * far * range,   0,
    ]);
  }

  static fromScaleRotationTranslation(scale: Vector3, rotation: Quaternion, translation: Vector3): Matrix4 {
    const { x, y, z, w } = rotation;

    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;

    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    // prettier-ignore
    return new Matrix4([
      (1 - (yy + zz)) * scale.x, (xy + wz) * scale.x,       (xz - wy) * scale.x,       0,
      (xy - wz) * scale.y,       (1 - (xx + zz)) * scale.y, (yz + wx) * scale.y,       0,
      (xz + wy) * scale.z,       (yz - wx) * scale.z,       (1 - (xx + yy)) * scale.z, 0,
      translation.x,             translation.y,             translation.z,             1,
    ]);
  }

  clone(): Matrix4 {
    return new Matrix4(this.elements);
  }

  /** Returns `this * other` as a new matrix. */
  multiply(other: Matrix4): Matrix4 {
    const a = this.elements;
    const b = other.elements;
    const out = new Float32Array(16);

    for (let column = 0; column < 4; column++) {
      for (let row = 0; row < 4; row++) {
        out[column * 4 + row] =
          a[row] * b[column * 4] +
          a[4 + row] * b[column * 4 + 1] +
          a[8 + row] * b[column * 4 + 2] +
          a[12 + row] * b[column * 4 + 3];
      }
    }

    return new Matrix4(out);
  }

  inverse(): Matrix4 {
    const m = this.elements;

    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (det === 0) {
      throw new Error("Cannot invert a singular Matrix4");
    }

    det = 1 / det;

    // prettier-ignore
    return new Matrix4([
      (a11 * b11 - a12 * b10 + a13 * b09) * det,
      (a02 * b10 - a01 * b11 - a03 * b09) * det,
      (a31 * b05 - a32 * b04 + a33 * b03) * det,
      (a22 * b04 - a21 * b05 - a23 * b03) * det,
      (a12 * b08 - a10 * b11 - a13 * b07) * det,
      (a00 * b11 - a02 * b08 + a03 * b07) * det,
      (a32 * b02 - a30 * b05 - a33 * b01) * det,
      (a20 * b05 - a22 * b02 + a23 * b01) * det,
      (a10 * b10 - a11 * b08 + a13 * b06) * det,
      (a01 * b08 - a00 * b10 - a03 * b06) * det,
      (a30 * b04 - a31 * b02 + a33 * b00) * det,
      (a21 * b02 - a20 * b04 - a23 * b00) * det,
      (a11 * b07 - a10 * b09 - a12 * b06) * det,
      (a00 * b09 - a01 * b07 + a02 * b06) * det,
      (a31 * b01 - a30 * b03 - a32 * b00) * det,
      (a20 * b03 - a21 * b01 + a22 * b00) * det,
    ]);
  }

  /**
   * Decomposes the matrix into scale, rotation and translation.
   * Assumes the matrix is a valid affine transform (no shear or projection).
   */
  toScaleRotationTranslation(): { scale: Vector3; rotation: Quaternion; translation: Vector3 } {
    const m = this.elements;

    const det =
      m[0] * (m[5] * m[10] - m[6] * m[9]) -
      m[4] * (m[1] * m[10] - m[2] * m[9]) +
      m[8] * (m[1] * m[6] - m[2] * m[5]);

    let scaleX = Math.hypot(m[0], m[1], m[2]);
    const scaleY = Math.hypot(m[4], m[5], m[6]);
    const scaleZ = Math.hypot(m[8], m[9], m[10]);

    if (det < 0) {
      scaleX = -scaleX;
    }

    const rotation = Quaternion.fromRotationColumns(
      m[0] / scaleX, m[1] / scaleX, m[2] / scaleX,
      m[4] / scaleY, m[5] / scaleY, m[6] / scaleY,
      m[8] / scaleZ, m[9] / scaleZ, m[10] / scaleZ,
    );

    return {
      scale: new Vector3(scaleX, scaleY, scaleZ),
      rotation,
      translation: new Vector3(m[12], m[13], m[14]),
    };
  }

  /** Returns the matrix as a column-major array of 16 elements. */
  toArray(): Float32Array {
    return new Float32Array(this.elements);
  }
}
