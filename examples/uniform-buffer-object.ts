import {
  Geometry,
  Material,
  Mesh,
  Renderer,
  Uniform,
  UniformBufferObject,
  requestAnimationFrameLoop,
  toBytes,
} from "../src/index";

const VERTEX_SHADER_SOURCE = `#version 300 es
layout(std140) uniform Colors {
    vec4 colors[3];
};

uniform vec2 translation;
uniform uint color_index;
in vec2 position;
out vec4 v_color;

void main() {
    v_color = colors[color_index];
    gl_Position = vec4(position + translation, 0.0, 2.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec4 v_color;
out vec4 fragment_color;

void main() {
    fragment_color = v_color;
}
`;

const renderer = new Renderer();
const material = new Material(VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
const geometry = Geometry.quad();
const mesh = new Mesh(geometry, material);

const bindingPoint = 1;

// UBO #1
// prettier-ignore
const colors = new Float32Array([
  1.0, 0.0, 0.0, 1.0, // colors[0]
  0.0, 1.0, 0.0, 1.0, // colors[1]
  0.0, 0.0, 1.0, 1.0, // colors[2]
]);
const uniformBufferObject = new UniformBufferObject(renderer, toBytes(colors));

// UBO #2
// prettier-ignore
const colors2 = new Float32Array([
  1.0, 0.5, 0.5, 1.0, // colors[0]
  0.5, 1.0, 0.5, 1.0, // colors[1]
  0.5, 0.5, 1.0, 1.0, // colors[2]
]);
const uniformBufferObject2 = new UniformBufferObject(renderer, toBytes(colors2));

mesh.material.prepare(renderer.gl).setUniformBlock("Colors", bindingPoint);

requestAnimationFrameLoop(() => {
  renderer.clear();

  uniformBufferObject.setBindingPoint(bindingPoint);
  mesh.material.setUniform("translation", Uniform.vector2([-0.25, -0.25]));
  mesh.material.setUniform("color_index", Uniform.unsignedInt(0));
  renderer.render(mesh);

  mesh.material.setUniform("translation", Uniform.vector2([0, 0]));
  mesh.material.setUniform("color_index", Uniform.unsignedInt(1));
  renderer.render(mesh);

  mesh.material.setUniform("translation", Uniform.vector2([0.25, 0.25]));
  mesh.material.setUniform("color_index", Uniform.unsignedInt(2));
  renderer.render(mesh);

  uniformBufferObject2.setBindingPoint(bindingPoint);
  mesh.material.setUniform("translation", Uniform.vector2([-0.25, 0.75]));
  mesh.material.setUniform("color_index", Uniform.unsignedInt(0));
  renderer.render(mesh);

  mesh.material.setUniform("translation", Uniform.vector2([0, 1]));
  mesh.material.setUniform("color_index", Uniform.unsignedInt(1));
  renderer.render(mesh);

  mesh.material.setUniform("translation", Uniform.vector2([0.25, 1.25]));
  mesh.material.setUniform("color_index", Uniform.unsignedInt(2));
  renderer.render(mesh);
});
