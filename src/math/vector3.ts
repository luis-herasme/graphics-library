export class Vector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  static fromArray(array: ArrayLike<number>): Vector3 {
    return new Vector3(array[0], array[1], array[2]);
  }

  static one(): Vector3 {
    return new Vector3(1, 1, 1);
  }

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  add(other: Vector3): this {
    this.x += other.x;
    this.y += other.y;
    this.z += other.z;
    return this;
  }

  multiplyScalar(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }

  length(): number {
    return Math.hypot(this.x, this.y, this.z);
  }

  lerp(other: Vector3, t: number): Vector3 {
    return new Vector3(
      this.x + (other.x - this.x) * t,
      this.y + (other.y - this.y) * t,
      this.z + (other.z - this.z) * t,
    );
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }
}
