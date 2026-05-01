
import { checkFloat32Array, checkUint8Array, createGPUProgram, getLayerProgram, gpuActivateBuffer, gpuCreateBuffers, gpuSetAttributeDefaultValue, gpuSetBufferData, gpuSetUniformValue, setGPURViewport } from "../../helpers";
import { TpGPURContext } from "../../interfaces";
import { GPUR_LAYER_TYPES, TpGPURLayerInstance, TpGPURLayerTypeDefinition, BUFFER_DATA_TYPES, TpGPUBufferDef, TpGPUUniformDef, TpGPURLayerData } from "../interfaces";


import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';
import { activateColorRampTexture, setTextureColorRamp, setTextureFixedColor } from "../../texture";
import { getColor } from "../../../color/color";
import { TpGPURLayerDataColoredPointsBitmap, TpGPURLayerInstanceColoredPointsBitmap } from "./interfaces";
import { getRangeSize, getViewport2DCoordConvertors } from "../../../geometry/viewport2D";



const bufferDefs: TpGPUBufferDef[] = [
    { name: 'posx', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'posy', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'colorval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'selmask', dataType: BUFFER_DATA_TYPES.BYTE, size: 1 },
    { name: 'slice', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
];



const uniformDefs: TpGPUUniformDef[] = [
    { name: 'pointsize', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'pointsize_rel_x', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'pointsize_rel_y', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'opacity', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'color_minval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'color_maxval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'color_gammafactor', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'slice_minval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'slice_maxval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
];



function createInstance(ctx: TpGPURContext, layerId: string): TpGPURLayerInstanceColoredPointsBitmap {
    const gl = ctx.gl;
    const layerDef = gpurColoredPointsBitmap;

    const textureColorMap = gl.createTexture();

    const instance: TpGPURLayerInstanceColoredPointsBitmap = {
        layerType: GPUR_LAYER_TYPES.COLORED_POINTS_BITMAP,
        layerId,
        sourceData: null,
        ctx,
        buffers: gpuCreateBuffers(ctx, layerDef),
        textureColorMap,
    };
    return instance;
}


function setSourceData(layerInstanceInp: TpGPURLayerInstance, dataInp: TpGPURLayerData) {
    const layerInstance = layerInstanceInp as TpGPURLayerInstanceColoredPointsBitmap;
    const data = dataInp as TpGPURLayerDataColoredPointsBitmap;
    const gl = layerInstance.ctx.gl;

    gpuSetBufferData(layerInstance, "posx", checkFloat32Array(data.posX));
    gpuSetBufferData(layerInstance, "posy", checkFloat32Array(data.posY));
    gpuSetBufferData(layerInstance, "selmask", checkUint8Array(data.selectionMask));
    gpuSetBufferData(layerInstance, "colorval", checkFloat32Array(data.colorNumerical?.values || data.colorCategorical?.values));
    gpuSetBufferData(layerInstance, "slice", checkFloat32Array(data.slice?.sliceValues));

    gl.bindTexture(gl.TEXTURE_2D, layerInstance.textureColorMap);
    if (data.colorNumerical)
        setTextureColorRamp(gl, data.colorNumerical.colorRamp, 1);
    else if (data.colorCategorical)
        setTextureColorRamp(gl, data.colorCategorical.colorPalette, 1);
    else
        setTextureFixedColor(gl, getColor(50, 140, 200), 1);

    layerInstance.sourceData = data;
}



function performRender(ctx: TpGPURContext, layerInstanceInp: TpGPURLayerInstance) {
    const layerInstance = layerInstanceInp as TpGPURLayerInstanceColoredPointsBitmap;
    const gl = ctx.gl;
    const sourceData = layerInstance.sourceData;
    if (!sourceData) return;
    const pointCount = sourceData.posX.length;

    const coordConvertors = getViewport2DCoordConvertors(ctx.viewport2D!);

    const rPixelSizeX = 1.05 * sourceData.pixelSizeX * getRangeSize(ctx.viewport2D!.displayRange.x) * coordConvertors.gpur.zoomX * 0.5 * ctx.pixelRatio;
    const rPixelSizeY = 1.05 * sourceData.pixelSizeY * getRangeSize(ctx.viewport2D!.displayRange.y) * coordConvertors.gpur.zoomY * 0.5 * ctx.pixelRatio;


    const myProgram = getLayerProgram(layerInstance);
    gl.useProgram(myProgram.theWebGLProgram);

    setGPURViewport(ctx, myProgram);

    const pointSize = Math.max(rPixelSizeX, rPixelSizeY);
    gpuSetUniformValue(layerInstance, "pointsize", pointSize);
    if (Math.abs(rPixelSizeX - rPixelSizeY) > 0.01 * pointSize) { //non-uniform pixels - need to specify aspect ratio
        gpuSetUniformValue(layerInstance, "pointsize_rel_x", Math.max(ctx.pixelRatio * 1.1, 1.02 * rPixelSizeX / pointSize));
        gpuSetUniformValue(layerInstance, "pointsize_rel_y", Math.max(ctx.pixelRatio * 1.1, 1.02 * rPixelSizeY / pointSize));
    } else { //uniform pixels - no need to further constrain
        gpuSetUniformValue(layerInstance, "pointsize_rel_x", 2);
        gpuSetUniformValue(layerInstance, "pointsize_rel_y", 2);
    }

    if (sourceData.colorNumerical) {
        gpuSetUniformValue(layerInstance, "color_minval", sourceData.colorNumerical.minVal);
        gpuSetUniformValue(layerInstance, "color_maxval", sourceData.colorNumerical.maxVal);
        gpuSetUniformValue(layerInstance, "color_gammafactor", sourceData.colorNumerical.gammaFactor);
    }

    if (sourceData.colorCategorical) {
        gpuSetUniformValue(layerInstance, "color_minval", -0.5);
        gpuSetUniformValue(layerInstance, "color_maxval", sourceData.colorCategorical.colorPalette.length - 0.5);
        gpuSetUniformValue(layerInstance, "color_gammafactor", 1);
    }

    let opacity = 1;
    gpuSetUniformValue(layerInstance, "opacity", opacity);

    activateColorRampTexture(gl, layerInstance.textureColorMap);

    gpuActivateBuffer(layerInstance, "posx");
    gpuActivateBuffer(layerInstance, "posy");
    gpuActivateBuffer(layerInstance, "selmask");

    if (sourceData.colorNumerical || sourceData.colorCategorical)
        gpuActivateBuffer(layerInstance, "colorval");
    else
        gpuSetAttributeDefaultValue(layerInstance, "colorval", 0.5);


    if (sourceData.slice) {
        gpuActivateBuffer(layerInstance, "slice");
        gpuSetUniformValue(layerInstance, "slice_minval", sourceData.slice.sliceMin);
        gpuSetUniformValue(layerInstance, "slice_maxval", sourceData.slice.sliceMax);
    } else {
        gpuSetAttributeDefaultValue(layerInstance, "slice", 0.0);
        gpuSetUniformValue(layerInstance, "slice_minval", -1);
        gpuSetUniformValue(layerInstance, "slice_maxval", 1);
    }

    gl.drawArrays(gl.POINTS, 0, pointCount);
}


export const gpurColoredPointsBitmap: TpGPURLayerTypeDefinition = {
    layerTypeId: GPUR_LAYER_TYPES.COLORED_POINTS_BITMAP,
    bufferDefs,
    uniformDefs,
    createProgram: (gl: any) => createGPUProgram(gl, vertexShader, fragmentShader, gpurColoredPointsBitmap),
    createInstance,
    setSourceData,
    performRender,
};
