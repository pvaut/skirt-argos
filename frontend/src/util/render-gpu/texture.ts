import { TpColor } from "../color/color";


export function setTextureFixedColor(gl: any, color: TpColor, opacity: number) {
    const textureData = new Uint8Array(4);
    textureData[0] = color.r;
    textureData[1] = color.g;
    textureData[2] = color.b;
    textureData[3] = 255 * opacity;
    gl.texImage2D(
        gl.TEXTURE_2D,
        0, // level
        gl.RGBA, // internal format
        1, // width
        1, // height
        0, // border
        gl.RGBA, // source format
        gl.UNSIGNED_BYTE, // source type
        textureData,
    );
}


export function setTextureColorRamp(gl: any, colors: TpColor[], opacity: number) {
    const textureData = new Uint8Array(4 * colors.length);
    for (let i = 0; i < colors.length; i++) {
        textureData[4 * i + 0] = colors[i].r;
        textureData[4 * i + 1] = colors[i].g;
        textureData[4 * i + 2] = colors[i].b;
        textureData[4 * i + 3] = 255 * opacity;
    }
    gl.texImage2D(
        gl.TEXTURE_2D,
        0, // level
        gl.RGBA, // internal format
        textureData.length / 4, // width
        1, // height
        0, // border
        gl.RGBA, // source format
        gl.UNSIGNED_BYTE, // source type
        textureData,
    );
}


export function activateColorRampTexture(gl: any, textureColorMap:any) {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, textureColorMap);
}