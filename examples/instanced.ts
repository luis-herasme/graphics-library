import { Geometry, Material, Mesh, Renderer, Transform2D } from "../src/index";

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 position;
in mat3 transform;

void main() {
    gl_Position = vec4((transform * vec3(position, 1.0)).xy, 0.0, 1.0);
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

const size = 10;

const material = new Material({
  vertexShaderSource: VERTEX_SHADER_SOURCE,
  fragmentShaderSource: FRAGMENT_SHADER_SOURCE,
});
const geometry = Geometry.quadInstanced(size * size);
const mesh = new Mesh({ geometry: geometry, material: material });

const transforms: Transform2D[] = [];

for (let x = 0; x < size; x++) {
  for (let y = 0; y < size; y++) {
    const transform = new Transform2D();
    transform.scale.multiplyScalar(0.05);
    transform.translation.x = (x + 0.5 - size / 2) / size;
    transform.translation.y = (y + 0.5 - size / 2) / size;
    transforms.push(transform);
  }
}

function frame() {
  renderer.clear();

  const transformBuffer = mesh.geometry.getVertexBuffer("transform")!;

  transforms.forEach((transform, vertexIndex) => {
    transform.rotation += vertexIndex * 0.001;
    transformBuffer.setVertex(vertexIndex, transform.toMatrix3().elements);
  });

  renderer.render(mesh);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
