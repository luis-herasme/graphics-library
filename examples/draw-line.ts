import {
  Animation,
  BufferUsage,
  Data,
  Geometry,
  Gltf,
  IndexBuffer,
  Material,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  RenderPrimitive,
  Renderer,
  Uniform,
  VertexBuffer,
  fetchBytes,
  requestAnimationFrameLoop,
} from "../src/index";

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;
in vec3 normal;

uniform mat4 projection_matrix;
uniform mat4 camera_inverse_matrix;
uniform mat4 transform;

void main() {
    gl_Position = projection_matrix * camera_inverse_matrix * transform * vec4(position, 1.0);
    gl_PointSize = 2.0;
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

out vec4 fragment_color;
uniform vec4 color;

void main() {
    fragment_color = color;
}
`;

const renderer = new Renderer();
const material = new Material(VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);

const data = await fetchBytes("/fox.glb");
const gltf = Gltf.fromBytes(data);

const positions = gltf.readPositions();
const vertexCount = positions.length / 3;

// Build a wireframe: one line per triangle edge, assuming the positions
// describe sequential (non-indexed) triangles
const indices: number[] = [];
for (let i = 0; i < vertexCount; i += 3) {
  // A -> B
  indices.push(i, i + 1);
  // B -> C
  indices.push(i + 1, i + 2);
  // C -> A
  indices.push(i + 2, i);
}

const geometry = new Geometry({
  vertexCount,
  indices: IndexBuffer.fromU32(BufferUsage.StaticDraw, indices),
  vertexBuffers: [new VertexBuffer("position", Data.vector3(positions))],
});

const mesh = new Mesh(geometry, material);
mesh.transform.scale.multiplyScalar(0.075);
mesh.transform.translation.z = -20;
mesh.transform.translation.y = -3.5;
mesh.renderPrimitive = RenderPrimitive.Lines;

// Skeleton
const animation = Animation.fromGltf(gltf);
animation.updateGlobalTransform();
const lines = animation.getLines();

const skeletonGeometry = Geometry.fromVertexBuffer(new VertexBuffer("position", Data.vector3(lines)));
const skeletonMaterial = new Material(VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
const skeletonMesh = new Mesh(skeletonGeometry, skeletonMaterial);
skeletonMesh.transform = mesh.transform.clone();
skeletonMesh.renderPrimitive = RenderPrimitive.Lines;

const scene = [mesh, skeletonMesh];
const camera = PerspectiveCamera.default();

requestAnimationFrameLoop(() => {
  mesh.transform.rotation.multiply(Quaternion.fromRotationY(0.01));
  mesh.material.setUniform("color", Uniform.vector4([0.5, 0.5, 0.5, 1]));

  skeletonMesh.transform.rotation.multiply(Quaternion.fromRotationY(0.01));
  skeletonMesh.material.setUniform("color", Uniform.vector4([0.25, 1, 0.25, 1]));

  renderer.renderScene(scene, camera);
});
