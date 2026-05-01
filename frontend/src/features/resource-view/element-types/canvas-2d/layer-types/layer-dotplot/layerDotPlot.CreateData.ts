import { getTableAggregation } from "../../../../../../data/tables/table-aggregations/cachedTableAggregations";
import { changeOpacity, color2String } from "../../../../../../util/color/color";
import { TpFilterInstance } from "../../../../../../util/filters/interfaces";
import { getGammaFactor } from "../../../../../../util/misc";
import { getArrayValueRange, getViewport2DCoordConvertors, restrictRange, TpRange2D, TpViewport2D } from "../../../../../../util/geometry/viewport2D";
import { TpVisualSetup } from "../../../helpers/helpers";
import { TpElemInfo, TpResourceRenderContext } from "../../../interface";
import { TpCanvas2DLegendHor, TpCanvas2DRenderLayer } from "../../interface";
import { LAYERTYPE_DOTPLOT, TpLayerDataSpecificsDotPlot } from "./layerDotPlot.Definition";
import { TpPoint2D } from "../../../../../../util/geometry/point2D";
import { filterTypeLasso2D } from "../../../../../../util/filters/filter-types/filterTypeLasso2D";
import { aggDotPlot, TpDotPlotData, TpDotPlotRecipe } from "../../../../../../data/tables/table-aggregations/recipes/dotPlot";
import { LEGEND_TYPE_COLOR, renderColorRangeLegendBase } from "../../../legends/colorLegend";
import { getColorRamp } from "../../../../../../util/color/colorRamps";
import { TpViewportVolume } from "../../../../../../util/geometry/viewportVolume";
import { getColorSchemaGray, theAppColorSchema } from "../../../../../../util/color/appColorSchema";


export function createHistogramLayerData(resourceRenderCtx: TpResourceRenderContext, layerId: string, visualSetup: TpVisualSetup, elemInfo: TpElemInfo): TpCanvas2DRenderLayer {

    const resolution = parseFloat(visualSetup.configSettings.resolution);
    const settings: TpDotPlotRecipe = {
        xChannelId: visualSetup.channelEncodings.x.id,
        yChannelId: visualSetup.channelEncodings.y.id,
        quantChannelId: visualSetup.channelEncodings.color?.id,
        quantAggrType: visualSetup.configSettings.quantAggrType || null,
        resolutionX: resolution,
        resolutionY: resolution,
        contourSettings: null,
    }

    if (visualSetup.configSettings.contourShow) {
        settings.contourSettings = {
            desiredLevelCount: parseFloat(visualSetup.configSettings.contourLevelCount),
            smoothKernelWidth: parseFloat(visualSetup.configSettings.contourSmoothingKernelWidth),
        }
    }

    const data = getTableAggregation<TpDotPlotData>(visualSetup.tableData, aggDotPlot.recipeId, settings);

    const canvasRange = {
        x: getArrayValueRange(visualSetup.channelEncodings.x, true),
        y: getArrayValueRange(visualSetup.channelEncodings.y, true),
    }

    const sizeGammaFactor = getGammaFactor(visualSetup.configSettings.sizeGammaFactor);

    const colorRampId = visualSetup.configSettings.colorRamp;
    let colorRamp = getColorRamp(colorRampId).colors;
    if (visualSetup.configSettings.colorRampSwapped) colorRamp = colorRamp.toReversed();

    const colorValueRange = { min: data.quantMin, max: data.quantMax };

    const restrictedColorValueRange = restrictRange(colorValueRange, visualSetup.configSettings.colorRangeMin, visualSetup.configSettings.colorRangeMax)

    const customData: TpLayerDataSpecificsDotPlot = {
        data,
        sizeGammaFactor,
        radiusFactor: parseFloat(visualSetup.configSettings.radiusFactor),
        colorValueRange,
        restrictedColorValueRange,
        colorRamp,
        colorGammaFactor: getGammaFactor(visualSetup.configSettings.colorGammaFactor),
    };

    const layerData: TpCanvas2DRenderLayer = {
        layerTypeId: LAYERTYPE_DOTPLOT,
        visualSetup,
        canvasRange,
        gpuLayers: [],
        legendsHor: [],
        chartTitle: `${visualSetup.tableData.name}: ${visualSetup.channelEncodings.x.name} - ${visualSetup.channelEncodings.y.name}`,
        xAxisName: visualSetup.channelEncodings.x.name,
        yAxisName: visualSetup.channelEncodings.y.name,
        createLassoFilter,
        customData,
        renderCentral,
    };

    const colorLegend: TpCanvas2DLegendHor = {
        id: LEGEND_TYPE_COLOR,
        height: 60,
        layerData,
        elemInfo,
        render: renderColorLegendDotPlot,
    };

    layerData.legendsHor.push(colorLegend);

    return layerData
}


