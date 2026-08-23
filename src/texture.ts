export enum MinificationFilter {
  Nearest = WebGL2RenderingContext.NEAREST,
  Linear = WebGL2RenderingContext.LINEAR,
  NearestMipmapNearest = WebGL2RenderingContext.NEAREST_MIPMAP_NEAREST,
  LinearMipmapNearest = WebGL2RenderingContext.LINEAR_MIPMAP_NEAREST,
  NearestMipmapLinear = WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR,
  LinearMipmapLinear = WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR,
}

export enum MagnificationFilter {
  Nearest = WebGL2RenderingContext.NEAREST,
  Linear = WebGL2RenderingContext.LINEAR,
}

export enum Wrap {
  ClampToEdge = WebGL2RenderingContext.CLAMP_TO_EDGE,
  Repeat = WebGL2RenderingContext.REPEAT,
  MirroredRepeat = WebGL2RenderingContext.MIRRORED_REPEAT,
}

export enum TextureFormat {
  Alpha = WebGL2RenderingContext.ALPHA,
  RGB = WebGL2RenderingContext.RGB,
  RGBA = WebGL2RenderingContext.RGBA,
  Luminance = WebGL2RenderingContext.LUMINANCE,
  LuminanceAlpha = WebGL2RenderingContext.LUMINANCE_ALPHA,
}

export enum TextureDataType {
  UnsignedByte = WebGL2RenderingContext.UNSIGNED_BYTE,
  UnsignedShort565 = WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5,
  UnsignedShort4444 = WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4,
  UnsignedShort5551 = WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1,
}

export type ImagePixelData = {
  width: number;
  height: number;
  bytes: Uint8Array;
};

export type TextureData = HTMLImageElement | ImagePixelData;

/**
 * Texture parameters are documented at:
 * https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter#pname
 */
export class Texture {
  minificationFilter = MinificationFilter.Nearest;
  magnificationFilter = MagnificationFilter.Nearest;
  wrapHorizontal = Wrap.Repeat;
  wrapVertical = Wrap.Repeat;
  dataType = TextureDataType.UnsignedByte;
  format = TextureFormat.RGBA;
  internalFormat = TextureFormat.RGBA;
  textureData: TextureData;
  webglTexture: WebGLTexture | null = null;

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

  getWebGLTexture(gl: WebGL2RenderingContext): WebGLTexture {
    if (this.webglTexture === null) {
      this.webglTexture = this.createWebGLTexture(gl);
    }

    return this.webglTexture;
  }

  private createWebGLTexture(gl: WebGL2RenderingContext): WebGLTexture {
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
