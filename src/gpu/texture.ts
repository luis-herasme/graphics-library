export type MinificationFilter =
  | typeof WebGL2RenderingContext.NEAREST
  | typeof WebGL2RenderingContext.LINEAR
  | typeof WebGL2RenderingContext.NEAREST_MIPMAP_NEAREST
  | typeof WebGL2RenderingContext.LINEAR_MIPMAP_NEAREST
  | typeof WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR
  | typeof WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR;

export type MagnificationFilter =
  typeof WebGL2RenderingContext.NEAREST | typeof WebGL2RenderingContext.LINEAR;

export type Wrap =
  | typeof WebGL2RenderingContext.CLAMP_TO_EDGE
  | typeof WebGL2RenderingContext.REPEAT
  | typeof WebGL2RenderingContext.MIRRORED_REPEAT;

export type TextureFormat =
  | typeof WebGL2RenderingContext.ALPHA
  | typeof WebGL2RenderingContext.RGB
  | typeof WebGL2RenderingContext.RGBA
  | typeof WebGL2RenderingContext.LUMINANCE
  | typeof WebGL2RenderingContext.LUMINANCE_ALPHA;

export type TextureDataType =
  | typeof WebGL2RenderingContext.UNSIGNED_BYTE
  | typeof WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5
  | typeof WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4
  | typeof WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1;

export type ImagePixelData = {
  width: number;
  height: number;
  bytes: Uint8Array;
};

export type TextureData = HTMLImageElement | ImagePixelData;

/**
 * Holds the settings and pixel data of a texture; a renderer owns the GPU
 * texture. To apply changed settings, ask the renderer to delete its copy so
 * the next draw recreates it.
 *
 * Texture parameters are documented at:
 * https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter#pname
 */
export class Texture {
  minificationFilter: MinificationFilter = WebGL2RenderingContext.NEAREST;
  magnificationFilter: MagnificationFilter = WebGL2RenderingContext.NEAREST;
  wrapHorizontal: Wrap = WebGL2RenderingContext.REPEAT;
  wrapVertical: Wrap = WebGL2RenderingContext.REPEAT;
  dataType: TextureDataType = WebGL2RenderingContext.UNSIGNED_BYTE;
  format: TextureFormat = WebGL2RenderingContext.RGBA;
  internalFormat: TextureFormat = WebGL2RenderingContext.RGBA;
  textureData: TextureData;

  constructor(textureData: TextureData) {
    this.textureData = textureData;
  }

  /** Waits for the image to finish decoding, so the texture uploads a complete image. */
  static async fromImageUrl(url: string): Promise<Texture> {
    const image = new Image();
    image.src = url;
    await image.decode();
    return new Texture(image);
  }

  createWebGLTexture(gl: WebGL2RenderingContext): WebGLTexture {
    const webglTexture = gl.createTexture();

    if (webglTexture === null) {
      throw new Error("Failed to create WebGL texture");
    }

    gl.bindTexture(gl.TEXTURE_2D, webglTexture);

    if (this.textureData instanceof HTMLImageElement) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        this.internalFormat,
        this.format,
        this.dataType,
        this.textureData,
      );
    } else {
      const { width, height, bytes } = this.textureData;
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        this.internalFormat,
        width,
        height,
        0,
        this.format,
        this.dataType,
        bytes,
      );
    }

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      this.minificationFilter,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      this.magnificationFilter,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.wrapHorizontal);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.wrapVertical);

    return webglTexture;
  }
}
