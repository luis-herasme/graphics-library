# Architecture

Each folder is a layer; a layer only imports from layers below it:

```
math ← gpu ← geometry ← scene
                ↑
             loaders (build geometry from files)
```

- **math/** — pure values: vectors, matrices, quaternions, transforms.
- **gpu/** — wrappers around raw WebGL resources: `GpuBuffer`, `Texture`,
  `ShaderProgram`, `UniformBufferObject`, and the `Uniform` value type. Each
  resource holds a CPU-side copy, creates its GPU twin lazily, and re-uploads
  when the CPU side changes.
- **geometry/** — gives meaning to GPU buffers: vertex attributes and layout
  (`VertexBuffer`), triangle indices (`IndexBuffer`), their combination
  (`Geometry`), and built-in shapes (`primitives.ts`).
- **scene/** — things arranged in space and drawn: `Mesh`, `Material`,
  `PerspectiveCamera`, `Renderer`.
- **loaders/** — parse OBJ/GLTF into geometry and animation data.

## Known issues

1. The renderer injects `transform`, `projection_matrix`, and
   `camera_inverse_matrix` uniforms by name — an undocumented contract.

## Open questions

1. Document the renderer's uniform-name contract, or replace it with a
   camera uniform block?
