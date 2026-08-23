import {
  Geometry,
  Material,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  Renderer,
  Texture,
  requestAnimationFrameLoop,
} from "../src/index";

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;
in vec3 normal;

uniform mat4 projection_matrix;
uniform mat4 camera_inverse_matrix;
uniform mat4 transform;

in vec2 uv;
out vec3 v_normal;
out vec2 v_texture_coordinate;

void main() {
    v_texture_coordinate = uv;
    v_normal = mat3(camera_inverse_matrix * transform) * normal;
    gl_Position = projection_matrix * camera_inverse_matrix * transform * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_normal;
in vec2 v_texture_coordinate;

out vec4 fragment_color;
uniform sampler2D texture_sampler;

void main() {
    vec3 normal = normalize(v_normal);
    float light = dot(normal, normalize(vec3(0.25, 25.0, 25.0)));
    fragment_color = texture(texture_sampler, v_texture_coordinate);
    fragment_color.rgb *= max(0.2, light);
}
`;

const renderer = new Renderer();

const material = new Material({
  vertexShaderSource: VERTEX_SHADER_SOURCE,
  fragmentShaderSource: FRAGMENT_SHADER_SOURCE,
});
const geometry = Geometry.box();
const mesh = new Mesh({ geometry: geometry, material: material });
mesh.transform.translation.z = -5;

const texture = await Texture.fromImageUrl("/bob.png");
mesh.material.setUniform("texture_sampler", {
  kind: "texture",
  value: texture,
});

const scene = [mesh];
const camera = PerspectiveCamera.default();

requestAnimationFrameLoop(() => {
  mesh.transform.rotation.multiply(Quaternion.fromRotationY(0.01));
  mesh.transform.rotation.multiply(Quaternion.fromRotationZ(0.005));
  renderer.renderScene(scene, camera);
});
