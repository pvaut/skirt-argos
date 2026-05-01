
import { checkFloat32Array, checkUint8Array, createGPUProgram, getLayerProgram, gpuActivateBuffer, gpuCreateBuffers, gpuSetBufferData, gpuSetUniformValue, setGPURViewport } from "../../helpers";
import { TpGPURContext } from "../../interfaces";
import { GPUR_LAYER_TYPES, TpGPURLayerInstance, TpGPURLayerTypeDefinition, BUFFER_DATA_TYPES, TpGPUBufferDef, TpGPUUniformDef, TpGPURLayerData } from "../interfaces";


import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';
import { getRangeSize, getViewport2DCoordConvertors } from "../../../geometry/viewport2D";
import { TpGPURLayerDataBitmapRGB, TpGPURLayerInstanceBitmapRGB } from "./interfaces";



const bufferDefs: TpGPUBufferDef[] = [
    { name: 'posx', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'posy', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'color_source_r', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'color_source_g', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'color_source_b', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'selmask', dataType: BUFFER_DATA_TYPES.BYTE, size: 1 },
];



const uniformDefs: TpGPUUniformDef[] = [
    { name: 'pointsize', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'pointsize_rel_x', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'pointsize_rel_y', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'background', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'softening', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'stretch', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'color_saturation_buffer', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'norm_r', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'norm_g', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'norm_b', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    // { name: 'color_minval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    // { name: 'color_maxval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    // { name: 'color_gammafactor', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    // { name: 'slice_minval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    // { name: 'slice_maxval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
];



function createInstance(ctx: TpGPURContext, layerId: string): TpGPURLayerInstanceBitmapRGB {
    const gl = ctx.gl;
    const layerDef = gpurBitmapRGB;

    const textureColorMap = gl.createTexture();

    const instance: TpGPURLayerInstanceBitmapRGB = {
        layerType: GPUR_LAYER_TYPES.BITMAP_RGB,
        layerId,
        sourceData: null,
        ctx,
        buffers: gpuCreateBuffers(ctx, layerDef),
        textureColorMap,
    };
    return instance;
}


function setSourceData(layerInstanceInp: TpGPURLayerInstance, dataInp: TpGPURLayerData) {
    const layerInstance = layerInstanceInp as TpGPURLayerInstanceBitmapRGB;
    const data = dataInp as TpGPURLayerDataBitmapRGB;
    const gl = layerInstance.ctx.gl;

    gpuSetBufferData(layerInstance, "posx", checkFloat32Array(data.posX));
    gpuSetBufferData(layerInstance, "posy", checkFloat32Array(data.posY));
    gpuSetBufferData(layerInstance, "selmask", checkUint8Array(data.selectionMask));
    gpuSetBufferData(layerInstance, "color_source_r", checkFloat32Array(data.colorSourceR));
    gpuSetBufferData(layerInstance, "color_source_g", checkFloat32Array(data.colorSourceG));
    gpuSetBufferData(layerInstance, "color_source_b", checkFloat32Array(data.colorSourceB));

    // gl.bindTexture(gl.TEXTURE_2D, layerInstance.textureColorMap);
    // if (data.colorNumerical)
    //     setTextureColorRamp(gl, data.colorNumerical.colorRamp, 1);
    // else if (data.colorCategorical)
    //     setTextureColorRamp(gl, data.colorCategorical.colorPalette, 1);
    // else
    //     setTextureFixedColor(gl, getColor(50, 140, 200), 1);

    layerInstance.sourceData = data;
}



function performRender(ctx: TpGPURContext, layerInstanceInp: TpGPURLayerInstance) {
    const layerInstance = layerInstanceInp as TpGPURLayerInstanceBitmapRGB;
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

    gpuSetUniformValue(layerInstance, "background", sourceData.settingsGlobal.background);
    gpuSetUniformValue(layerInstance, "softening", sourceData.settingsGlobal.softening);
    gpuSetUniformValue(layerInstance, "stretch", sourceData.settingsGlobal.stretch);
    gpuSetUniformValue(layerInstance, "color_saturation_buffer", sourceData.settingsGlobal.colorSaturationBuffer);
   

    gpuSetUniformValue(layerInstance, "norm_r", sourceData.settingsR.norm);
    gpuSetUniformValue(layerInstance, "norm_g", sourceData.settingsG.norm);
    gpuSetUniformValue(layerInstance, "norm_b", sourceData.settingsB.norm);

    // activateColorRampTexture(gl, layerInstance.textureColorMap);

    gpuActivateBuffer(layerInstance, "posx");
    gpuActivateBuffer(layerInstance, "posy");
    gpuActivateBuffer(layerInstance, "color_source_r");
    gpuActivateBuffer(layerInstance, "color_source_g");
    gpuActivateBuffer(layerInstance, "color_source_b");
    gpuActivateBuffer(layerInstance, "selmask");


    gl.drawArrays(gl.POINTS, 0, pointCount);
}


export const gpurBitmapRGB: TpGPURLayerTypeDefinition = {
    layerTypeId: GPUR_LAYER_TYPES.BITMAP_RGB,
    bufferDefs,
    uniformDefs,
    createProgram: (gl: any) => createGPUProgram(gl, vertexShader, fragmentShader, gpurBitmapRGB),
    createInstance,
    setSourceData,
    performRender,
};
