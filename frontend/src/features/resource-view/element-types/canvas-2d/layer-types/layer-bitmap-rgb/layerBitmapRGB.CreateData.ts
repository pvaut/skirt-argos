

import { TpFilterInstance } from "../../../../../../util/filters/interfaces";
import { getGammaFactor } from "../../../../../../util/misc";
import { TpPoint2D } from "../../../../../../util/geometry/point2D";
import { TpGPURLayerDataColoredPoints2D } from "../../../../../../util/render-gpu/layer-types/colored-points-2D/interfaces";
import { GPUR_LAYER_TYPES } from "../../../../../../util/render-gpu/layer-types/interfaces";
import { getArrayAverage, getArrayValueRange, getViewport2DCoordConvertors, TpViewport2D } from "../../../../../../util/geometry/viewport2D";
import { TpVisualSetup } from "../../../helpers/helpers";
import { TpElemInfo, TpResourceRenderContext } from "../../../interface";
import { TpCanvas2DRenderLayer } from "../../interface";
import { filterTypeLasso2D } from "../../../../../../util/filters/filter-types/filterTypeLasso2D";
import { validateColumnHasData } from "../../../../../../data/tables/table";
import { getAxisName } from "../../helpers";
import { TpGPURLayerDataColoredPointsBitmap } from "../../../../../../util/render-gpu/layer-types/colored-points-bitmap/interfaces";
import { LAYERTYPE_BITMAPRGB, TpLayerDataSpecificsBitmapRGB } from "./layerBitmapRGB.Interface";
import { TpGPURLayerDataBitmapRGB } from "../../../../../../util/render-gpu/layer-types/bitmap-rgb/interfaces";
import { TpCanvas2DTransientData } from "../../rendering";
import { LEGEND_TYPE_RGB, renderRGBLegend } from "../../../legends/rgbLegend";


const convScaleFactor = (x: number): number => (x / 10) ** 2 * 6;

export function createBitmapRGBLayerData(resourceRenderCtx: TpResourceRenderContext, layerId: string, visualSetup: TpVisualSetup, elemInfo: TpElemInfo): TpCanvas2DRenderLayer {

    validateColumnHasData(visualSetup.channelEncodings.x);
    validateColumnHasData(visualSetup.channelEncodings.y);
    validateColumnHasData(visualSetup.channelEncodings.colorR);
    validateColumnHasData(visualSetup.channelEncodings.colorG);
    validateColumnHasData(visualSetup.channelEncodings.colorB);
    const xValues = visualSetup.channelEncodings.x.values;
    const yValues = visualSetup.channelEncodings.y.values;
    const colorRValues = visualSetup.channelEncodings.colorR.values;
    const colorGValues = visualSetup.channelEncodings.colorG.values;
    const colorBValues = visualSetup.channelEncodings.colorB.values;
    const selectionMask = visualSetup.tableData.currentfilterMask;

    const pixelSizeX = visualSetup.channelEncodings.x.config.pixelSize!;
    const pixelSizeY = visualSetup.channelEncodings.y.config.pixelSize!;

    let normR = getArrayAverage(visualSetup.channelEncodings.colorR);
    let normG = getArrayAverage(visualSetup.channelEncodings.colorG);
    let normB = getArrayAverage(visualSetup.channelEncodings.colorB);

    if (visualSetup.configSettings.normPerColor == 'common') {
        const normCommon = (normR + normG + normB) / 3;
        normR = normCommon;
        normG = normCommon;
        normB = normCommon;
    }

    normR /= convScaleFactor(visualSetup.configSettings.scalingFactorR);
    normG /= convScaleFactor(visualSetup.configSettings.scalingFactorG);
    normB /= convScaleFactor(visualSetup.configSettings.scalingFactorB);

    const normAv = (normR + normG + normB) / 3;

    const stretch = (visualSetup.configSettings.stretchFactor / 10) ** 3 * 20;
    const softening = (visualSetup.configSettings.softeningFactor / 10) ** 2 * 6;
    const colorSaturationBuffer = visualSetup.configSettings.colorSaturationBuffer;

    let background = Math.sign(visualSetup.configSettings.backgroundFactor) * Math.abs(visualSetup.configSettings.backgroundFactor / 10) ** 3 * 2;

    const renderPoints: TpGPURLayerDataBitmapRGB = {
        layerId: `${layerId}_sel`,
        layerType: GPUR_LAYER_TYPES.BITMAP_RGB,
        posX: xValues,
        posY: yValues,
        colorSourceR: colorRValues,
        colorSourceG: colorGValues,
        colorSourceB: colorBValues,
        selectionMask,
        pixelSizeX,
        pixelSizeY,
        settingsGlobal: {
            background,
            softening,
            stretch,
            colorSaturationBuffer,
        },
        settingsR: { norm: normR },
        settingsG: { norm: normG },
        settingsB: { norm: normB },
    };


    const canvasRange = {
        x: getArrayValueRange(visualSetup.channelEncodings.x, true),
        y: getArrayValueRange(visualSetup.channelEncodings.y, true),
    }

    const layerData: TpCanvas2DRenderLayer = {
        layerTypeId: LAYERTYPE_BITMAPRGB,
        visualSetup,
        canvasRange,
        gpuLayers: [renderPoints],
        legendsHor: [],
        chartTitle: `${visualSetup.channelEncodings.colorR.name} - ${visualSetup.channelEncodings.colorG.name} - ${visualSetup.channelEncodings.colorB.name}`,
        xAxisName: getAxisName(visualSetup.channelEncodings.x),
        yAxisName: getAxisName(visualSetup.channelEncodings.y),
        createLassoFilter,
        customData: {
        },
        renderCentralOverlay,
    };

    layerData.legendsHor.push({
        id: LEGEND_TYPE_RGB,
        height: 25,
        layerData,
        elemInfo,
        render: renderRGBLegend,
        customData: {
            nameR: `${visualSetup.channelEncodings.colorR.name} x${(normAv / normR).toFixed(2)}`,
            nameG: `${visualSetup.channelEncodings.colorG.name} x${(normAv / normG).toFixed(2)}`,
            nameB: `${visualSetup.channelEncodings.colorB.name} x${(normAv / normB).toFixed(2)}`,
        }
    })

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
    const customData = layerData.customData as TpLayerDataSpecificsBitmapRGB;
    const { xLogic2Elem, yLogic2Elem, sizeDisp2Elem } = getViewport2DCoordConvertors(centralViewport);
    const pixelRatio = centralViewport.pixelRatio;
}