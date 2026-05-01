

import { TpFilterInstance } from "../../../../../../util/filters/interfaces";
import { getGammaFactor, perfTimerStart, perfTimerStop } from "../../../../../../util/misc";
import { TpPoint2D } from "../../../../../../util/geometry/point2D";
import { TpGPURLayerDataColoredPoints2D } from "../../../../../../util/render-gpu/layer-types/colored-points-2D/interfaces";
import { GPUR_LAYER_TYPES } from "../../../../../../util/render-gpu/layer-types/interfaces";
import { getArrayValueRange, getViewport2DCoordConvertors, TpViewport2D } from "../../../../../../util/geometry/viewport2D";
import { TpVisualSetup } from "../../../helpers/helpers";
import { TpElemInfo, TpResourceRenderContext } from "../../../interface";
import { TpCanvas2DRenderLayer } from "../../interface";
import { LAYERTYPE_STRIPPLOT, TpLayerDataSpecificsStripPlot } from "./layerStripPlot.Interface";
import { getColorPaletteInfo, getColorValueRangeInfo, LEGEND_TYPE_COLOR, renderColorCategoriesLegend, renderColorRangeLegend } from "../../../legends/colorLegend";
import { getSliceLegendMouseHoverInfo, LEGEND_TYPE_SLICE, renderSliceLegend, sliceLegendHandleMouseDown, sliceLegendHandleMouseDrag, sliceLegendHandleMouseUp } from "../../../legends/sliceLegend";
import { getSliceData } from "../../../helpers/slicingHelpers";
import { filterTypeLasso2D } from "../../../../../../util/filters/filter-types/filterTypeLasso2D";
import { validateColumnHasData } from "../../../../../../data/tables/table";
import { getColorSchemaGray } from "../../../../../../util/color/appColorSchema";
import { color2String } from "../../../../../../util/color/color";
import { isCategoricalDataType, isNumericalDataType } from "../../../../../../data/tables/interface";
import { TpCanvas2DTransientData } from "../../rendering";


export const stripRandomOffsetCount = 10000;
export const stripRandomOffsets: number[] = [];
for (let i = 0; i < stripRandomOffsetCount; i++) stripRandomOffsets[i] = Math.random() * 0.8 - 0.4;


