import {
  Data,
  Geometry,
  Gltf,
  IndexBuffer,
  Material,
  Mesh,
  Quaternion,
  Renderer,
  Transform3D,
  VertexBuffer,
  fetchBytes,
  requestAnimationFrameLoop,
} from "../src/index";

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;
in vec3 normal;
in vec2 uv;

out vec3 v_normal;
uniform mat4 transform;

void main() {
    v_normal = normal;
    gl_Position = transform * vec4(position, 10.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_normal;
out vec4 fragment_color;

void main() {
    vec3 normal = normalize(v_normal);
    float light = dot(normal, vec3(0.25, 25.0, -25.0));
    fragment_color = vec4(1.0, 0.0, 0.0, 1.0);
    fragment_color.rgb *= max(0.1, light);
}
`;

const data = await fetchBytes("/test.glb");
const gltf = Gltf.fromBytes(data);

const positions = gltf.readPositions();
const normals = gltf.readNormals();
const indices = gltf.readIndices();

const renderer = new Renderer();
const material = new Material(VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);

const geometry = new Geometry({
  vertexCount: positions.length / 3,
  indices: new IndexBuffer(indices),
  vertexBuffers: [
    new VertexBuffer("position", Data.vector3(positions)),
    new VertexBuffer("normal", Data.vector3(normals)),
  ],
});

const mesh = new Mesh(geometry, material);

const transform = new Transform3D();
transform.scale.multiplyScalar(0.25);
transform.translation.y = -0.5;

requestAnimationFrameLoop(() => {
  renderer.clear();
  transform.rotation.multiply(Quaternion.fromRotationX(0.003));
  transform.rotation.multiply(Quaternion.fromRotationY(0.002));
  mesh.material.setUniform("transform", {
    kind: "matrix4",
    value: transform.toArray(),
  });
  renderer.render(mesh);
});
