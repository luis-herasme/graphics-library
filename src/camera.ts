import { Matrix4 } from "./math";
import { Transform3D } from "./transform";

export type PerspectiveCameraDescriptor = {
  /** Vertical field of view, in radians. */
  fov: number;
  aspect: number;
  near: number;
  far: number;
};

export class PerspectiveCamera {
  fov: number;
  aspect: number;
  near: number;
  far: number;

  transform = new Transform3D();
  projectionMatrix = Matrix4.zero();

  constructor(descriptor: PerspectiveCameraDescriptor) {
    this.fov = descriptor.fov;
    this.aspect = descriptor.aspect;
    this.near = descriptor.near;
    this.far = descriptor.far;
    this.updateProjectionMatrix();
  }

  /** A camera with a 45 degree field of view and the window's aspect ratio. */
  static default(): PerspectiveCamera {
    return new PerspectiveCamera({
      fov: (45 * Math.PI) / 180,
      aspect: window.innerWidth / window.innerHeight,
      near: 0.1,
      far: 100,
    });
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