export function createStripPlotLayerData(resourceRenderCtx: TpResourceRenderContext, layerId: string, visualSetup: TpVisualSetup, elemInfo: TpElemInfo): TpCanvas2DRenderLayer {

    validateColumnHasData(visualSetup.channelEncodings.categories);
    validateColumnHasData(visualSetup.channelEncodings.values);
    if (visualSetup.channelEncodings.color)
        validateColumnHasData(visualSetup.channelEncodings.color);
    const catValues = visualSetup.channelEncodings.categories.values;
    const yValues = visualSetup.channelEncodings.values.values;
    const colorValues = visualSetup.channelEncodings.color?.values;
    const selectionMask = visualSetup.tableData.currentfilterMask;
    const rowKeyIndexes = visualSetup.tableData.rowKeyIndexes;

    const hasNumericalColors = !!colorValues && isNumericalDataType(visualSetup.channelEncodings.color.dataType);
    const hasCategoricalColors = !!colorValues && isCategoricalDataType(visualSetup.channelEncodings.color.dataType);

    const pointCount = catValues.length;
    const sizeCorrFactor = 10000 / (10000 + pointCount ** 0.65);
    const pointSizeFactor = ((1 + visualSetup.configSettings.pointSizeFactor) / 11) ** 1.3 * 15 * sizeCorrFactor;

    // const pf = perfTimerStart();
    const xValues = new Float32Array(pointCount);
    for (let i = 0; i < pointCount; i++)
        xValues[i] = catValues[i] + stripRandomOffsets[rowKeyIndexes[i] % stripRandomOffsetCount];
    // perfTimerStop(pf, "random");

    const renderPoints: TpGPURLayerDataColoredPoints2D = {
        layerId: `${layerId}_sel`,
        layerType: GPUR_LAYER_TYPES.COLORED_POINTS_2D,
        posX: xValues,
        posY: yValues,
        selectionMask,
        pointSizeFactor,
        opacity: visualSetup.configSettings.opacity,
        renderType: visualSetup.configSettings.renderType,
    };

    if (hasNumericalColors) {
        const { restrictedColorValueRange, colorRamp } = getColorValueRangeInfo(visualSetup);
        renderPoints.colorNumerical = {
            values: colorValues,
            minVal: restrictedColorValueRange!.min,
            maxVal: restrictedColorValueRange!.max,
            gammaFactor: getGammaFactor(visualSetup.configSettings.colorGammaFactor),
            colorRamp,
        }
    }

    if (hasCategoricalColors) {
        const { colorPalette } = getColorPaletteInfo(visualSetup);
        renderPoints.colorCategorical = {
            values: colorValues,
            colorPalette,
        }
    }

    const sliceData = getSliceData(resourceRenderCtx, visualSetup, elemInfo);
    const hasSlice = !!sliceData;
    if (hasSlice) renderPoints.slice = sliceData

    const xRange = getArrayValueRange(visualSetup.channelEncodings.categories, true);
    const canvasRange = {
        x: { min: xRange.min - 0.5, max: xRange.max + 0.5 },
        y: getArrayValueRange(visualSetup.channelEncodings.values, true),
    }

    const layerData: TpCanvas2DRenderLayer = {
        layerTypeId: LAYERTYPE_STRIPPLOT,
        visualSetup,
        canvasRange,
        gpuLayers: [renderPoints],
        legendsHor: [],
        chartTitle: `${visualSetup.tableData.name}: ${visualSetup.channelEncodings.categories.name} - ${visualSetup.channelEncodings.values.name}`,
        xAxisName: visualSetup.channelEncodings.categories.name,
        yAxisName: visualSetup.channelEncodings.values.name,
        xAxisCategories: {categories: structuredClone(visualSetup.channelEncodings.categories.categoricalStatesList!)},
        createLassoFilter,
        customData: {
            sliceValueRange: sliceData?.sliceValueRange,
        },
        renderCentralOverlay,
    };

    if (hasNumericalColors) {
        layerData.legendsHor.push({
            id: LEGEND_TYPE_COLOR,
            height: 60,
            layerData,
            elemInfo,
            render: renderColorRangeLegend,
        })
    }

    if (hasCategoricalColors) {
        layerData.legendsHor.push({
            id: LEGEND_TYPE_COLOR,
            height: 60,
            layerData,
            elemInfo,
            render: renderColorCategoriesLegend,
        })
    }


    if (hasSlice) {
        layerData.legendsHor.push({
            id: LEGEND_TYPE_SLICE,
            height: 55,
            layerData,
            elemInfo,
            render: renderSliceLegend,
            mouseHoverInfo: getSliceLegendMouseHoverInfo,
            handleMouseDown: sliceLegendHandleMouseDown,
            handleMouseDrag: sliceLegendHandleMouseDrag,
            handleMouseUp: sliceLegendHandleMouseUp,
        })
    }

    return layerData;
}


function createLassoFilter(lassoPoints: TpPoint2D[], visualSetup: TpVisualSetup): TpFilterInstance {
    const filter = filterTypeLasso2D.createFilterInstance({
        polygon: lassoPoints,
        bindingX: visualSetup.channelEncodings.x.id,
        bindingY: visualSetup.channelEncodings.y.id,
    });
    return filter;
}


function renderCentralOverlay(canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D, layerData: TpCanvas2DRenderLayer, trData: TpCanvas2DTransientData) {
    const customData = layerData.customData as TpLayerDataSpecificsStripPlot;
    const { xLogic2Elem, yLogic2Elem, sizeDisp2Elem } = getViewport2DCoordConvertors(centralViewport);
    const pixelRatio = centralViewport.pixelRatio;

    canvasCtx.lineWidth = 1 * pixelRatio;
    const contourData = customData.contourData;

    if (contourData) {
        canvasCtx.lineWidth = 1 * pixelRatio;
        canvasCtx.strokeStyle = color2String(getColorSchemaGray(0.85));
        for (const level of contourData.levels) {
            for (const line of level.lines) {
                let firstPt = true;
                canvasCtx.beginPath();
                for (const pt of line) {
                    const x = xLogic2Elem(contourData.gridMapping.x.offset + (pt.x + 0.0) * contourData.gridMapping.x.step);
                    const y = yLogic2Elem(contourData.gridMapping.y.offset + (pt.y + 0.0) * contourData.gridMapping.y.step);
                    if (firstPt) canvasCtx.moveTo(x, y);
                    else canvasCtx.lineTo(x, y);
                    firstPt = false;
                }
                canvasCtx.stroke();
            }
        }
    }
}