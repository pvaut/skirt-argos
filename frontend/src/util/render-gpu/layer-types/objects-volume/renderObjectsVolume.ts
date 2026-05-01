
import { createGPUProgram, getLayerProgram, gpuActivateBuffer, gpuCreateBuffers,  gpuSetBufferData, setGPURViewport } from "../../helpers";
import { TpGPURContext } from "../../interfaces";
import { GPUR_LAYER_TYPES, TpGPURLayerInstance, TpGPURLayerTypeDefinition, BUFFER_DATA_TYPES, TpGPUBufferDef, TpGPUUniformDef, TpGPURLayerData } from "../interfaces";

import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';
import { TpGPURLayerDataObjectsVolume, TpGPURLayerInstanceObjectsVolume } from "./interfaces";


const bufferDefs: TpGPUBufferDef[] = [
    { name: 'pos', dataType: BUFFER_DATA_TYPES.FLOAT, size: 3 },
    { name: 'color', dataType: BUFFER_DATA_TYPES.FLOAT, size: 4 },
];


const uniformDefs: TpGPUUniformDef[] = [
];



function createInstance(ctx: TpGPURContext, layerId: string): TpGPURLayerInstanceObjectsVolume {
    const gl = ctx.gl;
    const layerDef = gpurObjectsVolume;

    const instance: TpGPURLayerInstanceObjectsVolume = {
        layerType: GPUR_LAYER_TYPES.OBJECTS_VOLUME,
        layerId,
        sourceData: null,
        ctx,
        buffers: gpuCreateBuffers(ctx, layerDef),
    };
    return instance;
}


function setSourceData(layerInstanceInp: TpGPURLayerInstance, dataInp: TpGPURLayerData) {
    const layerInstance = layerInstanceInp as TpGPURLayerInstanceObjectsVolume;
    const data = dataInp as TpGPURLayerDataObjectsVolume;
    gpuSetBufferData(layerInstance, "pos", new Float32Array(data.posits));
    gpuSetBufferData(layerInstance, "color", new Float32Array(data.colors));
    layerInstance.sourceData = data;
}


function performRender(ctx: TpGPURContext, layerInstanceInp: TpGPURLayerInstance) {
    const layerInstance = layerInstanceInp as TpGPURLayerInstanceObjectsVolume;
    const gl = ctx.gl;
    const sourceData = layerInstance.sourceData;
    if (!sourceData) return;
    const pointCount = sourceData.posits.length / 3;

    const myProgram = getLayerProgram(layerInstance);
    gl.useProgram(myProgram.theWebGLProgram);

    setGPURViewport(ctx, myProgram);

    gl.enable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);

    gpuActivateBuffer(layerInstance, "pos");
    gpuActivateBuffer(layerInstance, "color");

    gl.drawArrays(gl.TRIANGLES, 0, pointCount);
}


export const gpurObjectsVolume: TpGPURLayerTypeDefinition = {
    layerTypeId: GPUR_LAYER_TYPES.OBJECTS_VOLUME,
    bufferDefs,
    uniformDefs,
    createProgram: (gl: any) => createGPUProgram(gl, vertexShader, fragmentShader, gpurObjectsVolume),
    createInstance,
    setSourceData,
    performRender,
};
