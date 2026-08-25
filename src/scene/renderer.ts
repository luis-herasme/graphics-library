import { PerspectiveCamera } from "./camera";
import { Material } from "./material";
import { Mesh } from "./mesh";
import { Geometry } from "../geometry/geometry";
import { GpuBuffer } from "../gpu/gpu-buffer";
import { ShaderProgram } from "../gpu/shader-program";
import { Texture } from "../gpu/texture";
import { Uniform } from "../gpu/uniform";
import { UniformBufferObject } from "../gpu/uniform-buffer-object";

/** Red, green, blue and alpha, each in the [0, 1] range. */
export type ClearColor = [number, number, number, number];

export type RendererDescriptor = {
  /** Defaults to a new full-window canvas appended to the document body. */
  canvas?: HTMLCanvasElement;
  /** Defaults to opaque black. */
  clearColor?: ClearColor;
};

/** A GPU buffer this renderer created, and the version of the bytes it holds. */
type UploadedGpuBuffer = {
  webglBuffer: WebGLBuffer;
  version: number;
};

export class Renderer {
  readonly gl: WebGL2RenderingContext;
  readonly canvas: HTMLCanvasElement;
  clearColor: ClearColor;

  /** Only a canvas the renderer created is kept at the window's size. */
  private readonly createdCanvas: boolean;

  private readonly buffers = new WeakMap<GpuBuffer, UploadedGpuBuffer>();
  private readonly textures = new WeakMap<Texture, WebGLTexture>();
  private readonly shaderPrograms = new WeakMap<Material, ShaderProgram>();
  private readonly vertexArrayObjects = new WeakMap<
    Mesh,
    WebGLVertexArrayObject
  >();

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

    // Resources are created and updated in the required order: vertex data
    // first, then the material's shader program (the vertex bindings created
    // later in getWebGLVertexArrayObject depend on it), then index data.
    for (const vertexBuffer of mesh.geometry.vertexBuffers) {
      this.getWebGLBuffer(vertexBuffer.buffer);
    }

    const shaderProgram = this.getShaderProgram(mesh.material);

    if (mesh.geometry.indices !== null) {
      this.getWebGLBuffer(mesh.geometry.indices.buffer);
    }

    this.applyUniforms(mesh.material, shaderProgram);

    gl.bindVertexArray(this.getWebGLVertexArrayObject(mesh));

    const indices = mesh.geometry.indices;

