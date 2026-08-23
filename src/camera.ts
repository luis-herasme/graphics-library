import { Matrix4 } from "./math";
import { Transform3D } from "./transform";

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

/** A 45 degree field of view camera that fills the window. */
function defaultPerspectiveCamera(): Required<PerspectiveCameraDescriptor> {
  return {
    fov: (45 * Math.PI) / 180,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 100,
  };
}

export class PerspectiveCamera {
  fov: number;
  aspect: number;
  near: number;
  far: number;

  transform = new Transform3D();
  projectionMatrix = Matrix4.zero();

  constructor(descriptor: PerspectiveCameraDescriptor = {}) {
    const settings = { ...defaultPerspectiveCamera(), ...descriptor };

    this.fov = settings.fov;
    this.aspect = settings.aspect;
    this.near = settings.near;
    this.far = settings.far;
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
