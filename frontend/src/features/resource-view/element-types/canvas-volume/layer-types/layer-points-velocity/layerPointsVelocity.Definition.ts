

import { configSettingColorRamp, configSettingRange } from "../../../helpers/configSettingTypes";
import { CHANNEL_TYPES, TpDataWidgetLayerTypeDef, TpElemInfo, TpResourceRenderContext } from "../../../interface";
import { LAYERTYPE_VOLUME_POINTS_VELOCITY, TpCanvasVolumeRenderLayer, TpHoverPointInfoVolume } from "../../interface";
import { createVolumePointsVelocitiesLayerData } from "./layerPointsVelocity.CreateData";
import { TpLabelLogical } from "../../../canvas-2d/interface";
import { distPoints2DFast, TpPoint2D } from "../../../../../../util/geometry/point2D";
import { getViewportVolumeCoordConvertors, TpViewportVolume } from "../../../../../../util/geometry/viewportVolume";
import { TpLayerDataSpecificsPointsVelocityVolume } from "./layerPointsVelocity.Interface";
import { getSliceState } from "../../../legends/sliceLegend";
import { getTableRowKeyIndex2Label } from "../../../../../../data/tables/table";
import { getOpenedRows } from "../../../../../../data/usage/useActiveResourcesStorage";
import { getGenericWidgetsThingsTodoHelp, getZoomPanWdgetsThingsTodoHelp, TpVisualSetup } from "../../../helpers/helpers";



export function getHoverDataPoint3D(elemInfo: TpElemInfo, layerData: TpCanvasVolumeRenderLayer, viewport: TpViewportVolume, dispPos: TpPoint2D): TpHoverPointInfoVolume | null {

    const visualSetup = layerData.visualSetup!;
    const tableData = visualSetup.tableData;
    const currentfilterMask = tableData.currentfilterMask;
    const positionChannel = visualSetup.channelEncodings.position;
    const xValues = positionChannel.subComponents[0].values;
    const yValues = positionChannel.subComponents[1].values;
    const zValues = positionChannel.subComponents[2].values;
    const sliceValues = visualSetup.channelEncodings.slice?.values;
    const rowCount = visualSetup.tableData.rowCount;
    const { logic2Disp } = getViewportVolumeCoordConvertors(viewport);
    let maxDist = 10;
    let bestIdx = null;

    let sliceMin, sliceMax;
    if (sliceValues) {
        const sliceValueRange = (layerData.customData! as TpLayerDataSpecificsPointsVelocityVolume).sliceValueRange!;
        const sliceState = getSliceState(elemInfo);
        sliceMin = sliceValueRange.min + sliceState.minFrac * (sliceValueRange.max - sliceValueRange.min);
        sliceMax = sliceValueRange.min + sliceState.maxFrac * (sliceValueRange.max - sliceValueRange.min);
    }

    for (let rowNr = 0; rowNr < rowCount; rowNr++) {
        const point2D = logic2Disp({ x: xValues[rowNr], y: yValues[rowNr], z: zValues[rowNr] });
        if (Math.abs(dispPos.x - point2D.x) <= maxDist) { // a fast first triage, based on one coordinate calculation only
            if (currentfilterMask[rowNr]) { // we only look for currently selected points
                if ((!sliceValues) || ((sliceValues[rowNr] >= sliceMin!) && (sliceValues[rowNr] <= sliceMax!))) { // we only look for points in the current slice range, if active
                    const dst = distPoints2DFast(dispPos, point2D);
                    if (dst < maxDist) {
                        maxDist = dst;
                        bestIdx = rowNr;
                    }
                }
            }
        }
    }

    const rowLabelFunc = getTableRowKeyIndex2Label(tableData);

    if (bestIdx == null) return null;
    const rowKeyIndex = tableData.rowKeyIndexes[bestIdx];
    const point2D = logic2Disp({ x: xValues[bestIdx], y: yValues[bestIdx], z: zValues[bestIdx] });
    return {
        targetLayer: layerData,
        rowKeyIndex,
        label: rowLabelFunc(rowKeyIndex),
        elemPos: {
            x: point2D.x * viewport.pixelRatio,
            y: point2D.y * viewport.pixelRatio,
        }

    };
}


