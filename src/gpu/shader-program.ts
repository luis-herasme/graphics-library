import { Uniform } from "./uniform";

export type ShaderProgramDescriptor = {
  gl: WebGL2RenderingContext;
  vertexShaderSource: string;
  fragmentShaderSource: string;
};

export class ShaderProgram {
  readonly gl: WebGL2RenderingContext;
  readonly webglProgram: WebGLProgram;

  private readonly uniformLocations = new Map<string, WebGLUniformLocation>();
  private readonly attributeLocations = new Map<string, number>();
  private readonly uniformBlockLocations = new Map<string, number>();

  constructor(descriptor: ShaderProgramDescriptor) {
    const gl = descriptor.gl;
    const webglProgram = gl.createProgram();

    if (webglProgram === null) {
      throw new Error("Failed to create WebGL program");
    }

    const vertexShader = ShaderProgram.compileShader(
      gl,
      descriptor.vertexShaderSource,
      gl.VERTEX_SHADER,
    );
    const fragmentShader = ShaderProgram.compileShader(
      gl,
      descriptor.fragmentShaderSource,
      gl.FRAGMENT_SHADER,
    );

    gl.attachShader(webglProgram, vertexShader);
    gl.attachShader(webglProgram, fragmentShader);
    gl.linkProgram(webglProgram);

    if (!gl.getProgramParameter(webglProgram, gl.LINK_STATUS)) {
      let log = gl.getProgramInfoLog(webglProgram);

      if (log === null) {
        log = "unknown error";
      }

      throw new Error(`Failed to link WebGL program: ${log}`);
    }

    // The linked program keeps its own copy; the shader objects can go.
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    this.gl = gl;
    this.webglProgram = webglProgram;
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
      case "int-vector2":
        gl.uniform2iv(location, uniform.value);
        break;
      case "int-vector3":
        gl.uniform3iv(location, uniform.value);
        break;
      case "int-vector4":
        gl.uniform4iv(location, uniform.value);
        break;

      case "unsigned-int":
        gl.uniform1ui(location, uniform.value);
        break;
      case "unsigned-int-vector2":
        gl.uniform2uiv(location, uniform.value);
        break;
      case "unsigned-int-vector3":
        gl.uniform3uiv(location, uniform.value);
        break;
      case "unsigned-int-vector4":
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
      this.webglProgram,
      gl.ACTIVE_UNIFORMS,
    ) as number;

    for (let i = 0; i < numberOfUniforms; i++) {
      const uniform = gl.getActiveUniform(this.webglProgram, i);

      if (uniform === null) {
        continue;
      }

      // Uniforms inside uniform blocks do not have locations
      const location = gl.getUniformLocation(this.webglProgram, uniform.name);

      if (location !== null) {
        this.uniformLocations.set(uniform.name, location);
      }
    }
  }

  // ATTRIBUTES

  /** Returns undefined when the shader does not use the attribute. */
  getAttributeLocation(attributeName: string): number | undefined {
    return this.attributeLocations.get(attributeName);
  }

  private collectAttributeLocations(): void {
    const gl = this.gl;
    const numberOfAttributes = gl.getProgramParameter(
      this.webglProgram,
      gl.ACTIVE_ATTRIBUTES,
    ) as number;

    for (let i = 0; i < numberOfAttributes; i++) {
      const attribute = gl.getActiveAttrib(this.webglProgram, i);

      if (attribute === null) {
        continue;
      }

      this.attributeLocations.set(
        attribute.name,
        gl.getAttribLocation(this.webglProgram, attribute.name),
      );
    }
  }

  // UNIFORM BLOCKS

  private collectUniformBlockLocations(): void {
    const gl = this.gl;
    const numberOfUniformBlocks = gl.getProgramParameter(
      this.webglProgram,
      gl.ACTIVE_UNIFORM_BLOCKS,
    ) as number;

    for (
      let blockLocation = 0;
      blockLocation < numberOfUniformBlocks;
      blockLocation++
    ) {
      const name = gl.getActiveUniformBlockName(
        this.webglProgram,
        blockLocation,
      );

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

    this.gl.uniformBlockBinding(this.webglProgram, blockLocation, bindingPoint);
  }

  /** Frees the GPU program. Unlike the lazy resources, a deleted program is gone for good. */
  delete(): void {
    this.gl.deleteProgram(this.webglProgram);
  }
}
