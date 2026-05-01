import { TpGPURData } from "../../../../util/render-gpu/interfaces";
import { setViewportVolumeLogicalRange, TpViewportVolume } from "../../../../util/geometry/viewportVolume";
import { CHART_MARGIN, CHART_TITLE_HEIGHT, getVisualSetup } from "../helpers/helpers";
import { TpElemInfo, TpResourceRenderContext } from "../interface";
import { getCanvasVolumeLayerTypeDef } from "./canvasVolumeDefinition";
import { TpCanvasVolumeRenderData, TpCanvasVolumeRenderLayer } from "./interface";


export function createRenderData(resourceRenderCtx: TpResourceRenderContext,
    elemDef: any, elemInfo: TpElemInfo, viewportVolume: TpViewportVolume): TpCanvasVolumeRenderData {

    const gpurData: TpGPURData = {
        layers: [],
        viewportVolume,
    };

    let isDataComplete = true;
    const layers: TpCanvasVolumeRenderLayer[] = [];
    for (const [index, layerDef] of elemDef.layers.entries()) {
        const layerId = `canvas_layer_${index}`;
        const layerTypeDef = getCanvasVolumeLayerTypeDef(layerDef.type);
        const visualSetup = getVisualSetup(resourceRenderCtx, layerTypeDef.channels, layerTypeDef.configSettings, layerDef);
        if (visualSetup) {
            const layerData = layerTypeDef.createLayerData(resourceRenderCtx, layerId, visualSetup, elemInfo) as TpCanvasVolumeRenderLayer;
            layers.push(layerData);
            gpurData.layers.push(...layerData.gpuLayers);
        } else {
            isDataComplete = false;
        }
    }

    // A bit of a hack: we take the first layer. A better implementation would consider all layers
    if (layers.length > 0) {
        setViewportVolumeLogicalRange(viewportVolume, layers[0].volumeBasis);
    }

    let totalLegendHeight = 0;
    for (const layer of layers) {
        for (const legend of layer.legendsHor)
            totalLegendHeight += legend.height;
    }

    let chartTitle = elemDef.settings?.title;
    if (!chartTitle && (layers.length > 0)) chartTitle = layers[0].chartTitle || "";

    return {
        layers,
        gpurData,
        isDataComplete,
        chartTitle,
        centralViewportMargins: {
            top: CHART_TITLE_HEIGHT + CHART_MARGIN,
            left:  CHART_MARGIN,
            right: CHART_MARGIN,
            bottom: totalLegendHeight + CHART_MARGIN,
        }
    }

}