export function getLabels3D(resourceRenderCtx: TpResourceRenderContext, canvasCtx: CanvasRenderingContext2D, viewport: TpViewportVolume, layer: TpCanvasVolumeRenderLayer): TpLabelLogical[] {
    if (!layer.visualSetup) return [];
    const visualSetup = layer.visualSetup!;
    const tableData = visualSetup.tableData;
    const origData = tableData.origData!;
    const openedRows = getOpenedRows(resourceRenderCtx.resourceInfo);

    const rowLabelFunc = getTableRowKeyIndex2Label(tableData);
    const channelPosition = visualSetup.channelEncodings.position;
    const compIdX = channelPosition.subComponents[0].id;
    const compIdY = channelPosition.subComponents[1].id;
    const compIdZ = channelPosition.subComponents[2].id;

    const labels: TpLabelLogical[] = [];
    for (const openedRow of openedRows) {
        if (openedRow.tableUri == tableData.tableUri) {
            const logicX = origData.columnValues[compIdX][openedRow.rowKeyIndex];
            const logicY = origData.columnValues[compIdY][openedRow.rowKeyIndex];
            const logicZ = origData.columnValues[compIdZ][openedRow.rowKeyIndex];
            const labelText = rowLabelFunc(openedRow.rowKeyIndex);
            if (!isNaN(logicX) && !isNaN(logicY)) {
                labels.push({ logicX, logicY, logicZ, labelText })
            }
        }
    }
    return labels;
}


export const canvasVolumeLayerPointsVelocityDefinition: TpDataWidgetLayerTypeDef = {
    id: LAYERTYPE_VOLUME_POINTS_VELOCITY,
    name: 'Point Kinematics',
    vizQuality: 1,

    canLassoDraw: true,

    sections: [
        { id: 'coordinates', name: 'Coordinates' },
        { id: 'velocities', name: 'Velocities' },
        { id: 'slicing', name: 'Slicing' },
    ],

    channels: [
        {
            id: 'position',
            name: 'Position',
            sectionId: 'coordinates',
            required: true,
            dataType: CHANNEL_TYPES.VECTOR3D,
        },
        {
            id: 'velocity',
            name: 'Velocity',
            sectionId: 'velocities',
            required: true,
            dataType: CHANNEL_TYPES.VECTOR3D,
        },
        {    // allows tbe user to dynamically change a filtering of a numerical component; signature use case: for 3D coordinates, the Z coordinate when X and Y are plotted
            id: 'slice',
            name: 'Slice data',
            sectionId: 'slicing',
            required: false,
            dataType: CHANNEL_TYPES.NUMERICAL,
        },
    ],

    configSettings: [
        {
            id: 'pointSizeFactor',
            name: 'Point size factor',
            sectionId: 'coordinates',
            settingType: configSettingRange(0, 10, 0.2, 4),
        },

        {
            id: 'colorRamp',
            name: 'Line-of-sight velocity color ramp',
            sectionId: 'velocities',
            settingType: configSettingColorRamp(true),
        },

        {
            id: 'velocityVectorSize',
            name: 'Velocity trail size',
            sectionId: 'velocities',
            settingType: configSettingRange(0, 10, 0.2, 4),
        },

        {
            id: 'velocityVectorOpacity',
            name: 'Velocity trail opacity',
            sectionId: 'velocities',
            settingType: configSettingRange(0, 1, 0.05, 0.7),
        },
    ],

    createLayerData: createVolumePointsVelocitiesLayerData,
    getHoverDataPoint: getHoverDataPoint3D,
    getLabels: getLabels3D,
    getThingsTodoHelp,
};


function getThingsTodoHelp(visualSetup: TpVisualSetup): any[] {
    return [
        ...thingsTodoHelp3D,
        ...getZoomPanWdgetsThingsTodoHelp(),
        ...getGenericWidgetsThingsTodoHelp(),
    ];
}


export const thingsTodoHelp3D = [
    "Drag the orientation sphere in the top left corner to change the 3D POV",
    "Use the scroll wheel while hovering over the orientation sphere to zoom in and out",
    "Click & drag the mouse to perform a lasso selection",
    "Press and hold the Ctrl key while clicking & dragging the mouse to refine a lasso selection (result will be the intersection of both selections, useful when changing the 3D POV inbetween to confine the 3D selection)",
    "Click on a point to open it in the side view",
]