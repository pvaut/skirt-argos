

import { TpFilterInstance } from "../../../../../../util/filters/interfaces";
import { getGammaFactor } from "../../../../../../util/misc";
import { TpPoint2D } from "../../../../../../util/geometry/point2D";
import { TpGPURLayerDataColoredPoints2D } from "../../../../../../util/render-gpu/layer-types/colored-points-2D/interfaces";
import { GPUR_LAYER_TYPES } from "../../../../../../util/render-gpu/layer-types/interfaces";
import { getArrayValueRange, getViewport2DCoordConvertors, TpViewport2D } from "../../../../../../util/geometry/viewport2D";
import { TpVisualSetup } from "../../../helpers/helpers";
import { TpElemInfo, TpResourceRenderContext } from "../../../interface";
import { TpCanvas2DRenderLayer } from "../../interface";
import { LAYERTYPE_SCATTER2D, TpLayerDataSpecificsScatter2D } from "./layerScatter2D.Interface";
import { getColorPaletteInfo, getColorValueRangeInfo, LEGEND_TYPE_COLOR, renderColorCategoriesLegend, renderColorRangeLegend } from "../../../legends/colorLegend";
import { getSliceLegendMouseHoverInfo, LEGEND_TYPE_SLICE, renderSliceLegend, sliceLegendHandleMouseDown, sliceLegendHandleMouseDrag, sliceLegendHandleMouseUp } from "../../../legends/sliceLegend";
import { getSliceData } from "../../../helpers/slicingHelpers";
import { filterTypeLasso2D } from "../../../../../../util/filters/filter-types/filterTypeLasso2D";
import { validateColumnHasData } from "../../../../../../data/tables/table";
import { getTableAggregation } from "../../../../../../data/tables/table-aggregations/cachedTableAggregations";
import { aggDotPlot, TpDotPlotData } from "../../../../../../data/tables/table-aggregations/recipes/dotPlot";
import { TpContourData } from "../../../../../../util/contour/contourData";
import { getColorSchemaGray } from "../../../../../../util/color/appColorSchema";
import { color2String } from "../../../../../../util/color/color";
import { isCategoricalDataType, isNumericalDataType } from "../../../../../../data/tables/interface";
import { getAxisName } from "../../helpers";
import { TpGPURLayerDataColoredPointsBitmap } from "../../../../../../util/render-gpu/layer-types/colored-points-bitmap/interfaces";
import { TpCanvas2DTransientData } from "../../rendering";




export function createScatter2DLayerData(resourceRenderCtx: TpResourceRenderContext, layerId: string, visualSetup: TpVisualSetup, elemInfo: TpElemInfo): TpCanvas2DRenderLayer {

    validateColumnHasData(visualSetup.channelEncodings.x);
    validateColumnHasData(visualSetup.channelEncodings.y);
    if (visualSetup.channelEncodings.color)
        validateColumnHasData(visualSetup.channelEncodings.color);
    const xValues = visualSetup.channelEncodings.x.values;
    const yValues = visualSetup.channelEncodings.y.values;
    const colorValues = visualSetup.channelEncodings.color?.values;
    const selectionMask = visualSetup.tableData.currentfilterMask;

    const pixelSizeX = visualSetup.channelEncodings.x.config.pixelSize;
    const pixelSizeY = visualSetup.channelEncodings.y.config.pixelSize;
    const isBitmap = pixelSizeX && pixelSizeY;

    const hasNumericalColors = !!colorValues && isNumericalDataType(visualSetup.channelEncodings.color.dataType);
    const hasCategoricalColors = !!colorValues && isCategoricalDataType(visualSetup.channelEncodings.color.dataType);

    const pointCount = xValues.length;
    const sizeCorrFactor = 10000 / (10000 + pointCount ** 0.65);
    const pointSizeFactor = ((1 + visualSetup.configSettings.pointSizeFactor) / 11) ** 1.3 * 15 * sizeCorrFactor;

    let contourData: TpContourData | undefined = undefined;
    if (visualSetup.configSettings.contourShow) {
        const contourResol = parseFloat(visualSetup.configSettings.contourResolution);
        contourData = getTableAggregation<TpDotPlotData>(visualSetup.tableData, aggDotPlot.recipeId, {
            xChannelId: visualSetup.channelEncodings.x.id,
            yChannelId: visualSetup.channelEncodings.y.id,
            quantChannelId: null,
            quantAggrType: null,
            resolutionX: contourResol,
            resolutionY: contourResol,
            contourSettings: {
                desiredLevelCount: parseFloat(visualSetup.configSettings.contourLevelCount),
                smoothKernelWidth: parseFloat(visualSetup.configSettings.contourSmoothingKernelWidth),
            }
        }).contourData!;
    }

    let renderPoints: TpGPURLayerDataColoredPoints2D | TpGPURLayerDataColoredPointsBitmap;

    if (!isBitmap) {
        renderPoints = {
            layerId: `${layerId}_sel`,
            layerType: GPUR_LAYER_TYPES.COLORED_POINTS_2D,
            posX: xValues,
            posY: yValues,
            selectionMask,
            pointSizeFactor,
            opacity: visualSetup.configSettings.opacity,
            renderType: visualSetup.configSettings.renderType,
        };
    } else {
        renderPoints = {
            layerId: `${layerId}_sel`,
            layerType: GPUR_LAYER_TYPES.COLORED_POINTS_BITMAP,
            posX: xValues,
            posY: yValues,
            selectionMask,
            pixelSizeX,
            pixelSizeY,
        };
    }

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

    const canvasRange = {
        x: getArrayValueRange(visualSetup.channelEncodings.x, true),
        y: getArrayValueRange(visualSetup.channelEncodings.y, true),
    }

    let chartTitle = `${visualSetup.tableData.name}: ${visualSetup.channelEncodings.x.name} - ${visualSetup.channelEncodings.y.name}`;
    if (isBitmap && visualSetup.channelEncodings.color) {
        chartTitle = visualSetup.channelEncodings.color.name;
    }

    const layerData: TpCanvas2DRenderLayer = {
        layerTypeId: LAYERTYPE_SCATTER2D,
        visualSetup,
        canvasRange,
        gpuLayers: [renderPoints],
        legendsHor: [],
        chartTitle,
        xAxisName: getAxisName(visualSetup.channelEncodings.x),
        yAxisName: getAxisName(visualSetup.channelEncodings.y),
        createLassoFilter,
        customData: {
            sliceValueRange: sliceData?.sliceValueRange,
            contourData,
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
    const customData = layerData.customData as TpLayerDataSpecificsScatter2D;
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