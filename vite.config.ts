import { resolve } from "node:path";
import { defineConfig } from "vite";

const root = import.meta.dirname;

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(root, "index.html"),
        "hello-world": resolve(root, "examples/hello-world.html"),
        textures: resolve(root, "examples/textures.html"),
        instanced: resolve(root, "examples/instanced.html"),
        "camera-texture-lighting": resolve(root, "examples/camera-texture-lighting.html"),
        "obj-chair": resolve(root, "examples/obj-chair.html"),
        "uniform-buffer-object": resolve(root, "examples/uniform-buffer-object.html"),
        "draw-line": resolve(root, "examples/draw-line.html"),
        gltf: resolve(root, "examples/gltf.html"),
      },
    },
  },
});
