import { Texture } from "./texture";

/**
 * A value for a shader uniform. Vector and matrix values may be plain number
 * arrays or typed arrays; matrices are column-major.
 */
export type Uniform =
  | { kind: "float"; value: number }
  | { kind: "vector2"; value: number[] | Float32Array }
  | { kind: "vector3"; value: number[] | Float32Array }
  | { kind: "vector4"; value: number[] | Float32Array }
  | { kind: "int"; value: number }
  | { kind: "int-vector2"; value: number[] | Int32Array }
  | { kind: "int-vector3"; value: number[] | Int32Array }
  | { kind: "int-vector4"; value: number[] | Int32Array }
  | { kind: "unsigned-int"; value: number }
  | { kind: "unsigned-int-vector2"; value: number[] | Uint32Array }
  | { kind: "unsigned-int-vector3"; value: number[] | Uint32Array }
  | { kind: "unsigned-int-vector4"; value: number[] | Uint32Array }
  | { kind: "matrix2"; value: number[] | Float32Array }
  | { kind: "matrix3"; value: number[] | Float32Array }
  | { kind: "matrix4"; value: number[] | Float32Array }
  | { kind: "texture"; value: Texture };
