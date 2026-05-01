import { checkFloat32Array, checkUint8Array, createGPUProgram, getLayerProgram, gpuActivateBuffer, gpuCreateBuffers, gpuSetAttributeDefaultValue, gpuSetBufferData, gpuSetUniformValue, setGPURViewport } from "../../helpers";
import { TpGPURContext } from "../../interfaces";
import { GPUR_LAYER_TYPES, TpGPURLayerInstance, TpGPURLayerTypeDefinition, BUFFER_DATA_TYPES, TpGPUBufferDef, TpGPUUniformDef, TpGPURLayerData } from "../interfaces";


import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';
import { activateColorRampTexture, setTextureColorRamp } from "../../texture";
import { TpGPURLayerDataPointsVelocityVolume, TpGPURLayerInstancePointsVelocityVolume } from "./interfaces";


const bufferDefs: TpGPUBufferDef[] = [
    { name: 'posx', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'posy', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'posz', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'velx', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'vely', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'velz', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'selmask', dataType: BUFFER_DATA_TYPES.BYTE, size: 1 },
    { name: 'slice', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
];



const uniformDefs: TpGPUUniformDef[] = [
    { name: 'vel_cent_x', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'vel_cent_y', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'vel_cent_z', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'vel_half_range', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'vel_dir_frac', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'pointsize', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'opacity', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'slice_minval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'slice_maxval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
];



function createInstance(ctx: TpGPURContext, layerId: string): TpGPURLayerInstancePointsVelocityVolume {
    const gl = ctx.gl;
    const layerDef = gpurPointsVelocityVolume;

    const textureColorMap = gl.createTexture();

    const instance: TpGPURLayerInstancePointsVelocityVolume = {
        layerType: GPUR_LAYER_TYPES.POINTS_VELOCITY_VOLUME,
        layerId,
        sourceData: null,
        ctx,
        buffers: gpuCreateBuffers(ctx, layerDef),
        textureColorMap,
    };
    return instance;
}


function setSourceData(layerInstanceInp: TpGPURLayerInstance, dataInp: TpGPURLayerData) {
    const layerInstance = layerInstanceInp as TpGPURLayerInstancePointsVelocityVolume;
    const data = dataInp as TpGPURLayerDataPointsVelocityVolume;
    const gl = layerInstance.ctx.gl;

    gpuSetBufferData(layerInstance, "posx", checkFloat32Array(data.posX));
    gpuSetBufferData(layerInstance, "posy", checkFloat32Array(data.posY));
    gpuSetBufferData(layerInstance, "posz", checkFloat32Array(data.posZ));
    gpuSetBufferData(layerInstance, "velx", checkFloat32Array(data.velX));
    gpuSetBufferData(layerInstance, "vely", checkFloat32Array(data.velY));
    gpuSetBufferData(layerInstance, "velz", checkFloat32Array(data.velZ));
    gpuSetBufferData(layerInstance, "selmask", checkUint8Array(data.selectionMask));
    gpuSetBufferData(layerInstance, "slice", checkFloat32Array(data.slice?.sliceValues));

    gl.bindTexture(gl.TEXTURE_2D, layerInstance.textureColorMap);
    setTextureColorRamp(gl, data.velocColor.colorRamp, 1);

    layerInstance.sourceData = data;
}


function performRender(ctx: TpGPURContext, layerInstanceInp: TpGPURLayerInstance) {
    const layerInstance = layerInstanceInp as TpGPURLayerInstancePointsVelocityVolume;
    const gl = ctx.gl;
    const sourceData = layerInstance.sourceData;
    if (!sourceData) return;
    const pointCount = sourceData.posX.length;
    if (sourceData.pointSizeFactor == 0) return;

    const myProgram = getLayerProgram(layerInstance);
    gl.useProgram(myProgram.theWebGLProgram);

    setGPURViewport(ctx, myProgram);
    const viewportVolume = ctx.viewportVolume!;

    const dispSizeFactor = (viewportVolume.totalDisplayHeight + viewportVolume.totalDisplayHeight) / 1000;
    const pointSize = sourceData.pointSizeFactor * viewportVolume.zoomFactor ** 0.5 * dispSizeFactor;
    gpuSetUniformValue(layerInstance, "pointsize", pointSize * ctx.pixelRatio);
    gpuSetUniformValue(layerInstance, "vel_cent_x", sourceData.velocCalib.velocCenter.x);
    gpuSetUniformValue(layerInstance, "vel_cent_y", sourceData.velocCalib.velocCenter.y);
    gpuSetUniformValue(layerInstance, "vel_cent_z", sourceData.velocCalib.velocCenter.z);
    gpuSetUniformValue(layerInstance, "vel_half_range", sourceData.velocCalib.velocHalfRange);
    gpuSetUniformValue(layerInstance, "vel_dir_frac", 0.0);
    gpuSetUniformValue(layerInstance, "opacity", 1);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    activateColorRampTexture(gl, layerInstance.textureColorMap);

    gpuActivateBuffer(layerInstance, "posx");
    gpuActivateBuffer(layerInstance, "posy");
    gpuActivateBuffer(layerInstance, "posz");

    gpuActivateBuffer(layerInstance, "velx");
    gpuActivateBuffer(layerInstance, "vely");
    gpuActivateBuffer(layerInstance, "velz");

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

    gl.drawArrays(gl.POINTS, 0, pointCount);
}


export const gpurPointsVelocityVolume: TpGPURLayerTypeDefinition = {
    layerTypeId: GPUR_LAYER_TYPES.POINTS_VELOCITY_VOLUME,
    bufferDefs,
    uniformDefs,
    createProgram: (gl: any) => createGPUProgram(gl, vertexShader, fragmentShader, gpurPointsVelocityVolume),
    createInstance,
    setSourceData,
    performRender,
};
