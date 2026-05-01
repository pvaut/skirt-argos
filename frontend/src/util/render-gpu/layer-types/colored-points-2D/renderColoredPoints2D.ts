
import { checkFloat32Array, checkUint8Array, createGPUProgram, getLayerProgram, gpuActivateBuffer, gpuCreateBuffers, gpuSetAttributeDefaultValue, gpuSetBufferData, gpuSetUniformValue, set2DBlendType, setGPURViewport } from "../../helpers";
import { TpGPURContext } from "../../interfaces";
import { GPUR_LAYER_TYPES, TpGPURLayerInstance, TpGPURLayerTypeDefinition, BUFFER_DATA_TYPES, TpGPUBufferDef, TpGPUUniformDef, TpGPURLayerData } from "../interfaces";
import { RENDER_TYPES, TpGPURLayerDataColoredPoints2D, TpGPURLayerInstanceColoredPoints2D } from "./interfaces";

import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';
import { activateColorRampTexture, setTextureColorRamp, setTextureFixedColor } from "../../texture";
import { getColor } from "../../../color/color";



const bufferDefs: TpGPUBufferDef[] = [
    { name: 'posx', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'posy', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'colorval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'selmask', dataType: BUFFER_DATA_TYPES.BYTE, size: 1 },
    { name: 'slice', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
];



const uniformDefs: TpGPUUniformDef[] = [
    { name: 'pointsize', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'opacity', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'color_minval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'color_maxval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'color_gammafactor', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'slice_minval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'slice_maxval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
];



function createInstance(ctx: TpGPURContext, layerId: string): TpGPURLayerInstanceColoredPoints2D {
    const gl = ctx.gl;
    const layerDef = gpurColoredPoints2D;

    const textureColorMap = gl.createTexture();

    const instance: TpGPURLayerInstanceColoredPoints2D = {
        layerType: GPUR_LAYER_TYPES.COLORED_POINTS_2D,
        layerId,
        sourceData: null,
        ctx,
        buffers: gpuCreateBuffers(ctx, layerDef),
        textureColorMap,
    };
    return instance;
}


function setSourceData(layerInstanceInp: TpGPURLayerInstance, dataInp: TpGPURLayerData) {
    const layerInstance = layerInstanceInp as TpGPURLayerInstanceColoredPoints2D;
    const data = dataInp as TpGPURLayerDataColoredPoints2D;
    const gl = layerInstance.ctx.gl;

    gpuSetBufferData(layerInstance, "posx", checkFloat32Array(data.posX));
    gpuSetBufferData(layerInstance, "posy", checkFloat32Array(data.posY));
    gpuSetBufferData(layerInstance, "selmask", checkUint8Array(data.selectionMask));
    gpuSetBufferData(layerInstance, "colorval", checkFloat32Array(data.colorNumerical?.values || data.colorCategorical?.values));
    gpuSetBufferData(layerInstance, "slice", checkFloat32Array(data.slice?.sliceValues));

    gl.bindTexture(gl.TEXTURE_2D, layerInstance.textureColorMap);
    if (data.colorNumerical)
        setTextureColorRamp(gl, data.colorNumerical.colorRamp, data.opacity);
    else if (data.colorCategorical)
        setTextureColorRamp(gl, data.colorCategorical.colorPalette, data.opacity);
    else
        setTextureFixedColor(gl, getColor(50, 140, 200), data.opacity);

    layerInstance.sourceData = data;
}



function performRender(ctx: TpGPURContext, layerInstanceInp: TpGPURLayerInstance) {
    const layerInstance = layerInstanceInp as TpGPURLayerInstanceColoredPoints2D;
    const gl = ctx.gl;
    const sourceData = layerInstance.sourceData;
    if (!sourceData) return;
    const pointCount = sourceData.posX.length;

    const myProgram = getLayerProgram(layerInstance);
    gl.useProgram(myProgram.theWebGLProgram);

    setGPURViewport(ctx, myProgram);

    const dispSizeFactor = (ctx.viewport2D!.totalDisplayWidth + ctx.viewport2D!.totalDisplayHeight) / 1000;
    const pointSize = layerInstance.sourceData!.pointSizeFactor * ctx.viewport2D!.mapX.zoom ** 0.5 * dispSizeFactor;
    gpuSetUniformValue(layerInstance, "pointsize", pointSize * ctx.pixelRatio);

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
    if (layerInstance.sourceData!.renderType != RENDER_TYPES.OPAQUE)
        opacity = layerInstance.sourceData!.opacity;
    gpuSetUniformValue(layerInstance, "opacity", opacity);

    set2DBlendType(gl, layerInstance.sourceData!.renderType);

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


export const gpurColoredPoints2D: TpGPURLayerTypeDefinition = {
    layerTypeId: GPUR_LAYER_TYPES.COLORED_POINTS_2D,
    bufferDefs,
    uniformDefs,
    createProgram: (gl: any) => createGPUProgram(gl, vertexShader, fragmentShader, gpurColoredPoints2D),
    createInstance,
    setSourceData,
    performRender,
};
