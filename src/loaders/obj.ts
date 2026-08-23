export class OBJParseError extends Error {}

/**
 * A minimal Wavefront OBJ parser. Supports `v`, `vn`, `vt` and `f` commands;
 * faces must use the `position/uv/normal` index format.
 */
export class OBJ {
  positions: number[][] = [];
  normals: number[][] = [];
  uvs: number[][] = [];
  /** Each entry is a `[positionIndex, uvIndex, normalIndex]` triplet (1-based). */
  faces: number[][] = [];

  static parse(objData: string): OBJ {
    const obj = new OBJ();

    for (const line of objData.split("\n")) {
      const words = line.trim().split(/\s+/);
      const command = words.shift();

      if (command === undefined || command === "") {
        continue;
      }

      switch (command) {
        case "v":
          obj.positions.push(parseFloats(words, 3));
          break;
        case "vn":
          obj.normals.push(parseFloats(words, 3));
          break;
        case "vt":
          obj.uvs.push(parseUv(words));
          break;
        case "f":
          for (const faceString of words) {
            const face = parseFace(faceString);

            // Check that the face indices are valid
            const [positionIndex, uvIndex, normalIndex] = face;

            if (
              obj.positions[positionIndex - 1] === undefined ||
              obj.uvs[uvIndex - 1] === undefined ||
              obj.normals[normalIndex - 1] === undefined
            ) {
              throw new OBJParseError(`Invalid face index in "${faceString}"`);
            }

            obj.faces.push(face);
          }
          break;
        default:
          // Ignoring unsupported commands
          break;
      }
    }

    return obj;
  }
}

function parseFace(face: string): number[] {
  const parts = face.split("/");

  if (parts.length !== 3) {
    throw new OBJParseError(
      `Expected a "position/uv/normal" face, got "${face}"`,
    );
  }

  return parts.map((part) => {
    const value = Number.parseInt(part, 10);

    if (Number.isNaN(value)) {
      throw new OBJParseError(`Failed to parse face index "${part}"`);
    }

    return value;
  });
}

function parseFloats(parts: string[], count: number): number[] {
  if (parts.length !== count) {
    throw new OBJParseError(`Expected ${count} values, got ${parts.length}`);
  }

  return parts.map((part) => {
    const value = Number.parseFloat(part);

    if (Number.isNaN(value)) {
      throw new OBJParseError(`Failed to parse float value "${part}"`);
    }

    return value;
  });
}

function parseUv(parts: string[]): number[] {
  const [x, y] = parseFloats(parts, 2);

  // Flip the V coordinate: OBJ uses a bottom-left origin, WebGL textures use top-left
  return [x, 1 - y];
}