function renderColorLegendDotPlot(legend: TpCanvas2DLegendHor, canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D | TpViewportVolume, displayRange: TpRange2D, elemInfo: TpElemInfo) {
    const customData = legend.layerData.customData as TpLayerDataSpecificsDotPlot;
    renderColorRangeLegendBase(legend, canvasCtx, centralViewport, displayRange,
        customData.colorValueRange, customData.restrictedColorValueRange, customData.colorRamp, "Count");
}

function renderCentral(canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D, layerData: TpCanvas2DRenderLayer) {
    const customData = layerData.customData as TpLayerDataSpecificsDotPlot;
    const { xLogic2Elem, yLogic2Elem, sizeDisp2Elem } = getViewport2DCoordConvertors(centralViewport);
    const pixelRatio = centralViewport.pixelRatio;

    canvasCtx.lineWidth = 1 * pixelRatio;
    const colorUnSelected = changeOpacity(theAppColorSchema.colorFg, 0.3);

    const dotPlotData = customData.data;

    const radiusFactor = customData.radiusFactor;

    const elemStepDistX = Math.abs(xLogic2Elem(dotPlotData.binDefX.step) - xLogic2Elem(0));
    const elemStepDistY = Math.abs(yLogic2Elem(dotPlotData.binDefY.step) - yLogic2Elem(0));
    const maxRadius = Math.min(elemStepDistX, elemStepDistY) / 2 * radiusFactor;

    const { sizeGammaFactor, restrictedColorValueRange, colorRamp, colorGammaFactor } = customData;

    const colorCount = colorRamp.length;

    if (dotPlotData.contourData) {
        canvasCtx.lineWidth = 1 * pixelRatio;
        canvasCtx.strokeStyle = color2String(getColorSchemaGray(0.85));
        for (const level of dotPlotData.contourData.levels) {
            for (const line of level.lines) {
                let firstPt = true;
                canvasCtx.beginPath();
                for (const pt of line) {
                    const x = xLogic2Elem(dotPlotData.binDefX.minVal + (pt.x + 0.0) * dotPlotData.binDefX.step);
                    const y = yLogic2Elem(dotPlotData.binDefY.minVal + (pt.y + 0.0) * dotPlotData.binDefY.step);
                    if (firstPt) canvasCtx.moveTo(x, y);
                    else canvasCtx.lineTo(x, y);
                    firstPt = false;
                }
                canvasCtx.stroke();
            }
        }
    }

    canvasCtx.lineWidth = 1 * pixelRatio;
    canvasCtx.strokeStyle = color2String(getColorSchemaGray(0.0));

    for (let ix = 0; ix < dotPlotData.binDefX.count; ix++)
        for (let iy = 0; iy < dotPlotData.binDefY.count; iy++) {
            const cellLogicCentX = dotPlotData.binDefX.minVal + (ix + 0.5) * dotPlotData.binDefX.step;
            const cellLogicCentY = dotPlotData.binDefY.minVal + (iy + 0.5) * dotPlotData.binDefY.step;
            const cellElemCentX = xLogic2Elem(cellLogicCentX);
            const cellElemCentY = yLogic2Elem(cellLogicCentY);

            if (dotPlotData.cellCounts[ix][iy] != dotPlotData.cellCountsSelected[ix][iy]) {
                const radiusAll = (Math.sqrt(dotPlotData.cellCounts[ix][iy]) / Math.sqrt(dotPlotData.maxCellCount)) ** sizeGammaFactor * maxRadius;
                canvasCtx.fillStyle = color2String(colorUnSelected);
                canvasCtx.beginPath();
                canvasCtx.arc(cellElemCentX, cellElemCentY, radiusAll, 0, 2 * Math.PI);
                canvasCtx.fill();
            }

            const theColorValue = dotPlotData.cellQuant[ix][iy];

            if (!isNaN(theColorValue)) {

                const theSizeValue = dotPlotData.cellCountsSelected[ix][iy];
                const radius = (Math.sqrt(theSizeValue) / Math.sqrt(dotPlotData.maxCellCount)) ** sizeGammaFactor * maxRadius;

                let fr = (theColorValue - restrictedColorValueRange.min) / (restrictedColorValueRange.max - restrictedColorValueRange.min);
                fr = Math.max(0, Math.min(1, fr));
                canvasCtx.fillStyle = color2String(colorRamp[Math.round(fr ** colorGammaFactor * (colorCount - 1))])

                canvasCtx.beginPath();
                canvasCtx.arc(cellElemCentX, cellElemCentY, radius, 0, 2 * Math.PI);
                canvasCtx.fill();
                canvasCtx.stroke();
            }
        }

}


function createLassoFilter(lassoPoints: TpPoint2D[], visualSetup: TpVisualSetup): TpFilterInstance {
    const filter = filterTypeLasso2D.createFilterInstance({
        polygon: lassoPoints,
        bindingX: visualSetup.channelEncodings.x.id,
        bindingY: visualSetup.channelEncodings.y.id,
    });
    return filter;
}