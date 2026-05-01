

import { configSettingChoice, configSettingColumnsDefinition, configSettingRange } from "../../../helpers/configSettingTypes";
import { CHANNEL_TYPES, TpDataWidgetLayerTypeDef, TpElemInfo, TpResourceRenderContext } from "../../../interface";
import { RENDER_TYPES } from "../../../../../../util/render-gpu/layer-types/colored-points-2D/interfaces";
import { TpCanvas2DRenderLayer, TpHoverPointInfo2D, TpLabelLogical } from "../../interface";
import { getViewport2DCoordConvertors, TpViewport2D } from "../../../../../../util/geometry/viewport2D";
import { distPoints2DFast, TpPoint2D } from "../../../../../../util/geometry/point2D";
import { getTableRowKeyIndex2Label } from "../../../../../../data/tables/table";
import { getOpenedRows } from "../../../../../../data/usage/useActiveResourcesStorage";
import { getSliceState } from "../../../legends/sliceLegend";
import { chartNumericalColorConfigSettings } from "../../../helpers/chartDefinitions";
import { getGenericWidgetsThingsTodoHelp, getZoomPanWdgetsThingsTodoHelp, TpVisualSetup } from "../../../helpers/helpers";
import { LAYERTYPE_PARALLEL_COORDS, TpLayerDataSpecificsParallelCoords } from "./layerParallelCoords.Interface";
import { createParallelCoordsLayerData, stripRandomOffsetCount, stripRandomOffsets } from "./layerParallelCoords.CreateData";



function getHoverDataPoint(elemInfo: TpElemInfo, layerData: TpCanvas2DRenderLayer, viewport: TpViewport2D, dispPos: TpPoint2D): TpHoverPointInfo2D | null {
    const visualSetup = layerData.visualSetup!;
    const tableData = visualSetup.tableData;
    const currentfilterMask = tableData.currentfilterMask;
    const rowCount = visualSetup.tableData.rowCount;
    const rowKeyIndexes = visualSetup.tableData.rowKeyIndexes;
    const { xLogic2Disp, yLogic2Disp, xLogic2Elem, yLogic2Elem, xDisp2Logic } = getViewport2DCoordConvertors(viewport);

    const { columns, totalRange, jitter } = (layerData.customData! as TpLayerDataSpecificsParallelCoords);

    const colIdx = Math.round(xDisp2Logic(dispPos.x));
    const colDistFrac = xDisp2Logic(dispPos.x) - colIdx;
    if ((colIdx < 0) || (colIdx >= columns.length) || (Math.abs(colDistFrac) >= jitter)) return null;

    let maxDist = 10;
    let bestIdx = null;

    const colValues = columns[colIdx].values;
    for (let ptIdx = 0; ptIdx < rowCount; ptIdx++) {
        if (currentfilterMask[ptIdx]) {
            const px = colIdx + jitter * stripRandomOffsets[rowKeyIndexes[ptIdx] % stripRandomOffsetCount];
            const py = colValues[ptIdx];
            const dist = Math.abs(dispPos.x - xLogic2Disp(px)) + Math.abs(dispPos.y - yLogic2Disp(py));
            if (dist < maxDist) {
                maxDist = dist;
                bestIdx = ptIdx;
            }
        }
    }

    const rowLabelFunc = getTableRowKeyIndex2Label(tableData);

    if (bestIdx == null) return null;
    const rowKeyIndex = tableData.rowKeyIndexes[bestIdx];
    return {
        targetLayer: layerData,
        rowKeyIndex,
        label: rowLabelFunc(rowKeyIndex),
        elemPos: {
            x: xLogic2Elem(colIdx + jitter * stripRandomOffsets[rowKeyIndex % stripRandomOffsetCount]),
            y: yLogic2Elem(colValues[bestIdx])
        },
        customData: {
            colValues: columns.map(col => col.values[bestIdx]),
        },

    };
}


function getLabels(resourceRenderCtx: TpResourceRenderContext, canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D, layer: TpCanvas2DRenderLayer): TpLabelLogical[] {
    return [];
}




export const canvas2DLayerParallelCoordsDefinition: TpDataWidgetLayerTypeDef = {
    id: LAYERTYPE_PARALLEL_COORDS,
    name: 'Parallel Coordinates Plot',
    vizQuality: -1,

    canLassoDraw: false,

    sections: [
        { id: 'coordinates', name: 'Coordinates' },
        { id: 'colors', name: 'Colors' },
        { id: 'points', name: 'Points' },
        { id: 'lines', name: 'Lines' },
    ],

    channels: [
        {
            id: 'color',
            name: 'Color',
            sectionId: 'colors',
            required: false,
            dataType: CHANNEL_TYPES.COLOR,
        },
    ],

    configSettings: [
        {
            id: 'columns',
            name: 'Columns',
            sectionId: 'coordinates',
            settingType: configSettingColumnsDefinition(false),
        },

        ...chartNumericalColorConfigSettings(true),
        {
            id: 'renderType',
            name: 'Rendering',
            sectionId: 'points',
            settingType: configSettingChoice([
                { id: RENDER_TYPES.OPAQUE, name: "Opaque" },
                { id: RENDER_TYPES.TRANSLUCENT, name: "Translucent" },
                { id: RENDER_TYPES.LUMINOUS, name: "Luminous" },
            ]),
        },
        {
            id: 'pointSizeFactor',
            name: 'Point size factor',
            sectionId: 'points',
            settingType: configSettingRange(0.2, 10, 0.2, 4),
        },
        {
            id: 'opacity',
            name: 'Opacity',
            sectionId: 'points',
            settingType: configSettingRange(0, 1, 0.1, 0.4),
            visibleIf: `$renderType != '${RENDER_TYPES.OPAQUE}'`,
        },

        {
            id: 'renderTypeLines',
            name: 'Rendering',
            sectionId: 'lines',
            settingType: configSettingChoice([
                { id: RENDER_TYPES.OPAQUE, name: "Opaque" },
                { id: RENDER_TYPES.TRANSLUCENT, name: "Translucent" },
                { id: RENDER_TYPES.LUMINOUS, name: "Luminous" },
            ]),
        },
        {
            id: 'intensityLines',
            name: 'Intensity',
            sectionId: 'lines',
            settingType: configSettingRange(0, 1, 0.1, 0.6),
        },

    ],

    createLayerData: createParallelCoordsLayerData,
    getHoverDataPoint,
    getLabels,
    getThingsTodoHelp,
};


function getThingsTodoHelp(visualSetup: TpVisualSetup): any[] {
    return [
        ...getZoomPanWdgetsThingsTodoHelp(),
        ...getGenericWidgetsThingsTodoHelp(),
    ];
}
