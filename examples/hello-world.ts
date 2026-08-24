import { Material, Mesh, quad, Renderer } from "../src/index";

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
const material = new Material({
  vertexShaderSource: VERTEX_SHADER_SOURCE,
  fragmentShaderSource: FRAGMENT_SHADER_SOURCE,
});
const geometry = quad();
const mesh = new Mesh({ geometry, material });

function frame() {
  renderer.clear();
  renderer.render(mesh);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
