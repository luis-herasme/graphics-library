export class Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;

  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  static identity(): Quaternion {
    return new Quaternion(0, 0, 0, 1);
  }

  static fromArray(array: ArrayLike<number>): Quaternion {
    return new Quaternion(array[0], array[1], array[2], array[3]);
  }

  static fromRotationX(angle: number): Quaternion {
    const half = angle * 0.5;
    return new Quaternion(Math.sin(half), 0, 0, Math.cos(half));
  }

  static fromRotationY(angle: number): Quaternion {
    const half = angle * 0.5;
    return new Quaternion(0, Math.sin(half), 0, Math.cos(half));
  }

  static fromRotationZ(angle: number): Quaternion {
    const half = angle * 0.5;
    return new Quaternion(0, 0, Math.sin(half), Math.cos(half));
  }

  /** Builds a quaternion from a 3x3 rotation matrix given as column vectors. */
  // prettier-ignore
  static fromRotationColumns(
    m00: number, m01: number, m02: number,
    m10: number, m11: number, m12: number,
    m20: number, m21: number, m22: number,
  ): Quaternion {
    // (mCR = column C, row R)
    const trace = m00 + m11 + m22;

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1);
      return new Quaternion(
        (m12 - m21) * s,
        (m20 - m02) * s,
        (m01 - m10) * s,
        0.25 / s,
      );
    }

    if (m00 > m11 && m00 > m22) {
      const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
      return new Quaternion(
        0.25 * s,
        (m10 + m01) / s,
        (m20 + m02) / s,
        (m12 - m21) / s,
      );
    }

    if (m11 > m22) {
      const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
      return new Quaternion(
        (m10 + m01) / s,
        0.25 * s,
        (m21 + m12) / s,
        (m20 - m02) / s,
      );
    }

    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    return new Quaternion(
      (m20 + m02) / s,
      (m21 + m12) / s,
      0.25 * s,
      (m01 - m10) / s,
    );
  }

  clone(): Quaternion {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }

  /** Sets `this = this * other` (applies `other` before `this`), returning `this`. */
  multiply(other: Quaternion): this {
    const { x: ax, y: ay, z: az, w: aw } = this;
    const { x: bx, y: by, z: bz, w: bw } = other;

    this.x = aw * bx + ax * bw + ay * bz - az * by;
    this.y = aw * by - ax * bz + ay * bw + az * bx;
    this.z = aw * bz + ax * by - ay * bx + az * bw;
    this.w = aw * bw - ax * bx - ay * by - az * bz;
    return this;
  }

  normalize(): this {
    const length = Math.hypot(this.x, this.y, this.z, this.w);

    if (length > 0) {
      this.x /= length;
      this.y /= length;
      this.z /= length;
      this.w /= length;
    }

    return this;
  }

  slerp(other: Quaternion, t: number): Quaternion {
    let { x: bx, y: by, z: bz, w: bw } = other;
    let cosom = this.x * bx + this.y * by + this.z * bz + this.w * bw;

    // Take the shortest path
    if (cosom < 0) {
      cosom = -cosom;
      bx = -bx;
      by = -by;
      bz = -bz;
      bw = -bw;
    }

    let scale0: number;
    let scale1: number;

    if (1 - cosom > 1e-6) {
      const omega = Math.acos(cosom);
      const sinom = Math.sin(omega);
      scale0 = Math.sin((1 - t) * omega) / sinom;
      scale1 = Math.sin(t * omega) / sinom;
    } else {
      // Quaternions are very close: fall back to linear interpolation
      scale0 = 1 - t;
      scale1 = t;
    }

    return new Quaternion(
      scale0 * this.x + scale1 * bx,
      scale0 * this.y + scale1 * by,
      scale0 * this.z + scale1 * bz,
      scale0 * this.w + scale1 * bw,
    );
  }

  toArray(): [number, number, number, number] {
    return [this.x, this.y, this.z, this.w];
  }
}
