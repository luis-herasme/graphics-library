import { Gltf } from "./gltf";
import { Matrix4, Quaternion, Vector3 } from "./math";
import { Transform3D } from "./transform";

interface Node {
  parentIndex: number | null;
  childrenIndexList: number[];
  localTransform: Transform3D;
  globalTransform: Transform3D;
}

export type Interpolation = "linear";

export type SamplerValues =
  | { kind: "vector3"; values: Vector3[] }
  | { kind: "quaternion"; values: Quaternion[] };

export interface Sampler {
  times: number[];
  values: SamplerValues;
  interpolation: Interpolation;
}

export type NodeProperty = "translation" | "rotation" | "scale";

export interface Channel {
  samplerIndex: number;
  targetNodeIndex: number;
  targetNodeProperty: NodeProperty;
}

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

function nodeLocalTransform(gltf: Gltf, nodeIndex: number): Transform3D {
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

  private nodes: (Node | null)[] = [];
  private samplers: Sampler[] = [];
  private channels: Channel[] = [];

  /** Builds the joint hierarchy from the first skin of a glTF file. */
  static fromGltf(gltf: Gltf): Animation {
    const skin = gltf.json.skins?.[0];

    if (skin === undefined) {
      throw new Error("glTF file has no skins");
    }

    const numberOfNodes = gltf.json.nodes?.length ?? 0;

    const animation = new Animation();
    animation.nodes = new Array<Node | null>(numberOfNodes).fill(null);

    for (const jointIndex of skin.joints) {
      const childrenIndexList = gltf.json.nodes?.[jointIndex]?.children ?? [];

      animation.nodes[jointIndex] = {
        parentIndex: null, // Populated below
        childrenIndexList: [...childrenIndexList],
        localTransform: nodeLocalTransform(gltf, jointIndex),
        globalTransform: new Transform3D(),
      };
    }

    for (const jointIndex of skin.joints) {
      for (const childIndex of animation.nodes[jointIndex]!.childrenIndexList) {
        const child = animation.nodes[childIndex];

        if (child !== null) {
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
      const node = this.nodes[channel.targetNodeIndex];

      if (node === null) {
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
    const nodesToUpdate = this.collectRootChildren();

    while (nodesToUpdate.length > 0) {
      const [nodeIndex, parentIndex] = nodesToUpdate.shift()!;

      const parentNode = this.nodes[parentIndex]!;
      const node = this.nodes[nodeIndex]!;

      node.globalTransform = Transform3D.fromMatrix4(
        parentNode.globalTransform
          .toMatrix4()
          .multiply(node.localTransform.toMatrix4()),
      );

      for (const childIndex of node.childrenIndexList) {
        nodesToUpdate.push([childIndex, nodeIndex]);
      }
    }
  }

  /**
   * Returns pairs of points connecting each joint to its parent, useful for
   * rendering the skeleton as line segments.
   */
  getLines(): Vector3[] {
    const nodesToUpdate = this.collectRootChildren();
    const lines: Vector3[] = [];

    while (nodesToUpdate.length > 0) {
      const [nodeIndex, parentIndex] = nodesToUpdate.shift()!;

      const parentNode = this.nodes[parentIndex]!;
      const node = this.nodes[nodeIndex]!;

      if (parentNode.parentIndex !== null) {
        lines.push(parentNode.globalTransform.translation.clone());
        lines.push(node.globalTransform.translation.clone());
      }

      for (const childIndex of node.childrenIndexList) {
        nodesToUpdate.push([childIndex, nodeIndex]);
      }
    }

    return lines;
  }

  /** Returns `[childIndex, parentIndex]` pairs for the children of every root node. */
  private collectRootChildren(): [number, number][] {
    const pairs: [number, number][] = [];

    for (let nodeIndex = 0; nodeIndex < this.nodes.length; nodeIndex++) {
      const node = this.nodes[nodeIndex];

      if (node !== null && node.parentIndex === null) {
        for (const childIndex of node.childrenIndexList) {
          pairs.push([childIndex, nodeIndex]);
        }
      }
    }

    return pairs;
  }
}
