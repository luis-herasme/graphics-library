import { Matrix3, Matrix4, Quaternion, Vector2, Vector3 } from "./math";

export class Transform3D {
  scale: Vector3 = Vector3.one();
  rotation: Quaternion = Quaternion.identity();
  translation: Vector3 = Vector3.zero();

  static fromMatrix4(matrix: Matrix4): Transform3D {
    const { scale, rotation, translation } = matrix.toScaleRotationTranslation();

    const transform = new Transform3D();
    transform.scale = scale;
    transform.rotation = rotation;
    transform.translation = translation;
    return transform;
  }

  clone(): Transform3D {
    const transform = new Transform3D();
    transform.scale = this.scale.clone();
    transform.rotation = this.rotation.clone();
    transform.translation = this.translation.clone();
    return transform;
  }

  toMatrix4(): Matrix4 {
    return Matrix4.fromScaleRotationTranslation(this.scale, this.rotation, this.translation);
  }

  /** Returns the transform as a column-major array of 16 elements. */
  toArray(): Float32Array {
    return this.toMatrix4().toArray();
  }
}

export class Transform2D {
  scale: Vector2 = Vector2.one();
  rotation = 0; // radians
  translation: Vector2 = Vector2.zero();

  clone(): Transform2D {
    const transform = new Transform2D();
    transform.scale = this.scale.clone();
    transform.rotation = this.rotation;
    transform.translation = this.translation.clone();
    return transform;
  }

  toMatrix3(): Matrix3 {
    return Matrix3.fromScaleAngleTranslation(this.scale, this.rotation, this.translation);
  }

  /** Returns the transform as a column-major array of 9 elements. */
  toArray(): Float32Array {
    return this.toMatrix3().toArray();
  }
}
