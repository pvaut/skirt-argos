import { createConfigError, createInternalError } from "../../util/errors";
import { TpGPURContext, TpGPURData, TpGPURProgramContext } from "./interfaces";
import { layerTypesList, renderLayerTypeFactory } from "./layer-types/renderLayerTypeFactory";


export function initGPUR(
    canvas: HTMLCanvasElement,
    renderData: TpGPURData,
    pixelRatio: number,
): TpGPURContext {
    const gl = canvas!.getContext('webgl2', {
        depth: true, // We always activate depth test, also for "2D" rendering, because it can speed up in case of opaque rendering
        premultipliedAlpha: false,
        alpha: false, // no alpha in the backbuffer
        powerPreference: 'high-performance',
        antialias: true,
        preserveDrawingBuffer: true, // to ensure that we can get bitmap data for download
    })!;

    // Here we create the program for each layer type (shared across all layer instances)
    const layerTypeProgramsMap: { [layerTypeId: string]: TpGPURProgramContext } = {};
    for (const layerType of layerTypesList) {
        layerTypeProgramsMap[layerType.layerTypeId] = layerType.createProgram(gl);
    }

    const ctx: TpGPURContext = {
        canvas,
        gl,
        layerTypeProgramsMap,
        renderLayers: [],
        pixelRatio,
        viewport2D: renderData.viewport2D,
        viewportVolume: renderData.viewportVolume,
    };

    const idsMap: { [id: string]: boolean } = {};
    for (const layerData of renderData.layers) {
        if (!layerData.layerId || idsMap[layerData.layerId])
            throw createConfigError('Invalid GPUR layer id');
        const renderer = renderLayerTypeFactory(layerData.layerType);
        const layer = renderer.createInstance(ctx, layerData.layerId);
        renderer.setSourceData(layer, layerData);
        ctx.renderLayers.push(layer);
    }

    return ctx;
}


export function updateGPURData(ctx: TpGPURContext, renderData: TpGPURData) {
    for (const renderLayer of ctx.renderLayers) {
        const layerData = renderData.layers.find(layerData => layerData.layerId == renderLayer.layerId);
        if (!layerData) throw createInternalError(`Layer not found!`);
        renderLayerTypeFactory(renderLayer.layerType).setSourceData(renderLayer, layerData);
    }
}


export function renderGPUR(ctx: TpGPURContext) {
    const { gl } = ctx;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0., 0., 0., 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    const usedIds: { [layerId: string]: boolean } = {};
    for (const renderLayer of ctx.renderLayers) {
        if (usedIds[renderLayer.layerId])
            throw createInternalError(`Duplicate GPU render layer id: ${renderLayer.layerId}`);
        usedIds[renderLayer.layerId] = true;
        const renderer = renderLayerTypeFactory(renderLayer.layerType);
        renderer.performRender(ctx, renderLayer);
    }
}
