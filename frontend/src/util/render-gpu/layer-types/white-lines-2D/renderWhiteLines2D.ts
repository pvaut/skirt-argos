
import { checkFloat32Array, createGPUProgram, getLayerProgram, gpuActivateBuffer, gpuCreateBuffers, gpuSetBufferData, gpuSetUniformValue, set2DBlendType, setGPURViewport } from "../../helpers";
import { TpGPURContext } from "../../interfaces";
import { GPUR_LAYER_TYPES, TpGPURLayerInstance, TpGPURLayerTypeDefinition, BUFFER_DATA_TYPES, TpGPUBufferDef, TpGPUUniformDef, TpGPURLayerData } from "../interfaces";


import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';
import { TpGPURLayerInstanceWhiteLines2D } from "./interfaces";
import { RENDER_TYPES, TpGPURLayerDataColoredPoints2D, TpGPURLayerInstanceColoredPoints2D } from "../colored-points-2D/interfaces";



const bufferDefs: TpGPUBufferDef[] = [
    { name: 'posx', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'posy', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
];



const uniformDefs: TpGPUUniformDef[] = [
    { name: 'opacity', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'intensity', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
];



function createInstance(ctx: TpGPURContext, layerId: string): TpGPURLayerInstanceWhiteLines2D {
    const gl = ctx.gl;
    const layerDef = gpurWhiteLines2D;

    const instance: TpGPURLayerInstanceWhiteLines2D = {
        layerType: GPUR_LAYER_TYPES.WHITE_LINES_2D,
        layerId,
        sourceData: null,
        ctx,
        buffers: gpuCreateBuffers(ctx, layerDef),
    };
    return instance;
}


function setSourceData(layerInstanceInp: TpGPURLayerInstance, dataInp: TpGPURLayerData) {
    const layerInstance = layerInstanceInp as TpGPURLayerInstanceColoredPoints2D;
    const data = dataInp as TpGPURLayerDataColoredPoints2D;
    const gl = layerInstance.ctx.gl;

    gpuSetBufferData(layerInstance, "posx", checkFloat32Array(data.posX));
    gpuSetBufferData(layerInstance, "posy", checkFloat32Array(data.posY));

    layerInstance.sourceData = data;
}



function performRender(ctx: TpGPURContext, layerInstanceInp: TpGPURLayerInstance) {
    const layerInstance = layerInstanceInp as TpGPURLayerInstanceWhiteLines2D;
    const gl = ctx.gl;
    const sourceData = layerInstance.sourceData;
    if (!sourceData) return;
    const pointCount = sourceData.posX.length;

    const myProgram = getLayerProgram(layerInstance);
    gl.useProgram(myProgram.theWebGLProgram);

    setGPURViewport(ctx, myProgram);

    let opacity = 1;
    if (layerInstance.sourceData!.renderType != RENDER_TYPES.OPAQUE)
        opacity = layerInstance.sourceData!.opacity;
    gpuSetUniformValue(layerInstance, "opacity", opacity);

    gpuSetUniformValue(layerInstance, "intensity", layerInstance.sourceData!.intensity);

    set2DBlendType(gl, layerInstance.sourceData!.renderType);

    gpuActivateBuffer(layerInstance, "posx");
    gpuActivateBuffer(layerInstance, "posy");

    gl.drawArrays(gl.LINES, 0, pointCount);
}


export const gpurWhiteLines2D: TpGPURLayerTypeDefinition = {
    layerTypeId: GPUR_LAYER_TYPES.WHITE_LINES_2D,
    bufferDefs,
    uniformDefs,
    createProgram: (gl: any) => createGPUProgram(gl, vertexShader, fragmentShader, gpurWhiteLines2D),
    createInstance,
    setSourceData,
    performRender,
};
