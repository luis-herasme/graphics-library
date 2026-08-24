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
  (`Geometry`).
- **scene/** — things arranged in space and drawn: `Mesh`, `Material`,
  `PerspectiveCamera`, `Renderer`.
- **loaders/** — parse OBJ/GLTF into geometry and animation data.

## Known issues

1. `UniformBufferObject` uploads eagerly while every other resource is lazy,
   and nothing in the render path calls `ShaderProgram.setUniformBlock`; users
   wire uniform blocks manually.
2. `Geometry.quadInstanced` and friends are demo content in the library.
3. The renderer injects `transform`, `projection_matrix`, and
   `camera_inverse_matrix` uniforms by name — an undocumented contract.

## Open questions

1. Should `UniformBufferObject` become lazy like every other resource?
2. Is `ShaderProgram` owned by one `Material`, or a resource materials could
   share?
3. Document the renderer's uniform-name contract, or replace it with a
   camera uniform block?
4. Do the built-in shapes (`quad`, `box`, instanced variants) move to a
   `geometry/primitives.ts` or out to examples?
