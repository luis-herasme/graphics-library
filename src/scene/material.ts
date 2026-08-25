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
}
