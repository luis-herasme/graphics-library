import { Uniform } from "./uniforms";
import { componentTypeSizeInBytes } from "./attribute-data";
import { VertexLayout } from "./vertex-layout";

const TEXTURE_2D = WebGL2RenderingContext.TEXTURE_2D;
const TEXTURE0 = WebGL2RenderingContext.TEXTURE0;

export type MaterialDescriptor = {
  vertexShaderSource: string;
  fragmentShaderSource: string;
};

export class Material {
  readonly uniforms = new Map<string, Uniform>();
  readonly vertexShaderSource: string;
  readonly fragmentShaderSource: string;

  /** WebGL resources, created lazily on first render. */
  resources: MaterialResources | null = null;

  constructor(descriptor: MaterialDescriptor) {
    this.vertexShaderSource = descriptor.vertexShaderSource;
    this.fragmentShaderSource = descriptor.fragmentShaderSource;
  }

  setUniform(uniformName: string, uniform: Uniform): void {
    this.uniforms.set(uniformName, uniform);
  }

  /**
   * Compiles and links the shader program if that has not happened yet.
   * Runs the expensive work once; safe to call on every draw.
   */
  prepare(gl: WebGL2RenderingContext): MaterialResources {
    if (this.resources === null) {
      this.resources = new MaterialResources({ gl, material: this });
    }

    return this.resources;
  }

  /** Activates the shader program and uploads every uniform value. Runs on every draw. */
  applyUniforms(gl: WebGL2RenderingContext): void {
    const resources = this.prepare(gl);

    gl.useProgram(resources.program);

    let currentTextureUnit = 0;
    for (const [name, uniform] of this.uniforms) {
      if (uniform.kind === "texture") {
        gl.activeTexture(TEXTURE0 + currentTextureUnit);
        gl.bindTexture(TEXTURE_2D, uniform.value.getWebglTexture(gl));
      }

      resources.setUniform(name, uniform, currentTextureUnit);

      if (uniform.kind === "texture") {
        currentTextureUnit += 1;
      }
    }
  }
}

export type MaterialResourcesDescriptor = {
  gl: WebGL2RenderingContext;
  material: Material;
};

export class MaterialResources {
  readonly gl: WebGL2RenderingContext;
  readonly program: WebGLProgram;

  private readonly uniformLocations = new Map<string, WebGLUniformLocation>();
  private readonly attributeLocations = new Map<string, number>();
  private readonly uniformBlockLocations = new Map<string, number>();

  constructor(descriptor: MaterialResourcesDescriptor) {
    const { gl, material } = descriptor;
    const program = gl.createProgram();

    if (program === null) {
      throw new Error("Failed to create WebGL program");
    }

    const vertexShader = MaterialResources.compileShader(
      gl,
      material.vertexShaderSource,
      gl.VERTEX_SHADER,
    );
    const fragmentShader = MaterialResources.compileShader(
      gl,
      material.fragmentShaderSource,
      gl.FRAGMENT_SHADER,
    );

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      let log = gl.getProgramInfoLog(program);

      if (log === null) {
        log = "unknown error";
      }

      throw new Error(`Failed to link WebGL program: ${log}`);
    }

