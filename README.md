# suricato

A small WebGL2 graphics library written in TypeScript — a port of [suricato.rs](https://github.com/luis-herasme/suricato.rs) from Rust/WASM.

It has no runtime dependencies: the `glam` math types are replaced by a small math module (`src/math/`), and the `gltf` crate by a minimal GLB reader (`src/loaders/gltf.ts`).

## Features

- **Renderer** — canvas/context setup, depth testing, window resize handling, and scene rendering with a perspective camera
- **Geometry** — plain, interleaved, and instanced vertex buffers with automatic layout/stride/offset computation; u8/u16/u32 index buffers; built-in quad and box geometries
- **Materials** — shader compilation and linking with cached uniform, attribute, and uniform-block locations; texture uniforms with automatic texture-unit assignment
- **Uniform buffer objects** — `std140` uniform blocks shared across draws
- **Textures** — from images, URLs, or raw pixel data
- **Transforms** — 2D (`Matrix3`) and 3D (scale/rotation/translation → `Matrix4`)
- **Loaders** — a Wavefront OBJ parser and a minimal binary glTF (`.glb`) reader, including skeleton extraction from skins

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173 to browse the examples:

| Example                                                        | Shows                                                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [hello-world](examples/hello-world.ts)                         | A minimal quad with a custom shader                                           |
| [textures](examples/textures.ts)                               | Texturing a quad from an image URL                                            |
| [instanced](examples/instanced.ts)                             | Instanced rendering with a per-instance `mat3` attribute, updated every frame |
| [camera-texture-lighting](examples/camera-texture-lighting.ts) | A perspective camera, directional lighting, and a textured cube               |
| [obj-chair](examples/obj-chair.ts)                             | Loading a model from an OBJ file                                              |
| [uniform-buffer-object](examples/uniform-buffer-object.ts)     | Uniform buffer objects with two color palettes                                |
| [draw-line](examples/draw-line.ts)                             | A glTF fox rendered as a wireframe with its skeleton                          |
| [gltf](examples/gltf.ts)                                       | Loading positions, normals, and indices from a GLB file                       |

Other scripts:

```bash
npm run check   # typecheck
npm run build   # typecheck + production build of the examples
```

## Usage

```ts
import { Geometry, Material, Mesh, Renderer } from "./src/index";

const renderer = new Renderer(); // Creates a full-window canvas
const material = new Material({ vertexShaderSource, fragmentShaderSource });
const mesh = new Mesh({ geometry: Geometry.quad(), material });

function frame() {
  renderer.clear();
  renderer.render(mesh);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

The library owns no frame loop, so you decide when to draw and when to stop.

Every class with more than one setting takes a single descriptor object, and
each one has a matching exported type (`MaterialDescriptor`, `MeshDescriptor`,
and so on). Optional settings have defaults, so a camera that fills the window
is just `new PerspectiveCamera()`. The math types (`Vector3`, `Quaternion`,
`Matrix4`) take positional arguments instead, since their components are
already ordered.

GPU resources (buffers, programs, textures, VAOs) are created lazily on first render, so everything can be constructed before a context exists, and CPU-side buffer edits (e.g. `Geometry.setVertex`) are uploaded automatically before the next draw.
