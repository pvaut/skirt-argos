
import { checkFloat32Array, checkUint8Array, createGPUProgram, getLayerProgram, gpuActivateBuffer, gpuCreateBuffers, gpuSetAttributeDefaultValue, gpuSetBufferData, gpuSetUniformValue, setGPURViewport } from "../../helpers";
import { TpGPURContext } from "../../interfaces";
import { GPUR_LAYER_TYPES, TpGPURLayerInstance, TpGPURLayerTypeDefinition, BUFFER_DATA_TYPES, TpGPUBufferDef, TpGPUUniformDef, TpGPURLayerData } from "../interfaces";


import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';
import { TpGPURLayerDataLinesVelocityVolume, TpGPURLayerInstanceLinesVelocityVolume } from "./interfaces";




const bufferDefs: TpGPUBufferDef[] = [
    { name: 'posx', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'posy', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'posz', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'line_edge_type', dataType: BUFFER_DATA_TYPES.BYTE, size: 1 },
    { name: 'selmask', dataType: BUFFER_DATA_TYPES.BYTE, size: 1 },
    { name: 'slice', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
];



const uniformDefs: TpGPUUniformDef[] = [
    { name: 'opacity', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'slice_minval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'slice_maxval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
];



function createInstance(ctx: TpGPURContext, layerId: string): TpGPURLayerInstanceLinesVelocityVolume {
    const gl = ctx.gl;
    const layerDef = gpurLinesVelocityVolume;

    const instance: TpGPURLayerInstanceLinesVelocityVolume = {
        layerType: GPUR_LAYER_TYPES.LINES_VELOCITY_VOLUME,
        layerId,
        sourceData: null,
        ctx,
        buffers: gpuCreateBuffers(ctx, layerDef),
    };
    return instance;
}


function setSourceData(layerInstanceInp: TpGPURLayerInstance, dataInp: TpGPURLayerData) {
    const layerInstance = layerInstanceInp as TpGPURLayerInstanceLinesVelocityVolume;
    const data = dataInp as TpGPURLayerDataLinesVelocityVolume;

    gpuSetBufferData(layerInstance, "posx", checkFloat32Array(data.posX));
    gpuSetBufferData(layerInstance, "posy", checkFloat32Array(data.posY));
    gpuSetBufferData(layerInstance, "posz", checkFloat32Array(data.posZ));
    gpuSetBufferData(layerInstance, "line_edge_type", checkUint8Array(data.lineEdgeType));
    gpuSetBufferData(layerInstance, "selmask", checkUint8Array(data.selectionMask));
    gpuSetBufferData(layerInstance, "slice", checkFloat32Array(data.slice?.sliceValues));

    layerInstance.sourceData = data;
}



function performRender(ctx: TpGPURContext, layerInstanceInp: TpGPURLayerInstance) {
    const layerInstance = layerInstanceInp as TpGPURLayerInstanceLinesVelocityVolume;
    const gl = ctx.gl;
    const sourceData = layerInstance.sourceData;
    if (!sourceData) return;
    const pointCount = sourceData.posX.length;

    if (!sourceData.isActive) return;

    const myProgram = getLayerProgram(layerInstance);
    gl.useProgram(myProgram.theWebGLProgram);

    setGPURViewport(ctx, myProgram);

    let opacity = sourceData.opacity;
    gpuSetUniformValue(layerInstance, "opacity", opacity);

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(false); // we render the lines transparent

    gpuActivateBuffer(layerInstance, "posx");
    gpuActivateBuffer(layerInstance, "posy");
    gpuActivateBuffer(layerInstance, "posz");
    gpuActivateBuffer(layerInstance, "line_edge_type");
    gpuActivateBuffer(layerInstance, "selmask");

    if (sourceData.slice) {
        gpuActivateBuffer(layerInstance, "slice");
        gpuSetUniformValue(layerInstance, "slice_minval", sourceData.slice.sliceMin);
        gpuSetUniformValue(layerInstance, "slice_maxval", sourceData.slice.sliceMax);
    } else {
        gpuSetAttributeDefaultValue(layerInstance, "slice", 0.0);
        gpuSetUniformValue(layerInstance, "slice_minval", -1);
        gpuSetUniformValue(layerInstance, "slice_maxval", 1);
    }

    gl.drawArrays(gl.LINES, 0, pointCount);

    gl.depthMask(true);

}


export const gpurLinesVelocityVolume: TpGPURLayerTypeDefinition = {
    layerTypeId: GPUR_LAYER_TYPES.LINES_VELOCITY_VOLUME,
    bufferDefs,
    uniformDefs,
    createProgram: (gl: any) => createGPUProgram(gl, vertexShader, fragmentShader, gpurLinesVelocityVolume),
    createInstance,
    setSourceData,
    performRender,
};
