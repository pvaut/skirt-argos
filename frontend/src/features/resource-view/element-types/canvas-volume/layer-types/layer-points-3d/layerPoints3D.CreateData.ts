
import { GPUR_LAYER_TYPES } from "../../../../../../util/render-gpu/layer-types/interfaces";
import { checkIsColumnDataType, TpVisualSetup } from "../../../helpers/helpers";
import { TpElemInfo, TpResourceRenderContext } from "../../../interface";
import { LAYERTYPE_VOLUME_POINTS, TpCanvasVolumeRenderLayer } from "../../interface";
import { getChartVolumeBasis } from "../../dashboardVolumeBasis";
import { getSliceData } from "../../../helpers/slicingHelpers";
import { getSliceLegendMouseHoverInfo, LEGEND_TYPE_SLICE, renderSliceLegend, sliceLegendHandleMouseDown, sliceLegendHandleMouseDrag, sliceLegendHandleMouseUp } from "../../../legends/sliceLegend";
import { TpGPURLayerDataObjectsVolume } from "../../../../../../util/render-gpu/layer-types/objects-volume/interfaces";
import { create3DWireFrameBox } from "../../../../../../util/render-gpu/layer-types/objects-volume/object3DCreators";
import { createLassoFilterVolume } from "../layer-points-velocity/layerPointsVelocity.CreateData";
import { TpGPURLayerDataColoredPointsVolume } from "../../../../../../util/render-gpu/layer-types/colored-points-volume/interfaces";
import { getGammaFactor } from "../../../../../../util/misc";
import { getColorPaletteInfo, getColorValueRangeInfo, LEGEND_TYPE_COLOR, renderColorCategoriesLegend, renderColorRangeLegend } from "../../../legends/colorLegend";
import { DT_VECTOR3D, isCategoricalDataType, isNumericalDataType } from "../../../../../../data/tables/interface";
import { validateColumnHasData } from "../../../../../../data/tables/table";
import { LEGEND_TYPE_VOL_SIZE, renderVolSizeLegend } from "../../../legends/volSizeLegend";
import { getArrayValueRange } from "../../../../../../util/geometry/viewport2D";




export function createVolumePoints3DLayerData(resourceRenderCtx: TpResourceRenderContext, layerId: string, visualSetup: TpVisualSetup, elemInfo: TpElemInfo): TpCanvasVolumeRenderLayer {

    const channelPosition = visualSetup.channelEncodings.position;
    checkIsColumnDataType(channelPosition, DT_VECTOR3D);
    const channelPosX = channelPosition.subComponents[0];
    const channelPosY = channelPosition.subComponents[1];
    const channelPosZ = channelPosition.subComponents[2];
    validateColumnHasData(channelPosX);
    validateColumnHasData(channelPosY);
    validateColumnHasData(channelPosZ);
    const posXValues = channelPosX.values;
    const posYValues = channelPosY.values;
    const posZValues = channelPosZ.values;
    const colorValues = visualSetup.channelEncodings.color?.values;
    if (visualSetup.channelEncodings.color)
        validateColumnHasData(visualSetup.channelEncodings.color);
    if (visualSetup.channelEncodings.size)
        validateColumnHasData(visualSetup.channelEncodings.size);

    const hasNumericalColors = !!colorValues && isNumericalDataType(visualSetup.channelEncodings.color.dataType);
    const hasCategoricalColors = !!colorValues && isCategoricalDataType(visualSetup.channelEncodings.color.dataType);

    const hasSizes = !!visualSetup.channelEncodings.size;

    const selectionMask = visualSetup.tableData.currentfilterMask;

    const volumeBasis = getChartVolumeBasis(resourceRenderCtx, elemInfo, channelPosition);

    const pointCount = posXValues.length;
    const sizeCorrFactor = 10000 / (10000 + pointCount ** 0.7);

    let pointSizeFactor = ((1 + visualSetup.configSettings.pointSizeFactor) / 30) ** 1.3 * 30 * sizeCorrFactor;
    if (visualSetup.configSettings.pointSizeFactor == 0) pointSizeFactor = 0;

    const renderData: TpGPURLayerDataColoredPointsVolume = {
        layerId: `${layerId}_pts`,
        layerType: GPUR_LAYER_TYPES.COLORED_POINTS_VOLUME,
        posX: posXValues,
        posY: posYValues,
        posZ: posZValues,
        selectionMask,
        pointSizeFactor,
    }

    if (hasNumericalColors) {
        const { restrictedColorValueRange, colorRamp } = getColorValueRangeInfo(visualSetup);
        renderData.colorNumerical = {
            values: colorValues,
            minVal: restrictedColorValueRange!.min,
            maxVal: restrictedColorValueRange!.max,
            gammaFactor: getGammaFactor(visualSetup.configSettings.colorGammaFactor),
            colorRamp,
        }
    }

    if (hasCategoricalColors) {
        const { colorPalette } = getColorPaletteInfo(visualSetup);
        renderData.colorCategorical = {
            values: colorValues,
            colorPalette,
        }
    }

    if (hasSizes) {
        const sizeValueRange = getArrayValueRange(visualSetup.channelEncodings.size, true);
        renderData.sizes = {
            values: visualSetup.channelEncodings.size!.values,
            minVal: sizeValueRange.min,
            maxVal: sizeValueRange.max,
            gammaFactor: getGammaFactor(visualSetup.configSettings.sizeGammaFactor),
            scaleOpacityWithSize: visualSetup.configSettings.scaleOpacityWithSize
        }
    }

    const sliceData = getSliceData(resourceRenderCtx, visualSetup, elemInfo);
    const hasSlice = !!sliceData;
    if (hasSlice) renderData.slice = sliceData;

    const renderFramework: TpGPURLayerDataObjectsVolume = {
        layerId: `${layerId}_framework`,
        layerType: GPUR_LAYER_TYPES.OBJECTS_VOLUME,
        posits: [],
        colors: [],
    }

    create3DWireFrameBox(renderFramework, volumeBasis);

    const layerData: TpCanvasVolumeRenderLayer = {
        layerTypeId: LAYERTYPE_VOLUME_POINTS,
        visualSetup,
        gpuLayers: [renderData, renderFramework],
        legendsHor: [],
        chartTitle: `${visualSetup.tableData.name}: ${visualSetup.channelEncodings.position.name}`,
        volumeBasis,
        volumeUnitName: channelPosition.config.unitName,
        xAxisName: "",
        yAxisName: "",
        createLassoFilter: createLassoFilterVolume,
        customData: {
            sliceValueRange: sliceData?.sliceValueRange,
        },
    };

    layerData.legendsHor.push({
        id: LEGEND_TYPE_VOL_SIZE,
        height: 30,
        layerData,
        elemInfo,
        render: renderVolSizeLegend,
    })

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


