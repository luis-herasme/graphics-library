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

    const projectionMatrix = Uniform.matrix4(camera.projectionMatrix);
    const cameraInverseMatrix = Uniform.matrix4(camera.transform.toMatrix4().inverse());

    for (const mesh of scene) {
      mesh.material.setUniform("transform", Uniform.matrix4(mesh.transform));
      mesh.material.setUniform("projection_matrix", projectionMatrix);
      mesh.material.setUniform("camera_inverse_matrix", cameraInverseMatrix);

      this.render(mesh);
    }
  }

  render(mesh: Mesh): void {
    const gl = this.gl;

    for (const vertexBuffer of mesh.geometry.vertexBuffers) {
      vertexBuffer.buffer.onBeforeRender(gl);
    }

    for (const interleavedVertexBuffer of mesh.geometry.interleavedVertexBuffers) {
      interleavedVertexBuffer.buffer.onBeforeRender(gl);
    }

    mesh.material.onBeforeRender(gl);

    gl.bindVertexArray(mesh.getOrCreateVao(gl));

    const indices = mesh.geometry.indices;

    if (indices !== null) {
      indices.buffer.onBeforeRender(gl);
      indices.buffer.bind(gl);

      if (mesh.geometry.instanceCount !== null) {
        gl.drawElementsInstanced(mesh.renderPrimitive, indices.count, indices.kind, indices.offset, mesh.geometry.instanceCount);
      } else {
        gl.drawElements(mesh.renderPrimitive, indices.count, indices.kind, indices.offset);
      }
    } else if (mesh.geometry.instanceCount !== null) {
      gl.drawArraysInstanced(mesh.renderPrimitive, 0, mesh.geometry.vertexCount, mesh.geometry.instanceCount);
    } else {
      gl.drawArrays(mesh.renderPrimitive, 0, mesh.geometry.vertexCount);
    }
  }
}
