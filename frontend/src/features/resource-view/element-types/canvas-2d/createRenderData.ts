
import { TpGPURData } from "../../../../util/render-gpu/interfaces";
import { combineRange, combineRange2D, createEmptyRange2D, extendRange2DRelative, setViewport2DLogicalRange, TpViewport2D } from "../../../../util/geometry/viewport2D";
import { getDashboardConsolidatedRange } from "../helpers/dashboardConsolidatedRanges";
import { CHART_CAT_XAXIS_HEIGHT, CHART_MARGIN, CHART_NUM_XAXIS_HEIGHT, CHART_NUM_YAXIS_WIDTH, CHART_TITLE_HEIGHT, getVisualSetup } from "../helpers/helpers";
import { SYNCGROUP_TYPES, TpElemInfo, TpResourceRenderContext } from "../interface";
import { getCanvas2DLayerTypeDef } from "./canvas2DDefinition";
import { TpAxisCategories, TpCanvas2DRenderData, TpCanvas2DRenderLayer } from "./interface";


export function createRenderData(resourceRenderCtx: TpResourceRenderContext,
    elemDef: any, elemInfo: TpElemInfo, viewport2D: TpViewport2D, hideXYAxes: boolean): TpCanvas2DRenderData {
    const gpurData: TpGPURData = {
        layers: [],
        viewport2D,
    };

    let isDataComplete = true;
    const consolidatedRange = createEmptyRange2D(); // combined range of all layers
    const layers: TpCanvas2DRenderLayer[] = [];
    for (const [index, layerDef] of elemDef.layers.entries()) {
        const layerId = `canvas_layer_${index}`;
        const layerTypeDef = getCanvas2DLayerTypeDef(layerDef.type);
        const visualSetup = getVisualSetup(resourceRenderCtx, layerTypeDef.channels, layerTypeDef.configSettings, layerDef);
        if (visualSetup) {
            const layerData = layerTypeDef.createLayerData(resourceRenderCtx, layerId, visualSetup, elemInfo) as TpCanvas2DRenderLayer;
            layers.push(layerData);
            gpurData.layers.push(...layerData.gpuLayers);
            combineRange2D(consolidatedRange, layerData.canvasRange);
        } else {
            isDataComplete = false;
        }
    }

    if (elemInfo.syncGroups[SYNCGROUP_TYPES.XAXIS]) {
        const dashboardRange = getDashboardConsolidatedRange(resourceRenderCtx, SYNCGROUP_TYPES.XAXIS, elemInfo.syncGroups[SYNCGROUP_TYPES.XAXIS]);
        if (dashboardRange) combineRange(consolidatedRange.x, dashboardRange);
    }
    if (elemInfo.syncGroups[SYNCGROUP_TYPES.YAXIS]) {
        const dashboardRange = getDashboardConsolidatedRange(resourceRenderCtx, SYNCGROUP_TYPES.YAXIS, elemInfo.syncGroups[SYNCGROUP_TYPES.YAXIS]);
        if (dashboardRange) combineRange(consolidatedRange.y, dashboardRange);
    }

    extendRange2DRelative(consolidatedRange, 0.05);
    setViewport2DLogicalRange(viewport2D, consolidatedRange);

    let chartTitle = "";
    let xAxisName = "X axis";
    let yAxisName = "Y axis";
    let xAxisCategories: TpAxisCategories | null = null;
    if (layers.length > 0) {
        const theLayerData = layers[0];// for now, we take he title from the first layer
        if (theLayerData.visualSetup) {
            chartTitle = theLayerData.chartTitle;
            xAxisName = theLayerData.xAxisName;
            yAxisName = theLayerData.yAxisName;
            if (theLayerData.xAxisCategories)
                xAxisCategories = theLayerData.xAxisCategories;
        }
    }
    if (elemDef.settings?.title) chartTitle = elemDef.settings!.title;

    let totalLegendHeight = 0;
    for (const layer of layers) {
        for (const legend of layer.legendsHor)
            totalLegendHeight += legend.height;
    }

    const xAxisHeight = (!hideXYAxes) ? (!xAxisCategories ? CHART_NUM_XAXIS_HEIGHT : CHART_CAT_XAXIS_HEIGHT) : 0;
    const yAxisWidth = (!hideXYAxes) ? CHART_NUM_YAXIS_WIDTH : 0;

    return {
        layers,
        gpurData,
        isDataComplete,
        chartTitle,
        xAxisName,
        xAxisCategories,
        yAxisName,
        centralViewportMargins: {
            top: CHART_TITLE_HEIGHT + CHART_MARGIN,
            left: yAxisWidth + CHART_MARGIN,
            right: CHART_MARGIN,
            bottom: xAxisHeight + totalLegendHeight + CHART_MARGIN,
        }
    }
}
