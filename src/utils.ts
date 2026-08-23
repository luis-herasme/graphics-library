/** Returns a Uint8Array view over the underlying bytes of a typed array. */
export function toBytes(data: ArrayBufferView): Uint8Array {
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

export async function fetchImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

export async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch "${url}": ${response.status} ${response.statusText}`,
    );
  }

  return new Uint8Array(await response.arrayBuffer());
}

export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch "${url}": ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

/** Calls `callback` once per frame, forever. */
export function requestAnimationFrameLoop(callback: () => void): void {
  const loop = () => {
    callback();
    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
}
