import { Geometry } from "../geometry/geometry";
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

export type MeshDescriptor = {
  geometry: Geometry;
  material: Material;
};

export class Mesh {
  transform = new Transform3D();
  geometry: Geometry;
  material: Material;
  renderPrimitive = RenderPrimitive.Triangles;
  webglVertexArrayObject: WebGLVertexArrayObject | null = null;

  constructor(descriptor: MeshDescriptor) {
    this.geometry = descriptor.geometry;
    this.material = descriptor.material;
  }

  /**
   * Creates and updates every GPU resource this mesh needs, in the required
   * order: vertex data first, then the material's shader program (the vertex
   * bindings created later in createWebGLVertexArrayObject depend on it), then
   * index data.
   */
  prepare(gl: WebGL2RenderingContext): void {
    for (const attributeBuffer of this.geometry.attributeBuffers) {
      attributeBuffer.buffer.upload(gl);
    }

    for (const interleavedVertexBuffer of this.geometry
      .interleavedVertexBuffers) {
      interleavedVertexBuffer.buffer.upload(gl);
    }

    this.material.getShaderProgram(gl);

    this.geometry.indices?.buffer.upload(gl);
  }

  getWebGLVertexArrayObject(
    gl: WebGL2RenderingContext,
  ): WebGLVertexArrayObject {
    if (this.webglVertexArrayObject === null) {
      this.webglVertexArrayObject = this.createWebGLVertexArrayObject(gl);
    }

    return this.webglVertexArrayObject;
  }

  private createWebGLVertexArrayObject(
    gl: WebGL2RenderingContext,
  ): WebGLVertexArrayObject {
    const webglVertexArrayObject = gl.createVertexArray();

    if (webglVertexArrayObject === null) {
      throw new Error("Failed to create WebGL vertex array object");
    }

    const shaderProgram = this.material.getShaderProgram(gl);

    gl.bindVertexArray(webglVertexArrayObject);

    for (const attributeBuffer of this.geometry.attributeBuffers) {
      attributeBuffer.buffer.bind(gl);
      shaderProgram.setAttributeBuffer(attributeBuffer.layout);
    }

    for (const interleavedVertexBuffer of this.geometry
      .interleavedVertexBuffers) {
      interleavedVertexBuffer.buffer.bind(gl);

      for (const attributeLayout of interleavedVertexBuffer.layouts) {
        shaderProgram.setAttributeBuffer(attributeLayout);
      }
    }

    gl.bindVertexArray(null);
    return webglVertexArrayObject;
  }
}
