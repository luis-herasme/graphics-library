import { Geometry, Material, Mesh, Renderer, VertexBuffer } from "../src/index";

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 position;
in vec3 color;

out vec3 v_color;

void main() {
    v_color = color;
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_color;
out vec4 fragment_color;

void main() {
    fragment_color = vec4(v_color, 1.0);
}
`;

// prettier-ignore
const POSITIONS = new Float32Array([
  0, 0.75,      // Top
  -0.75, -0.75, // Bottom left
  0.75, -0.75,  // Bottom right
]);

// prettier-ignore
const COLORS = new Uint8Array([
  255, 0, 0, // Top
  0, 255, 0, // Bottom left
  0, 0, 255, // Bottom right
]);

// Passing both attributes to one buffer interleaves them: each vertex's
// position and color sit next to each other in memory. Passing them to two
// buffers instead would store all the positions, then all the colors.
const vertexBuffer = new VertexBuffer({
  attributes: [
    {
      name: "position",
      values: POSITIONS,
      componentCount: 2,
    },
    {
      name: "color",
      values: COLORS,
      componentCount: 3,
      normalize: true,
    },
  ],
});

const renderer = new Renderer();
const material = new Material({
  vertexShaderSource: VERTEX_SHADER_SOURCE,
  fragmentShaderSource: FRAGMENT_SHADER_SOURCE,
});
const geometry = new Geometry({
  vertexCount: 3,
  vertexBuffers: [vertexBuffer],
});
const mesh = new Mesh({ geometry, material });

function frame() {
  renderer.clear();
  renderer.render(mesh);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
