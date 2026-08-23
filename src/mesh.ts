import { Geometry } from "./geometry";
import { Material } from "./material";
import { Transform3D } from "./transform";

/** https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/drawArraysInstanced#mode */
export enum RenderPrimitive {
  Points = WebGL2RenderingContext.POINTS,
  Lines = WebGL2RenderingContext.LINES,
  LineLoop = WebGL2RenderingContext.LINE_LOOP,
  LineStrip = WebGL2RenderingContext.LINE_STRIP,
  Triangles = WebGL2RenderingContext.TRIANGLES,
  TriangleStrip = WebGL2RenderingContext.TRIANGLE_STRIP,
  TriangleFan = WebGL2RenderingContext.TRIANGLE_FAN,
}

export class Mesh {
  transform = new Transform3D();
  geometry: Geometry;
  material: Material;
  renderPrimitive = RenderPrimitive.Triangles;
  vao: WebGLVertexArrayObject | null = null;

  constructor(geometry: Geometry, material: Material) {
    this.geometry = geometry;
    this.material = material;
  }

  /**
   * Creates and updates every GPU resource this mesh needs, in the required
   * order: vertex data first, then the material's shader program (the vertex
   * bindings created later in getOrCreateVao depend on it), then index data.
   */
  prepare(gl: WebGL2RenderingContext): void {
    for (const vertexBuffer of this.geometry.vertexBuffers) {
      vertexBuffer.buffer.onBeforeRender(gl);
    }

    for (const interleavedVertexBuffer of this.geometry
      .interleavedVertexBuffers) {
      interleavedVertexBuffer.buffer.onBeforeRender(gl);
    }

    this.material.prepare(gl);

    this.geometry.indices?.buffer.onBeforeRender(gl);
  }

  getOrCreateVao(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
    if (this.vao === null) {
      this.vao = this.createVao(gl);
    }

    return this.vao;
  }

  private createVao(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
    const vao = gl.createVertexArray();

    if (vao === null) {
      throw new Error("Failed to create WebGL vertex array object");
    }

    const resources = this.material.prepare(gl);

    gl.bindVertexArray(vao);

    for (const vertexBuffer of this.geometry.vertexBuffers) {
      vertexBuffer.buffer.bind(gl);
      resources.setAttributeBuffer(vertexBuffer.layout);
    }

    for (const interleavedVertexBuffer of this.geometry
      .interleavedVertexBuffers) {
      interleavedVertexBuffer.buffer.bind(gl);

      for (const vertexLayout of interleavedVertexBuffer.layouts) {
        resources.setAttributeBuffer(vertexLayout);
      }
    }

    gl.bindVertexArray(null);
    return vao;
  }
}
