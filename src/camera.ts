import { Matrix4 } from "./math";
import { Transform3D } from "./transform";

export class PerspectiveCamera {
  fov: number; // radians
  aspect: number;
  near: number;
  far: number;

  transform = new Transform3D();
  projectionMatrix = Matrix4.zero();

  constructor(fov: number, aspect: number, near: number, far: number) {
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.updateProjectionMatrix();
  }

  /** A camera with a 45 degree field of view and the window's aspect ratio. */
  static default(): PerspectiveCamera {
    return new PerspectiveCamera((45 * Math.PI) / 180, window.innerWidth / window.innerHeight, 0.1, 100);
  }

  updateProjectionMatrix(): void {
    this.projectionMatrix = Matrix4.perspective(this.fov, this.aspect, this.near, this.far);
  }
}
