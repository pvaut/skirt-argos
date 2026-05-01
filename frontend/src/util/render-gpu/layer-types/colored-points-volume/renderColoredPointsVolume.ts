
import { checkFloat32Array, checkUint8Array, createGPUProgram, getLayerProgram, gpuActivateBuffer, gpuCreateBuffers, gpuSetAttributeDefaultValue, gpuSetBufferData, gpuSetUniformValue, setGPURViewport } from "../../helpers";
import { TpGPURContext } from "../../interfaces";
import { GPUR_LAYER_TYPES, TpGPURLayerInstance, TpGPURLayerTypeDefinition, BUFFER_DATA_TYPES, TpGPUBufferDef, TpGPUUniformDef, TpGPURLayerData } from "../interfaces";


import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';
import { activateColorRampTexture, setTextureColorRamp, setTextureFixedColor } from "../../texture";
import { TpGPURLayerDataColoredPointsVolume, TpGPURLayerInstanceColoredPointsVolume } from "./interfaces";
import { getColor } from "../../../color/color";


const bufferDefs: TpGPUBufferDef[] = [
    { name: 'posx', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'posy', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'posz', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'colorval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'size', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'selmask', dataType: BUFFER_DATA_TYPES.BYTE, size: 1 },
    { name: 'slice', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
];


const uniformDefs: TpGPUUniformDef[] = [
    { name: 'pointsize', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'color_minval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'color_maxval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'color_gammafactor', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'size_minval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'size_maxval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'size_gammafactor', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'slice_minval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
    { name: 'slice_maxval', dataType: BUFFER_DATA_TYPES.FLOAT, size: 1 },
];



function createInstance(ctx: TpGPURContext, layerId: string): TpGPURLayerInstanceColoredPointsVolume {
    const gl = ctx.gl;
    const layerDef = gpurColoredPointsVolume;

    const textureColorMap = gl.createTexture();

    const instance: TpGPURLayerInstanceColoredPointsVolume = {
        layerType: GPUR_LAYER_TYPES.COLORED_POINTS_VOLUME,
        layerId,
        sourceData: null,
        ctx,
        buffers: gpuCreateBuffers(ctx, layerDef),
        textureColorMap,
    };
    return instance;
}


function setSourceData(layerInstanceInp: TpGPURLayerInstance, dataInp: TpGPURLayerData) {
    const layerInstance = layerInstanceInp as TpGPURLayerInstanceColoredPointsVolume;
    const data = dataInp as TpGPURLayerDataColoredPointsVolume;
    const gl = layerInstance.ctx.gl;

    gpuSetBufferData(layerInstance, "posx", checkFloat32Array(data.posX));
    gpuSetBufferData(layerInstance, "posy", checkFloat32Array(data.posY));
    gpuSetBufferData(layerInstance, "posz", checkFloat32Array(data.posZ));
    gpuSetBufferData(layerInstance, "selmask", checkUint8Array(data.selectionMask));
    gpuSetBufferData(layerInstance, "colorval", checkFloat32Array(data.colorNumerical?.values || data.colorCategorical?.values));
    gpuSetBufferData(layerInstance, "slice", checkFloat32Array(data.slice?.sliceValues));
    gpuSetBufferData(layerInstance, "size", checkFloat32Array(data.sizes?.values));

    gl.bindTexture(gl.TEXTURE_2D, layerInstance.textureColorMap);
    if (data.colorNumerical)
        setTextureColorRamp(gl, data.colorNumerical.colorRamp, 1.0);
    else if (data.colorCategorical)
        setTextureColorRamp(gl, data.colorCategorical.colorPalette, 1.0);
    else
        setTextureFixedColor(gl, getColor(50, 140, 200), 1.0);

    layerInstance.sourceData = data;
}


function performRender(ctx: TpGPURContext, layerInstanceInp: TpGPURLayerInstance) {
    const layerInstance = layerInstanceInp as TpGPURLayerInstanceColoredPointsVolume;
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

    if (!sourceData.sizes?.scaleOpacityWithSize) {
        gl.disable(gl.BLEND);
        // NOTE: enabling depth test improves speed in case a lot of overlapping fragments are drawn (e.g. clusters of points)
        // Overlapping fragments create a bottleneck for the GPU, as they cannot by parallelized
        // Therefore we activate depth test for fast, opaque points rendering
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.clear(gl.DEPTH_BUFFER_BIT); // We clear the depth buffer, because we want to respect the order of the different 2D drawing layers (e.g. unselected vs. selected points)
    } else {
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.DEPTH_TEST);
    }

    activateColorRampTexture(gl, layerInstance.textureColorMap);

    gpuActivateBuffer(layerInstance, "posx");
    gpuActivateBuffer(layerInstance, "posy");
    gpuActivateBuffer(layerInstance, "posz");

    gpuActivateBuffer(layerInstance, "selmask");

    if (sourceData.colorNumerical || sourceData.colorCategorical)
        gpuActivateBuffer(layerInstance, "colorval");
    else
        gpuSetAttributeDefaultValue(layerInstance, "colorval", 0.5);

    if (sourceData.sizes) {
        gpuActivateBuffer(layerInstance, "size");
        gpuSetUniformValue(layerInstance, "size_minval", sourceData.sizes.minVal);
        gpuSetUniformValue(layerInstance, "size_maxval", sourceData.sizes.maxVal);
        gpuSetUniformValue(layerInstance, "size_gammafactor", sourceData.sizes.gammaFactor);
    } else {
        gpuSetAttributeDefaultValue(layerInstance, "size", 1.0);
        gpuSetUniformValue(layerInstance, "size_minval", 0.0);
        gpuSetUniformValue(layerInstance, "size_maxval", 1.0);
        gpuSetUniformValue(layerInstance, "size_gammafactor", 1.0);
    }

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


export const gpurColoredPointsVolume: TpGPURLayerTypeDefinition = {
    layerTypeId: GPUR_LAYER_TYPES.COLORED_POINTS_VOLUME,
    bufferDefs,
    uniformDefs,
    createProgram: (gl: any) => createGPUProgram(gl, vertexShader, fragmentShader, gpurColoredPointsVolume),
    createInstance,
    setSourceData,
    performRender,
};
