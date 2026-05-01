
import { TpFilterInstance } from "../../../../../../util/filters/interfaces";
import { TpPoint2D } from "../../../../../../util/geometry/point2D";
import { TpVector } from "../../../../../../util/geometry/vector";
import { GPUR_LAYER_TYPES } from "../../../../../../util/render-gpu/layer-types/interfaces";
import { TpGPURLayerDataPointsVelocityVolume } from "../../../../../../util/render-gpu/layer-types/points-velocity-volume/interfaces";
import { getArrayAverage, getArrayStdDev } from "../../../../../../util/geometry/viewport2D";
import { checkIsColumnDataType, TpVisualSetup } from "../../../helpers/helpers";
import { TpElemInfo, TpResourceRenderContext } from "../../../interface";
import { LAYERTYPE_VOLUME_POINTS_VELOCITY, TpCanvasVolumeRenderLayer } from "../../interface";
import { getChartVolumeBasis } from "../../dashboardVolumeBasis";
import { getColorRamp } from "../../../../../../util/color/colorRamps";
import { getSliceData } from "../../../helpers/slicingHelpers";
import { getSliceLegendMouseHoverInfo, LEGEND_TYPE_SLICE, renderSliceLegend, sliceLegendHandleMouseDown, sliceLegendHandleMouseDrag, sliceLegendHandleMouseUp } from "../../../legends/sliceLegend";
import { TpGPURLayerDataLinesVelocityVolume } from "../../../../../../util/render-gpu/layer-types/lines-velocity-volume/interfaces";
import { LEGEND_TYPE_LOS_VELOC, renderLosVelocLegend } from "../../../legends/losVelocLegend";
import { TpGPURLayerDataObjectsVolume } from "../../../../../../util/render-gpu/layer-types/objects-volume/interfaces";
import { TpViewportVolume } from "../../../../../../util/geometry/viewportVolume";
import { create3DWireFrameBox } from "../../../../../../util/render-gpu/layer-types/objects-volume/object3DCreators";
import { filterTypeLasso3D } from "../../../../../../util/filters/filter-types/filterTypeLasso3D";
import { DT_VECTOR3D } from "../../../../../../data/tables/interface";
import { validateColumnHasData } from "../../../../../../data/tables/table";
import { LEGEND_TYPE_VOL_SIZE, renderVolSizeLegend } from "../../../legends/volSizeLegend";




