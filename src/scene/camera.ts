import { Matrix4, Transform3D } from "../math";

export type PerspectiveCameraDescriptor = {
  /** Vertical field of view, in radians. Defaults to 45 degrees. */
  fov?: number;
  /** Defaults to the window's aspect ratio. */
  aspect?: number;
  /** Defaults to 0.1. */
  near?: number;
  /** Defaults to 100. */
  far?: number;
};

export class PerspectiveCamera {
  fov: number;
  aspect: number;
  near: number;
  far: number;

  transform = new Transform3D();
  projectionMatrix = Matrix4.zero();

  constructor(descriptor: PerspectiveCameraDescriptor = {}) {
    let fov = descriptor.fov;
    let aspect = descriptor.aspect;
    let near = descriptor.near;
    let far = descriptor.far;

    if (fov === undefined) {
      fov = (45 * Math.PI) / 180;
    }

    if (aspect === undefined) {
      aspect = window.innerWidth / window.innerHeight;
    }

    if (near === undefined) {
      near = 0.1;
    }

    if (far === undefined) {
      far = 100;
    }

    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.updateProjectionMatrix();
  }

  updateProjectionMatrix(): void {
    this.projectionMatrix = Matrix4.perspective(
      this.fov,
      this.aspect,
      this.near,
      this.far,
    );
  }
}