    this.gl = gl;
    this.program = program;
    this.collectUniformLocations();
    this.collectAttributeLocations();
    this.collectUniformBlockLocations();
  }

  private static compileShader(
    gl: WebGL2RenderingContext,
    shaderSource: string,
    shaderType: number,
  ): WebGLShader {
    const shader = gl.createShader(shaderType);

    if (shader === null) {
      throw new Error("Failed to create WebGL shader");
    }

    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      let log = gl.getShaderInfoLog(shader);

      if (log === null) {
        log = "unknown error";
      }

      throw new Error(`Failed to compile shader: ${log}`);
    }

    return shader;
  }

  // UNIFORMS

  setUniform(
    uniformName: string,
    uniform: Uniform,
    currentTextureUnit: number,
  ): void {
    const location = this.uniformLocations.get(uniformName);

    if (location === undefined) {
      // The uniform is not active in the shader (or was optimized out)
      return;
    }

    const gl = this.gl;

    switch (uniform.kind) {
      case "float":
        gl.uniform1f(location, uniform.value);
        break;
      case "vector2":
        gl.uniform2fv(location, uniform.value);
        break;
      case "vector3":
        gl.uniform3fv(location, uniform.value);
        break;
      case "vector4":
        gl.uniform4fv(location, uniform.value);
        break;

      case "int":
        gl.uniform1i(location, uniform.value);
        break;
      case "intVector2":
        gl.uniform2iv(location, uniform.value);
        break;
      case "intVector3":
        gl.uniform3iv(location, uniform.value);
        break;
      case "intVector4":
        gl.uniform4iv(location, uniform.value);
        break;

      case "unsignedInt":
        gl.uniform1ui(location, uniform.value);
        break;
      case "unsignedIntVector2":
        gl.uniform2uiv(location, uniform.value);
        break;
      case "unsignedIntVector3":
        gl.uniform3uiv(location, uniform.value);
        break;
      case "unsignedIntVector4":
        gl.uniform4uiv(location, uniform.value);
        break;

      case "matrix2":
        gl.uniformMatrix2fv(location, false, uniform.value);
        break;
      case "matrix3":
        gl.uniformMatrix3fv(location, false, uniform.value);
        break;
      case "matrix4":
        gl.uniformMatrix4fv(location, false, uniform.value);
        break;

      case "texture":
        gl.uniform1i(location, currentTextureUnit);
        break;
    }
  }

  private collectUniformLocations(): void {
    const gl = this.gl;
    const numberOfUniforms = gl.getProgramParameter(
      this.program,
      gl.ACTIVE_UNIFORMS,
    ) as number;

    for (let i = 0; i < numberOfUniforms; i++) {
      const uniform = gl.getActiveUniform(this.program, i);

      if (uniform === null) {
        continue;
      }

      // Uniforms inside uniform blocks do not have locations
      const location = gl.getUniformLocation(this.program, uniform.name);

      if (location !== null) {
        this.uniformLocations.set(uniform.name, location);
      }
    }
  }

  // ATTRIBUTES

  setAttributeBuffer(vertexLayout: VertexLayout): void {
    const location = this.attributeLocations.get(vertexLayout.name);

    if (location === undefined) {
      return;
    }

    const gl = this.gl;

    if (vertexLayout.numberOfColumns === 1) {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(
        location,
        vertexLayout.componentCount,
        vertexLayout.componentType,
        vertexLayout.normalize,
        vertexLayout.stride,
        vertexLayout.offset,
      );

      if (vertexLayout.divisor !== 0) {
        gl.vertexAttribDivisor(location, vertexLayout.divisor);
      }

      return;
    }

    // Only matrices have more than one column. Each column occupies its own
    // attribute location.
    const componentsPerColumn =
      vertexLayout.componentCount / vertexLayout.numberOfColumns;
    const componentSize = componentTypeSizeInBytes(vertexLayout.componentType);

    for (let i = 0; i < vertexLayout.numberOfColumns; i++) {
      const columnLocation = location + i;
      const offset =
        vertexLayout.offset + i * componentsPerColumn * componentSize;

      gl.enableVertexAttribArray(columnLocation);
      gl.vertexAttribPointer(
        columnLocation,
        componentsPerColumn,
        vertexLayout.componentType,
        vertexLayout.normalize,
        vertexLayout.stride,
        offset,
      );

      if (vertexLayout.divisor !== 0) {
        gl.vertexAttribDivisor(columnLocation, vertexLayout.divisor);
      }
    }
  }

  private collectAttributeLocations(): void {
    const gl = this.gl;
    const numberOfAttributes = gl.getProgramParameter(
      this.program,
      gl.ACTIVE_ATTRIBUTES,
    ) as number;

    for (let i = 0; i < numberOfAttributes; i++) {
      const attribute = gl.getActiveAttrib(this.program, i);

      if (attribute === null) {
        continue;
      }

      this.attributeLocations.set(
        attribute.name,
        gl.getAttribLocation(this.program, attribute.name),
      );
    }
  }

  // UNIFORM BLOCKS

  private collectUniformBlockLocations(): void {
    const gl = this.gl;
    const numberOfUniformBlocks = gl.getProgramParameter(
      this.program,
      gl.ACTIVE_UNIFORM_BLOCKS,
    ) as number;

    for (
      let blockLocation = 0;
      blockLocation < numberOfUniformBlocks;
      blockLocation++
    ) {
      const name = gl.getActiveUniformBlockName(this.program, blockLocation);

      if (name !== null) {
        this.uniformBlockLocations.set(name, blockLocation);
      }
    }
  }

  setUniformBlock(name: string, bindingPoint: number): void {
    const blockLocation = this.uniformBlockLocations.get(name);

    if (blockLocation === undefined) {
      return;
    }

    this.gl.uniformBlockBinding(this.program, blockLocation, bindingPoint);
  }

  dispose(): void {
    this.gl.deleteProgram(this.program);
  }
}
