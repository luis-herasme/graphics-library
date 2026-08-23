import { fetchImage } from "./utils";

const TEXTURE_2D = WebGL2RenderingContext.TEXTURE_2D;
const TEXTURE_MIN_FILTER = WebGL2RenderingContext.TEXTURE_MIN_FILTER;
const TEXTURE_MAG_FILTER = WebGL2RenderingContext.TEXTURE_MAG_FILTER;

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

export interface ImagePixelData {
  width: number;
  height: number;
  bytes: Uint8Array;
}

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

  static async fromImageUrl(url: string): Promise<Texture> {
    return new Texture(await fetchImage(url));
  }

  getWebglTexture(gl: WebGL2RenderingContext): WebGLTexture {
    if (this.webglTexture === null) {
      this.webglTexture = this.createWebglTexture(gl);
    }

    return this.webglTexture;
  }

  private createWebglTexture(gl: WebGL2RenderingContext): WebGLTexture {
    const webglTexture = gl.createTexture();

    if (webglTexture === null) {
      throw new Error("Failed to create WebGL texture");
    }

    gl.bindTexture(TEXTURE_2D, webglTexture);

    if (this.textureData instanceof HTMLImageElement) {
      gl.texImage2D(
        TEXTURE_2D,
        0,
        this.internalFormat,
        this.format,
        this.dataType,
        this.textureData,
      );
    } else {
      const { width, height, bytes } = this.textureData;
      gl.texImage2D(
        TEXTURE_2D,
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

    gl.texParameteri(TEXTURE_2D, TEXTURE_MIN_FILTER, this.minificationFilter);
    gl.texParameteri(TEXTURE_2D, TEXTURE_MAG_FILTER, this.magnificationFilter);

    return webglTexture;
  }
}
