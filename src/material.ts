import { Uniform } from "./uniforms";
import { TYPED_ARRAY_FOR_COMPONENT_TYPE } from "./attribute-data";
import { AttributeLayout } from "./attribute-layout";

export type MaterialDescriptor = {
  vertexShaderSource: string;
  fragmentShaderSource: string;
};

export class Material {
  readonly uniforms = new Map<string, Uniform>();
  readonly vertexShaderSource: string;
  readonly fragmentShaderSource: string;

  /** Created lazily on first render. */
  shaderProgram: ShaderProgram | null = null;

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
  getShaderProgram(gl: WebGL2RenderingContext): ShaderProgram {
    if (this.shaderProgram === null) {
      this.shaderProgram = new ShaderProgram({ gl, material: this });
    }

    return this.shaderProgram;
  }

  /** Activates the shader program and uploads every uniform value. Runs on every draw. */
  applyUniforms(gl: WebGL2RenderingContext): void {
    const shaderProgram = this.getShaderProgram(gl);

    gl.useProgram(shaderProgram.webglProgram);

    let currentTextureUnit = 0;
    for (const [name, uniform] of this.uniforms) {
      if (uniform.kind === "texture") {
        gl.activeTexture(gl.TEXTURE0 + currentTextureUnit);
        gl.bindTexture(gl.TEXTURE_2D, uniform.value.getWebGLTexture(gl));
        shaderProgram.setUniform(name, uniform, currentTextureUnit);
        currentTextureUnit += 1;
        continue;
      }

      shaderProgram.setUniform(name, uniform, currentTextureUnit);
    }
  }
}

export type ShaderProgramDescriptor = {
  gl: WebGL2RenderingContext;
  material: Material;
};

export class ShaderProgram {
  readonly gl: WebGL2RenderingContext;
  readonly webglProgram: WebGLProgram;

  private readonly uniformLocations = new Map<string, WebGLUniformLocation>();
  private readonly attributeLocations = new Map<string, number>();
  private readonly uniformBlockLocations = new Map<string, number>();

  constructor(descriptor: ShaderProgramDescriptor) {
    const { gl, material } = descriptor;
    const webglProgram = gl.createProgram();

    if (webglProgram === null) {
      throw new Error("Failed to create WebGL program");
    }

    const vertexShader = ShaderProgram.compileShader(
      gl,
      material.vertexShaderSource,
      gl.VERTEX_SHADER,
    );
    const fragmentShader = ShaderProgram.compileShader(
      gl,
      material.fragmentShaderSource,
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

  setAttributeBuffer(attributeLayout: AttributeLayout): void {
    const location = this.attributeLocations.get(attributeLayout.name);

    if (location === undefined) {
      return;
    }

    const gl = this.gl;

    if (attributeLayout.numberOfColumns === 1) {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(
        location,
        attributeLayout.componentCount,
        attributeLayout.componentType,
        attributeLayout.normalize,
        attributeLayout.stride,
        attributeLayout.offset,
      );

      if (attributeLayout.divisor !== 0) {
        gl.vertexAttribDivisor(location, attributeLayout.divisor);
      }

      return;
    }

    // Only matrices have more than one column. Each column occupies its own
    // attribute location.
    const componentsPerColumn =
      attributeLayout.componentCount / attributeLayout.numberOfColumns;
    const componentSize =
      TYPED_ARRAY_FOR_COMPONENT_TYPE[attributeLayout.componentType]
        .BYTES_PER_ELEMENT;

    for (let i = 0; i < attributeLayout.numberOfColumns; i++) {
      const columnLocation = location + i;
      const offset =
        attributeLayout.offset + i * componentsPerColumn * componentSize;

      gl.enableVertexAttribArray(columnLocation);
      gl.vertexAttribPointer(
        columnLocation,
        componentsPerColumn,
        attributeLayout.componentType,
        attributeLayout.normalize,
        attributeLayout.stride,
        offset,
      );

      if (attributeLayout.divisor !== 0) {
        gl.vertexAttribDivisor(columnLocation, attributeLayout.divisor);
      }
    }
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
}
