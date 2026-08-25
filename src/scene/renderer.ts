import { PerspectiveCamera } from "./camera";
import { Mesh } from "./mesh";
import { Uniform } from "../gpu/uniform";

/** Red, green, blue and alpha, each in the [0, 1] range. */
export type ClearColor = [number, number, number, number];

export type RendererDescriptor = {
  /** Defaults to a new full-window canvas appended to the document body. */
  canvas?: HTMLCanvasElement;
  /** Defaults to opaque black. */
  clearColor?: ClearColor;
};

export class Renderer {
  readonly gl: WebGL2RenderingContext;
  readonly canvas: HTMLCanvasElement;
  clearColor: ClearColor;

  /** Only a canvas the renderer created is kept at the window's size. */
  private readonly createdCanvas: boolean;

  constructor(descriptor: RendererDescriptor = {}) {
    let canvas = descriptor.canvas;
    let clearColor = descriptor.clearColor;

    this.createdCanvas = canvas === undefined;

    if (canvas === undefined) {
      canvas = document.createElement("canvas");
      document.body.appendChild(canvas);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    if (clearColor === undefined) {
      clearColor = [0, 0, 0, 1];
    }

    const gl = canvas.getContext("webgl2");

    if (gl === null) {
      throw new Error("Failed to get a WebGL2 context");
    }

    gl.enable(gl.DEPTH_TEST);

    this.gl = gl;
    this.canvas = canvas;
    this.clearColor = clearColor;
  }

  clear(): void {
    const gl = this.gl;
    const [red, green, blue, alpha] = this.clearColor;
    gl.clearColor(red, green, blue, alpha);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  /**
   * Keeps everything that depends on the canvas size in sync: the canvas
   * itself when the renderer created it, the camera's aspect ratio, and the
   * viewport.
   */
  handleResize(camera: PerspectiveCamera): void {
    const canvas = this.canvas;

    if (
      this.createdCanvas &&
      (canvas.width !== window.innerWidth ||
        canvas.height !== window.innerHeight)
    ) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    const aspect = canvas.width / canvas.height;

    if (aspect !== camera.aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }

    this.gl.viewport(0, 0, canvas.width, canvas.height);
  }

  renderScene(scene: Mesh[], camera: PerspectiveCamera): void {
    this.clear();
    this.handleResize(camera);

    const projectionMatrix: Uniform = {
      kind: "matrix4",
      value: camera.projectionMatrix.elements,
    };
    const cameraInverseMatrix: Uniform = {
      kind: "matrix4",
      value: camera.transform.toMatrix4().inverse().elements,
    };

    for (const mesh of scene) {
      mesh.material.setUniform("transform", {
        kind: "matrix4",
        value: mesh.transform.toMatrix4().elements,
      });
      mesh.material.setUniform("projection_matrix", projectionMatrix);
      mesh.material.setUniform("camera_inverse_matrix", cameraInverseMatrix);

      this.render(mesh);
    }
  }

  render(mesh: Mesh): void {
    const gl = this.gl;

    mesh.prepare(gl);
    mesh.material.applyUniforms(gl);

    gl.bindVertexArray(mesh.getWebGLVertexArrayObject(gl));

    const indices = mesh.geometry.indices;

    if (indices !== null) {
      indices.buffer.bind(gl);

      if (mesh.geometry.instanceCount !== null) {
        gl.drawElementsInstanced(
          mesh.renderPrimitive,
          indices.count,
          indices.elementType,
          0,
          mesh.geometry.instanceCount,
        );
      } else {
        gl.drawElements(
          mesh.renderPrimitive,
          indices.count,
          indices.elementType,
          0,
        );
      }
    } else if (mesh.geometry.instanceCount !== null) {
      gl.drawArraysInstanced(
        mesh.renderPrimitive,
        0,
        mesh.geometry.vertexCount,
        mesh.geometry.instanceCount,
      );
    } else {
      gl.drawArrays(mesh.renderPrimitive, 0, mesh.geometry.vertexCount);
    }
  }
}
