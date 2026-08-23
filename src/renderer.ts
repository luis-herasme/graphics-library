import { PerspectiveCamera } from "./camera";
import { Mesh } from "./mesh";
import { Uniform } from "./uniforms";

export class Renderer {
  readonly gl: WebGL2RenderingContext;
  readonly canvas: HTMLCanvasElement;

  constructor(canvas?: HTMLCanvasElement) {
    if (canvas === undefined) {
      canvas = document.createElement("canvas");
      document.body.appendChild(canvas);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    const gl = canvas.getContext("webgl2");

    if (gl === null) {
      throw new Error("Failed to get a WebGL2 context");
    }

    gl.enable(gl.DEPTH_TEST);

    this.gl = gl;
    this.canvas = canvas;
  }

  clear(): void {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  handleWindowResize(camera: PerspectiveCamera): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (width !== this.canvas.width || height !== this.canvas.height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      this.canvas.width = width;
      this.canvas.height = height;

      this.gl.viewport(0, 0, width, height);
    }
  }

  renderScene(scene: Mesh[], camera: PerspectiveCamera): void {
    this.clear();
    this.handleWindowResize(camera);

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

    gl.bindVertexArray(mesh.getOrCreateVao(gl));

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