    if (indices !== null) {
      gl.bindBuffer(
        gl.ELEMENT_ARRAY_BUFFER,
        this.getWebGLBuffer(indices.buffer),
      );

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

  /** Creates this renderer's copy on the first call, then re-uploads only when the bytes changed. */
  private getWebGLBuffer(buffer: GpuBuffer): WebGLBuffer {
    let entry = this.buffers.get(buffer);

    if (entry === undefined) {
      entry = {
        webglBuffer: buffer.createWebGLBuffer(this.gl),
        version: buffer.version,
      };
      this.buffers.set(buffer, entry);
    }

    if (entry.version !== buffer.version) {
      buffer.uploadTo(this.gl, entry.webglBuffer);
      entry.version = buffer.version;
    }

    return entry.webglBuffer;
  }

  private getWebGLTexture(texture: Texture): WebGLTexture {
    let webglTexture = this.textures.get(texture);

    if (webglTexture === undefined) {
      webglTexture = texture.createWebGLTexture(this.gl);
      this.textures.set(texture, webglTexture);
    }

    return webglTexture;
  }

  /** Compiles and links on the first call; the expensive work runs once. */
  private getShaderProgram(material: Material): ShaderProgram {
    let shaderProgram = this.shaderPrograms.get(material);

    if (shaderProgram === undefined) {
      shaderProgram = new ShaderProgram({
        gl: this.gl,
        vertexShaderSource: material.vertexShaderSource,
        fragmentShaderSource: material.fragmentShaderSource,
      });
      this.shaderPrograms.set(material, shaderProgram);
    }

    return shaderProgram;
  }

  private getWebGLVertexArrayObject(mesh: Mesh): WebGLVertexArrayObject {
    let webglVertexArrayObject = this.vertexArrayObjects.get(mesh);

    if (webglVertexArrayObject === undefined) {
      webglVertexArrayObject = this.createWebGLVertexArrayObject(mesh);
      this.vertexArrayObjects.set(mesh, webglVertexArrayObject);
    }

    return webglVertexArrayObject;
  }

  private createWebGLVertexArrayObject(mesh: Mesh): WebGLVertexArrayObject {
    const gl = this.gl;

    // The shader program and every buffer must be fetched before binding the
    // vertex array object: creating or uploading a buffer binds it, which
    // would leak into the vertex array object's recorded state.
    const shaderProgram = this.getShaderProgram(mesh.material);
    const webglBuffers = mesh.geometry.vertexBuffers.map((vertexBuffer) =>
      this.getWebGLBuffer(vertexBuffer.buffer),
    );

    const webglVertexArrayObject = gl.createVertexArray();

    if (webglVertexArrayObject === null) {
      throw new Error("Failed to create WebGL vertex array object");
    }

    gl.bindVertexArray(webglVertexArrayObject);

    for (let index = 0; index < mesh.geometry.vertexBuffers.length; index++) {
      mesh.geometry.vertexBuffers[index].bindAttributes(
        gl,
        webglBuffers[index],
        shaderProgram,
      );
    }

    gl.bindVertexArray(null);
    return webglVertexArrayObject;
  }

  /** Activates the shader program and uploads every uniform value. Runs on every draw. */
  private applyUniforms(
    material: Material,
    shaderProgram: ShaderProgram,
  ): void {
    const gl = this.gl;

    gl.useProgram(shaderProgram.webglProgram);

    let currentTextureUnit = 0;
    for (const [name, uniform] of material.uniforms) {
      if (uniform.kind === "texture") {
        gl.activeTexture(gl.TEXTURE0 + currentTextureUnit);
        gl.bindTexture(gl.TEXTURE_2D, this.getWebGLTexture(uniform.value));
        shaderProgram.setUniform(name, uniform, currentTextureUnit);
        currentTextureUnit += 1;
        continue;
      }

      shaderProgram.setUniform(name, uniform, currentTextureUnit);
    }

    // Uniform blocks get binding points the way textures get texture units:
    // assigned in order on every draw.
    let currentBindingPoint = 0;
    for (const [name, uniformBufferObject] of material.uniformBlocks) {
      gl.bindBufferBase(
        gl.UNIFORM_BUFFER,
        currentBindingPoint,
        this.getWebGLBuffer(uniformBufferObject.buffer),
      );
      shaderProgram.setUniformBlock(name, currentBindingPoint);
      currentBindingPoint += 1;
    }
  }

  private deleteBuffer(buffer: GpuBuffer): void {
    const entry = this.buffers.get(buffer);

    if (entry !== undefined) {
      this.gl.deleteBuffer(entry.webglBuffer);
      this.buffers.delete(buffer);
    }
  }

  /** Frees this renderer's GPU buffers for the geometry. The geometry stays valid; the next draw recreates them. */
  deleteGeometry(geometry: Geometry): void {
    for (const vertexBuffer of geometry.vertexBuffers) {
      this.deleteBuffer(vertexBuffer.buffer);
    }

    if (geometry.indices !== null) {
      this.deleteBuffer(geometry.indices.buffer);
    }
  }

  /** Frees this renderer's GPU texture. The texture stays valid; the next draw recreates it. */
  deleteTexture(texture: Texture): void {
    const webglTexture = this.textures.get(texture);

    if (webglTexture !== undefined) {
      this.gl.deleteTexture(webglTexture);
      this.textures.delete(texture);
    }
  }

  /**
   * Frees this renderer's shader program for the material; the next draw
   * compiles it again. Textures and uniform buffer objects can be shared
   * between materials, so they are not deleted here.
   */
  deleteMaterial(material: Material): void {
    const shaderProgram = this.shaderPrograms.get(material);

    if (shaderProgram !== undefined) {
      shaderProgram.delete();
      this.shaderPrograms.delete(material);
    }
  }

  /**
   * Frees this renderer's vertex array object for the mesh; the next draw
   * rebuilds it. The geometry and material can be shared between meshes, so
   * they are not deleted here.
   */
  deleteMesh(mesh: Mesh): void {
    const webglVertexArrayObject = this.vertexArrayObjects.get(mesh);

    if (webglVertexArrayObject !== undefined) {
      this.gl.deleteVertexArray(webglVertexArrayObject);
      this.vertexArrayObjects.delete(mesh);
    }
  }

  /** Frees this renderer's GPU buffer for the uniform buffer object. The object stays valid; the next draw recreates it. */
  deleteUniformBufferObject(uniformBufferObject: UniformBufferObject): void {
    this.deleteBuffer(uniformBufferObject.buffer);
  }
}
