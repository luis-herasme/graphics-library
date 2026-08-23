import {
  Geometry,
  Material,
  Mesh,
  OBJ,
  Quaternion,
  Renderer,
  Texture,
  Transform3D,
  fetchText,
  requestAnimationFrameLoop,
} from "../src/index";

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;
in vec3 normal;
in vec2 uv;

out vec3 v_normal;
out vec2 v_texture_coordinate;

uniform mat4 transform;

void main() {
    v_normal = (transform * vec4(normal, 0.0)).xyz;
    v_texture_coordinate = uv;
    gl_Position = transform * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec3 v_normal;
in vec2 v_texture_coordinate;

out vec4 fragment_color;
uniform sampler2D chair_texture;

void main() {
    vec3 normal = normalize(v_normal);
    float light = dot(normal, normalize(vec3(0.25, 25.0, -25.0)));
    fragment_color = texture(chair_texture, v_texture_coordinate);
    fragment_color.rgb *= max(0.2, light);
}
`;

const objData = await fetchText("/chair.obj");
const obj = OBJ.parse(objData);

const renderer = new Renderer();
const material = new Material({
  vertexShaderSource: VERTEX_SHADER_SOURCE,
  fragmentShaderSource: FRAGMENT_SHADER_SOURCE,
});
const geometry = Geometry.fromObj(obj);
const mesh = new Mesh({ geometry: geometry, material: material });

const texture = await Texture.fromImageUrl("/chair.png");
mesh.material.setUniform("chair_texture", { kind: "texture", value: texture });

const transform = new Transform3D();
transform.scale.multiplyScalar(0.005);

requestAnimationFrameLoop(() => {
  renderer.clear();
  transform.rotation.multiply(Quaternion.fromRotationX(0.01));
  transform.rotation.multiply(Quaternion.fromRotationY(0.02));
  mesh.material.setUniform("transform", {
    kind: "matrix4",
    value: transform.toArray(),
  });
  renderer.render(mesh);
});
