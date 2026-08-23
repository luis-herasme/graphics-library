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

    const resources = this.material.getOrCreateResources(gl);

    gl.bindVertexArray(vao);

    for (const vertexBuffer of this.geometry.vertexBuffers) {
      vertexBuffer.buffer.bind(gl);
      resources.setAttributeBuffer(vertexBuffer.layout);
    }

    for (const interleavedVertexBuffer of this.geometry.interleavedVertexBuffers) {
      interleavedVertexBuffer.buffer.bind(gl);

      for (const vertexLayout of interleavedVertexBuffer.layouts) {
        resources.setAttributeBuffer(vertexLayout);
      }
    }

    gl.bindVertexArray(null);
    return vao;
  }
}