export function createVolumePointsVelocitiesLayerData(resourceRenderCtx: TpResourceRenderContext, layerId: string, visualSetup: TpVisualSetup, elemInfo: TpElemInfo): TpCanvasVolumeRenderLayer {

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

    const channelVelocity = visualSetup.channelEncodings.velocity;
    const channelVelocX = channelVelocity.subComponents[0];
    const channelVelocY = channelVelocity.subComponents[1];
    const channelVelocZ = channelVelocity.subComponents[2];
    validateColumnHasData(channelVelocX);
    validateColumnHasData(channelVelocY);
    validateColumnHasData(channelVelocZ);
    const velocXValues = channelVelocX.values;
    const velocYValues = channelVelocY.values;
    const velocZValues = channelVelocZ.values;

    const selectionMask = visualSetup.tableData.currentfilterMask;

    const volumeBasis = getChartVolumeBasis(resourceRenderCtx, elemInfo, channelPosition);

    const velocCenter: TpVector = {
        x: getArrayAverage(channelVelocX),
        y: getArrayAverage(channelVelocY),
        z: getArrayAverage(channelVelocZ),
    }

    const velocRange = 3 * (getArrayStdDev(channelVelocX) + getArrayStdDev(channelVelocY) + getArrayStdDev(channelVelocZ)) / 3;
    const velocHalfRange = velocRange / 2;

    const pointCount = posXValues.length;
    const sizeCorrFactor = 10000 / (10000 + pointCount ** 0.7);

    let pointSizeFactor = ((1 + visualSetup.configSettings.pointSizeFactor) / 30) ** 1.3 * 30 * sizeCorrFactor;
    if (visualSetup.configSettings.pointSizeFactor == 0) pointSizeFactor = 0;

    const renderData: TpGPURLayerDataPointsVelocityVolume = {
        layerId: `${layerId}_pts`,
        layerType: GPUR_LAYER_TYPES.POINTS_VELOCITY_VOLUME,
        posX: posXValues,
        posY: posYValues,
        posZ: posZValues,
        velX: velocXValues,
        velY: velocYValues,
        velZ: velocZValues,
        selectionMask,
        pointSizeFactor,
        velocCalib: {
            velocCenter,
            velocHalfRange,
        },
        velocColor: {
            colorRamp: getColorRamp(visualSetup.configSettings.colorRamp).colors,
        }
    }

    const sliceData = getSliceData(resourceRenderCtx, visualSetup, elemInfo);
    const hasSlice = !!sliceData;
    if (hasSlice) renderData.slice = sliceData;

    let velocityVectorSize = visualSetup.configSettings.velocityVectorSize;
    velocityVectorSize = (velocityVectorSize / 10) ** 1.5;
    const velocLinesPosX = new Float32Array(2 * pointCount);
    const velocLinesPosY = new Float32Array(2 * pointCount);
    const velocLinesPosZ = new Float32Array(2 * pointCount);
    const posType = new Uint8Array(2 * pointCount);
    const velocLinesSelectionMask = new Uint8Array(2 * pointCount);
    const fc = -0.1 * velocityVectorSize * volumeBasis.halfRange / velocRange;
    for (let i = 0; i < pointCount; i++) {
        velocLinesPosX[2 * i] = posXValues[i];
        velocLinesPosY[2 * i] = posYValues[i];
        velocLinesPosZ[2 * i] = posZValues[i];
        posType[2 * i] = 0;
        velocLinesSelectionMask[2 * i] = selectionMask[i];
        velocLinesPosX[2 * i + 1] = posXValues[i] + fc * (velocXValues[i] - velocCenter.x);
        velocLinesPosY[2 * i + 1] = posYValues[i] + fc * (velocYValues[i] - velocCenter.y);
        velocLinesPosZ[2 * i + 1] = posZValues[i] + fc * (velocZValues[i] - velocCenter.z);
        posType[2 * i + 1] = 1;
        velocLinesSelectionMask[2 * i + 1] = selectionMask[i];
    }
    const renderVelocLines: TpGPURLayerDataLinesVelocityVolume = {
        layerId: `${layerId}_velocLines`,
        layerType: GPUR_LAYER_TYPES.LINES_VELOCITY_VOLUME,
        isActive: velocityVectorSize > 0,
        posX: velocLinesPosX,
        posY: velocLinesPosY,
        posZ: velocLinesPosZ,
        lineEdgeType: posType,
        selectionMask: velocLinesSelectionMask,
        opacity: visualSetup.configSettings.velocityVectorOpacity,
    }

    const renderFramework: TpGPURLayerDataObjectsVolume = {
        layerId: `${layerId}_framework`,
        layerType: GPUR_LAYER_TYPES.OBJECTS_VOLUME,
        posits: [],
        colors: [],
    }

    create3DWireFrameBox(renderFramework, volumeBasis);

    const layerData: TpCanvasVolumeRenderLayer = {
        layerTypeId: LAYERTYPE_VOLUME_POINTS_VELOCITY,
        visualSetup,
        gpuLayers: [renderData, renderFramework, renderVelocLines],
        legendsHor: [],
        chartTitle: `${visualSetup.tableData.name}: ${visualSetup.channelEncodings.position.name}`,
        volumeBasis,
        xAxisName: "",
        yAxisName: "",
        volumeUnitName: channelPosition.config.unitName,
        createLassoFilter: createLassoFilterVolume,
        customData: {
            sliceValueRange: sliceData?.sliceValueRange,
            velocHalfRange,
        },
    };

    layerData.legendsHor.push({
        id: LEGEND_TYPE_VOL_SIZE,
        height: 30,
        layerData,
        elemInfo,
        render: renderVolSizeLegend,
    })


    if (pointSizeFactor > 0) {
        layerData.legendsHor.push({
            id: LEGEND_TYPE_LOS_VELOC,
            height: 60,
            layerData,
            elemInfo,
            render: renderLosVelocLegend,
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


export function createLassoFilterVolume(lassoPoints: TpPoint2D[], visualSetup: TpVisualSetup, viewport: TpViewportVolume, isRestricting: boolean, isExcluding: boolean): TpFilterInstance {
    const filter = filterTypeLasso3D.createFilterInstance({
        polygon: lassoPoints,
        bindingPosition: visualSetup.channelEncodings.position.id,
        viewport,
        isRestricting,
        isExcluding,
    });
    return filter;
}
