import {
  Geometry,
  Material,
  Mesh,
  Renderer,
  requestAnimationFrameLoop,
} from "../src/index";

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;

void main() {
    gl_Position = vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

out vec4 fragment_color;

void main() {
    fragment_color = vec4(1.0, 0.0, 0.0, 1.0);
}
`;

const renderer = new Renderer();
const material = new Material(VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
const geometry = Geometry.quad();
const mesh = new Mesh(geometry, material);

requestAnimationFrameLoop(() => {
  renderer.clear();
  renderer.render(mesh);
});
