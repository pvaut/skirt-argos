import { getTableAggregation } from "../../../../../../data/tables/table-aggregations/cachedTableAggregations";
import { aggHistogram, TpHistogramData, TpHistogramRecipe } from "../../../../../../data/tables/table-aggregations/recipes/histogram";
import { changeOpacity, color2String, getColor } from "../../../../../../util/color/color";
import { filterTypeRange } from "../../../../../../util/filters/filter-types/filterTypeRange";
import { TpFilterInstance } from "../../../../../../util/filters/interfaces";
import { getViewport2DCoordConvertors, TpRange, TpViewport2D } from "../../../../../../util/geometry/viewport2D";
import { TpVisualSetup } from "../../../helpers/helpers";
import { TpElemInfo, TpResourceRenderContext } from "../../../interface";
import { getAxisName } from "../../helpers";
import { TpCanvas2DRenderLayer } from "../../interface";
import { LAYERTYPE_HISTOGRAM, TpLayerDataSpecificsHistogram } from "./layerHistogram.Definition";


export function createHistogramLayerData(resourceRenderCtx: TpResourceRenderContext, layerId: string, visualSetup: TpVisualSetup, elemInfo: TpElemInfo): TpCanvas2DRenderLayer {

    const settings: TpHistogramRecipe = {
        valuesChannelId: visualSetup.channelEncodings.values.id,
        resolutionNudgeFactor: visualSetup.configSettings.resolutionNudgeFactor,
        yScaleType: visualSetup.configSettings.yScaleType,
    }
    const histogram = getTableAggregation<TpHistogramData>(visualSetup.tableData, aggHistogram.recipeId, settings);

    const canvasRange = {
        x: { min: histogram.bucketMin, max: histogram.bucketMin + histogram.bucketCount * histogram.bucketSize },
        y: { min: 0, max: histogram.maxBucketValue },
    }


    const customData: TpLayerDataSpecificsHistogram = {
        bucketMin: histogram.bucketMin,
        bucketSize: histogram.bucketSize,
        bucketValuesSel: histogram.bucketValuesSel,
        bucketValuesUnsel: histogram.bucketValuesUnsel,
        yLabel: histogram.yLabel,
    };

    return {
        layerTypeId: LAYERTYPE_HISTOGRAM,
        visualSetup,
        canvasRange,
        gpuLayers: [],
        legendsHor: [],
        chartTitle: `${visualSetup.tableData.name}: ${visualSetup.channelEncodings.values.name}`,
        xAxisName: getAxisName(visualSetup.channelEncodings.values),
        yAxisName: customData.yLabel,
        customData,
        renderCentral,
        createHorizontalRangeFilter,
    };
}


function renderCentral(canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D, layerData: TpCanvas2DRenderLayer) {
    const customData = layerData.customData as TpLayerDataSpecificsHistogram;
    const { bucketMin, bucketSize, bucketValuesSel: bucketCountsSel, bucketValuesUnsel: bucketCountsUnsel } = customData;
    const { xLogic2Elem, yLogic2Elem } = getViewport2DCoordConvertors(centralViewport);
    const bucketCount = bucketCountsSel.length;
    const pixelRatio = centralViewport.pixelRatio;

    canvasCtx.lineWidth = 1 * pixelRatio;

    const color = getColor(25, 140, 240);

    canvasCtx.strokeStyle = color2String(getColor(100, 100, 100));
    canvasCtx.beginPath();
    canvasCtx.moveTo(xLogic2Elem(bucketMin), yLogic2Elem(0));
    for (let bucketIdx = 0; bucketIdx < bucketCount; bucketIdx++) {
        const x1 = xLogic2Elem(bucketMin + bucketIdx * bucketSize);
        const x2 = xLogic2Elem(bucketMin + (bucketIdx + 1) * bucketSize);
        const y = yLogic2Elem(bucketCountsUnsel[bucketIdx]);
        canvasCtx.lineTo(x1, y);
        canvasCtx.lineTo(x2, y);
    }
    canvasCtx.lineTo(xLogic2Elem(bucketMin + bucketCount * bucketSize), yLogic2Elem(0));
    canvasCtx.stroke();
    canvasCtx.closePath();
    canvasCtx.fillStyle = color2String(getColor(128, 128, 128, 0.2));
    canvasCtx.fill();

    const gradient = canvasCtx.createLinearGradient(0, centralViewport.displayRange.y.max, 0, centralViewport.displayRange.y.min);
    gradient.addColorStop(0, color2String(changeOpacity(color, 0.25)));
    gradient.addColorStop(1, color2String(changeOpacity(color, 0.75)));
    canvasCtx.fillStyle = gradient;

    canvasCtx.beginPath();
    canvasCtx.moveTo(xLogic2Elem(bucketMin), yLogic2Elem(0));
    for (let bucketIdx = 0; bucketIdx < bucketCount; bucketIdx++) {
        const x1 = xLogic2Elem(bucketMin + bucketIdx * bucketSize);
        const x2 = xLogic2Elem(bucketMin + (bucketIdx + 1) * bucketSize);
        const y = yLogic2Elem(bucketCountsSel[bucketIdx]);
        canvasCtx.lineTo(x1, y);
        canvasCtx.lineTo(x2, y);
    }
    canvasCtx.lineTo(xLogic2Elem(bucketMin + bucketCount * bucketSize), yLogic2Elem(0));
    canvasCtx.closePath();
    canvasCtx.fill();

    canvasCtx.strokeStyle = color2String(color);
    canvasCtx.beginPath();
    canvasCtx.moveTo(xLogic2Elem(bucketMin), yLogic2Elem(0));
    for (let bucketIdx = 0; bucketIdx < bucketCount; bucketIdx++) {
        const x1 = xLogic2Elem(bucketMin + bucketIdx * bucketSize);
        const x2 = xLogic2Elem(bucketMin + (bucketIdx + 1) * bucketSize);
        const y = yLogic2Elem(bucketCountsSel[bucketIdx]);
        canvasCtx.lineTo(x1, y);
        canvasCtx.lineTo(x2, y);
    }
    canvasCtx.lineTo(xLogic2Elem(bucketMin + bucketCount * bucketSize), yLogic2Elem(0));
    canvasCtx.stroke();
}



function createHorizontalRangeFilter(horizontalRange: TpRange, visualSetup: TpVisualSetup): TpFilterInstance {
    const filter = filterTypeRange.createFilterInstance({
        range: horizontalRange,
        binding: visualSetup.channelEncodings.values.id,
    });
    return filter;
}
