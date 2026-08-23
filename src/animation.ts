import { GLTF } from "./gltf";
import { Matrix4, Quaternion, Vector3 } from "./math";
import { Transform3D } from "./transform";

type Node = {
  parentIndex: number | null;
  childrenIndexList: number[];
  localTransform: Transform3D;
  globalTransform: Transform3D;
};

export type Interpolation = "linear";

export type SamplerValues =
  | { kind: "vector3"; values: Vector3[] }
  | { kind: "quaternion"; values: Quaternion[] };

export type Sampler = {
  times: number[];
  values: SamplerValues;
  interpolation: Interpolation;
};

export type NodeProperty = "translation" | "rotation" | "scale";

export type Channel = {
  samplerIndex: number;
  targetNodeIndex: number;
  targetNodeProperty: NodeProperty;
};

function samplerTimeIndex(sampler: Sampler, time: number): number | null {
  let index = 0;

  while (index < sampler.times.length - 1 && time > sampler.times[index + 1]) {
    index += 1;
  }

  if (index + 1 >= sampler.times.length) {
    return null;
  }

  return index;
}

function nodeLocalTransform(gltf: GLTF, nodeIndex: number): Transform3D {
  const node = gltf.json.nodes?.[nodeIndex];

  if (node === undefined) {
    throw new Error(`glTF node ${nodeIndex} does not exist`);
  }

  if (node.matrix !== undefined) {
    return Transform3D.fromMatrix4(new Matrix4(node.matrix));
  }

  const transform = new Transform3D();

  if (node.translation !== undefined) {
    transform.translation = new Vector3(
      ...(node.translation as [number, number, number]),
    );
  }

  if (node.rotation !== undefined) {
    transform.rotation = Quaternion.fromArray(node.rotation);
  }

  if (node.scale !== undefined) {
    transform.scale = new Vector3(...(node.scale as [number, number, number]));
  }

  return transform;
}

/** The joint hierarchy of a skinned glTF model, with per-frame animation sampling. */
export class Animation {
  currentTime = 0;
  animationDuration = 1;

  private readonly nodes = new Map<number, Node>();
  private samplers: Sampler[] = [];
  private channels: Channel[] = [];

  /** Builds the joint hierarchy from the first skin of a glTF file. */
  static fromGLTF(gltf: GLTF): Animation {
    const skin = gltf.json.skins?.[0];

    if (skin === undefined) {
      throw new Error("glTF file has no skins");
    }

    const { nodes = [] } = gltf.json;

    const animation = new Animation();

    for (const jointIndex of skin.joints) {
      const { children: childrenIndexList = [] } = nodes[jointIndex];

      animation.nodes.set(jointIndex, {
        parentIndex: null, // Populated below
        childrenIndexList: [...childrenIndexList],
        localTransform: nodeLocalTransform(gltf, jointIndex),
        globalTransform: new Transform3D(),
      });
    }

    for (const [jointIndex, node] of animation.nodes) {
      for (const childIndex of node.childrenIndexList) {
        const child = animation.nodes.get(childIndex);

        if (child !== undefined) {
          child.parentIndex = jointIndex;
        }
      }
    }

    return animation;
  }

  update(deltaTime: number): void {
    this.currentTime = (this.currentTime + deltaTime) % this.animationDuration;
    this.updateLocalTransforms();
    this.updateGlobalTransform();
  }

  private updateLocalTransforms(): void {
    for (const channel of this.channels) {
      const node = this.nodes.get(channel.targetNodeIndex);

      if (node === undefined) {
        continue;
      }

      const sampler = this.samplers[channel.samplerIndex];
      const index = samplerTimeIndex(sampler, this.currentTime);

      if (index === null) {
        return;
      }

      const prevTime = sampler.times[index];
      const nextTime = sampler.times[index + 1];
      const t = (this.currentTime - prevTime) / (nextTime - prevTime);

      if (sampler.values.kind === "vector3") {
        const value = sampler.values.values[index].lerp(
          sampler.values.values[index + 1],
          t,
        );

        switch (channel.targetNodeProperty) {
          case "translation":
            node.localTransform.translation = value;
            break;
          case "scale":
            node.localTransform.scale = value;
            break;
          default:
            throw new Error("A vector3 sampler cannot target a rotation");
        }
      } else {
        const value = sampler.values.values[index].slerp(
          sampler.values.values[index + 1],
          t,
        );

        if (channel.targetNodeProperty !== "rotation") {
          throw new Error("A quaternion sampler can only target a rotation");
        }

        node.localTransform.rotation = value;
      }
    }
  }

  /**
   * Walks the hierarchy from the roots, combining each node's local transform
   * with its parent's global transform.
   */
  updateGlobalTransform(): void {
    for (const [node, parentNode] of this.nodesFromRoots()) {
      node.globalTransform = Transform3D.fromMatrix4(
        parentNode.globalTransform
          .toMatrix4()
          .multiply(node.localTransform.toMatrix4()),
      );
    }
  }

  /**
   * Returns pairs of points connecting each joint to its parent, useful for
   * rendering the skeleton as line segments.
   */
  getLines(): Vector3[] {
    const lines: Vector3[] = [];

    for (const [node, parentNode] of this.nodesFromRoots()) {
      if (parentNode.parentIndex !== null) {
        lines.push(parentNode.globalTransform.translation.clone());
        lines.push(node.globalTransform.translation.clone());
      }
    }

    return lines;
  }

  /**
   * Returns every node below a root paired with its parent, each node coming
   * after its parent.
   */
  private nodesFromRoots(): [Node, Node][] {
    const pending: [number, Node][] = [];

    for (const node of this.nodes.values()) {
      if (node.parentIndex === null) {
        for (const childIndex of node.childrenIndexList) {
          pending.push([childIndex, node]);
        }
      }
    }

    const pairs: [Node, Node][] = [];

    while (pending.length > 0) {
      const [nodeIndex, parentNode] = pending.shift()!;
      const node = this.nodes.get(nodeIndex)!;

      pairs.push([node, parentNode]);

      for (const childIndex of node.childrenIndexList) {
        pending.push([childIndex, node]);
      }
    }

    return pairs;
  }
}
