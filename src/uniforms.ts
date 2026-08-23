import { Matrix3, Matrix4 } from "./math";
import { Texture } from "./texture";
import { Transform2D, Transform3D } from "./transform";

export type Uniform =
  | { kind: "float"; value: number }
  | { kind: "vector2"; value: Float32Array }
  | { kind: "vector3"; value: Float32Array }
  | { kind: "vector4"; value: Float32Array }
  | { kind: "int"; value: number }
  | { kind: "intVector2"; value: Int32Array }
  | { kind: "intVector3"; value: Int32Array }
  | { kind: "intVector4"; value: Int32Array }
  | { kind: "unsignedInt"; value: number }
  | { kind: "unsignedIntVector2"; value: Uint32Array }
  | { kind: "unsignedIntVector3"; value: Uint32Array }
  | { kind: "unsignedIntVector4"; value: Uint32Array }
  | { kind: "matrix2"; value: Float32Array }
  | { kind: "matrix3"; value: Float32Array }
  | { kind: "matrix4"; value: Float32Array }
  | { kind: "texture"; value: Texture };

function toFloat32(value: ArrayLike<number>, expectedLength: number, kind: string): Float32Array {
  if (value.length !== expectedLength) {
    throw new Error(`Uniform "${kind}" requires ${expectedLength} elements, got ${value.length}`);
  }

  return value instanceof Float32Array ? value : new Float32Array(value);
}

export const Uniform = {
  float(value: number): Uniform {
    return { kind: "float", value };
  },
  vector2(value: ArrayLike<number>): Uniform {
    return { kind: "vector2", value: toFloat32(value, 2, "vector2") };
  },
  vector3(value: ArrayLike<number>): Uniform {
    return { kind: "vector3", value: toFloat32(value, 3, "vector3") };
  },
  vector4(value: ArrayLike<number>): Uniform {
    return { kind: "vector4", value: toFloat32(value, 4, "vector4") };
  },

  int(value: number): Uniform {
    return { kind: "int", value };
  },
  intVector2(value: ArrayLike<number>): Uniform {
    return { kind: "intVector2", value: new Int32Array(value) };
  },
  intVector3(value: ArrayLike<number>): Uniform {
    return { kind: "intVector3", value: new Int32Array(value) };
  },
  intVector4(value: ArrayLike<number>): Uniform {
    return { kind: "intVector4", value: new Int32Array(value) };
  },

  unsignedInt(value: number): Uniform {
    return { kind: "unsignedInt", value };
  },
  unsignedIntVector2(value: ArrayLike<number>): Uniform {
    return { kind: "unsignedIntVector2", value: new Uint32Array(value) };
  },
  unsignedIntVector3(value: ArrayLike<number>): Uniform {
    return { kind: "unsignedIntVector3", value: new Uint32Array(value) };
  },
  unsignedIntVector4(value: ArrayLike<number>): Uniform {
    return { kind: "unsignedIntVector4", value: new Uint32Array(value) };
  },

  matrix2(value: ArrayLike<number>): Uniform {
    return { kind: "matrix2", value: toFloat32(value, 4, "matrix2") };
  },
  matrix3(value: ArrayLike<number> | Matrix3 | Transform2D): Uniform {
    const array = value instanceof Matrix3 || value instanceof Transform2D ? value.toArray() : value;
    return { kind: "matrix3", value: toFloat32(array, 9, "matrix3") };
  },
  matrix4(value: ArrayLike<number> | Matrix4 | Transform3D): Uniform {
    const array = value instanceof Matrix4 || value instanceof Transform3D ? value.toArray() : value;
    return { kind: "matrix4", value: toFloat32(array, 16, "matrix4") };
  },

  texture(value: Texture): Uniform {
    return { kind: "texture", value };
  },
};
