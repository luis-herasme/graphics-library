import { ShaderProgram } from "../gpu/shader-program";
import { Uniform } from "../gpu/uniform";
import { UniformBufferObject } from "../gpu/uniform-buffer-object";

export type MaterialDescriptor = {
  vertexShaderSource: string;
  fragmentShaderSource: string;
};

export class Material {
  readonly uniforms = new Map<string, Uniform>();
  readonly uniformBlocks = new Map<string, UniformBufferObject>();
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

  /** The block name must match a `uniform` block in the shader source. */
  setUniformBlock(
    blockName: string,
    uniformBufferObject: UniformBufferObject,
  ): void {
    this.uniformBlocks.set(blockName, uniformBufferObject);
  }

  /**
   * Compiles and links the shader program if that has not happened yet.
   * Runs the expensive work once; safe to call on every draw.
   */
  getShaderProgram(gl: WebGL2RenderingContext): ShaderProgram {
    if (this.shaderProgram === null) {
      this.shaderProgram = new ShaderProgram({
        gl,
        vertexShaderSource: this.vertexShaderSource,
        fragmentShaderSource: this.fragmentShaderSource,
      });
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

    // Uniform blocks get binding points the way textures get texture units:
    // assigned in order on every draw.
    let currentBindingPoint = 0;
    for (const [name, uniformBufferObject] of this.uniformBlocks) {
      uniformBufferObject.bind(gl, currentBindingPoint);
      shaderProgram.setUniformBlock(name, currentBindingPoint);
      currentBindingPoint += 1;
    }
  }
}
