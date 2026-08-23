import { Geometry, Material, Mesh, Renderer, Texture, Uniform, requestAnimationFrameLoop } from "../src/index";

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec3 position;
in vec2 uv;

out vec2 v_texture_coordinate;

void main() {
    v_texture_coordinate = uv;
    gl_Position = vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec2 v_texture_coordinate;

out vec4 fragment_color;
uniform sampler2D t1;

void main() {
    fragment_color = texture(t1, v_texture_coordinate);
}
`;

const renderer = new Renderer();
const material = new Material(VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
const geometry = Geometry.quad();
const mesh = new Mesh(geometry, material);

const texture = await Texture.fromImageUrl("/bob.png");
mesh.material.setUniform("t1", Uniform.texture(texture));

requestAnimationFrameLoop(() => {
  renderer.clear();
  renderer.render(mesh);
});
