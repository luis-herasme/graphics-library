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
  | { kind: "intVector2"; value: number[] | Int32Array }
  | { kind: "intVector3"; value: number[] | Int32Array }
  | { kind: "intVector4"; value: number[] | Int32Array }
  | { kind: "unsignedInt"; value: number }
  | { kind: "unsignedIntVector2"; value: number[] | Uint32Array }
  | { kind: "unsignedIntVector3"; value: number[] | Uint32Array }
  | { kind: "unsignedIntVector4"; value: number[] | Uint32Array }
  | { kind: "matrix2"; value: number[] | Float32Array }
  | { kind: "matrix3"; value: number[] | Float32Array }
  | { kind: "matrix4"; value: number[] | Float32Array }
  | { kind: "texture"; value: Texture };
