

import { configSettingBoolean, configSettingChoice, configSettingRange } from "../../../helpers/configSettingTypes";
import { CHANNEL_TYPES, TpDataWidgetLayerTypeDef, TpElemInfo, TpResourceRenderContext } from "../../../interface";
import { createScatter2DLayerData } from "./layerScatter2D.CreateData";
import { RENDER_TYPES } from "../../../../../../util/render-gpu/layer-types/colored-points-2D/interfaces";
import { TpCanvas2DRenderLayer, TpHoverPointInfo2D, TpLabelLogical } from "../../interface";
import { getViewport2DCoordConvertors, TpViewport2D } from "../../../../../../util/geometry/viewport2D";
import { distPoints2DFast, TpPoint2D } from "../../../../../../util/geometry/point2D";
import { getTableRowKeyIndex2Label } from "../../../../../../data/tables/table";
import { getOpenedRows } from "../../../../../../data/usage/useActiveResourcesStorage";
import { LAYERTYPE_SCATTER2D, TpLayerDataSpecificsScatter2D } from "./layerScatter2D.Interface";
import { getSliceState } from "../../../legends/sliceLegend";
import { chartNumericalColorConfigSettings } from "../../../helpers/chartDefinitions";
import { getGenericWidgetsThingsTodoHelp, getZoomPanWdgetsThingsTodoHelp, TpVisualSetup } from "../../../helpers/helpers";



export function getHoverDataPoint_ScatterPlot(elemInfo: TpElemInfo, layerData: TpCanvas2DRenderLayer, viewport: TpViewport2D, dispPos: TpPoint2D): TpHoverPointInfo2D | null {
    const visualSetup = layerData.visualSetup!;
    const tableData = visualSetup.tableData;
    const currentfilterMask = tableData.currentfilterMask;
    const xChannel = visualSetup.channelEncodings.x.values;
    const yChannel = visualSetup.channelEncodings.y.values;
    const sliceChannel = visualSetup.channelEncodings.slice?.values;
    const rowCount = visualSetup.tableData.rowCount;
    const { xLogic2Disp, yLogic2Disp, xLogic2Elem, yLogic2Elem } = getViewport2DCoordConvertors(viewport);
    let maxDist = 10;
    let bestIdx = null;

    let sliceMin, sliceMax;
    if (sliceChannel) {
        const sliceValueRange = (layerData.customData! as TpLayerDataSpecificsScatter2D).sliceValueRange!;
        const sliceState = getSliceState(elemInfo);
        sliceMin = sliceValueRange.min + sliceState.minFrac * (sliceValueRange.max - sliceValueRange.min);
        sliceMax = sliceValueRange.min + sliceState.maxFrac * (sliceValueRange.max - sliceValueRange.min);
    }
    //const pf = perfTimerStart();
    for (let rowNr = 0; rowNr < rowCount; rowNr++) {
        if (Math.abs(dispPos.x - xLogic2Disp(xChannel[rowNr])) <= maxDist) { // a fast first triage, based on one coordinate calculation only
            if (currentfilterMask[rowNr]) { // we only look for currently selected points
                if ((!sliceChannel) || ((sliceChannel[rowNr] >= sliceMin!) && (sliceChannel[rowNr] <= sliceMax!))) { // we only look for points in the current slice range, if active
                    const x = xLogic2Disp(xChannel[rowNr]);
                    const y = yLogic2Disp(yChannel[rowNr]);
                    const dst = distPoints2DFast(dispPos, { x, y });
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
    const rowKeyIndex= tableData.rowKeyIndexes[bestIdx];

    return {
        targetLayer: layerData,
        rowKeyIndex,
        label: rowLabelFunc(rowKeyIndex),
        elemPos: {
            x: xLogic2Elem(xChannel[bestIdx]),
            y: yLogic2Elem(yChannel[bestIdx])
        }
    };
}


export function getLabels_Scatterplot(resourceRenderCtx: TpResourceRenderContext, canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D, layer: TpCanvas2DRenderLayer): TpLabelLogical[] {
    if (!layer.visualSetup) return [];
    const visualSetup = layer.visualSetup!;
    const tableData = visualSetup.tableData;
    const origData = tableData.origData!;
    const openedRows = getOpenedRows(resourceRenderCtx.resourceInfo);

    const rowLabelFunc = getTableRowKeyIndex2Label(tableData);

    const labels: TpLabelLogical[] = [];
    for (const openedRow of openedRows) {
        if (openedRow.tableUri == tableData.tableUri) {
            const logicX = origData.columnValues[visualSetup.channelEncodings.x.id][openedRow.rowKeyIndex];
            const logicY = origData.columnValues[visualSetup.channelEncodings.y.id][openedRow.rowKeyIndex];
            if (!isNaN(logicX) && !isNaN(logicY)) {
                labels.push({
                    logicX,
                    logicY,
                    labelText: rowLabelFunc(openedRow.rowKeyIndex),
                })
            }
        }
    }
    return labels;
}




export const canvas2DLayerScatter2DDefinition: TpDataWidgetLayerTypeDef = {
    id: LAYERTYPE_SCATTER2D,
    name: '2D Scatterplot',
    vizQuality: 1,

    canLassoDraw: true,

    sections: [
        { id: 'coordinates', name: 'Coordinates' },
        { id: 'colors', name: 'Colors' },
        { id: 'points', name: 'Points' },
        { id: 'slicing', name: 'Slicing' },
        { id: 'contours', name: 'Density Contours' },
    ],

    channels: [
        {
            id: 'x',
            name: 'X axis',
            sectionId: 'coordinates',
            required: true,
            dataType: CHANNEL_TYPES.NUMERICAL,
        },
        {
            id: 'y',
            name: 'Y axis',
            sectionId: 'coordinates',
            required: true,
            dataType: CHANNEL_TYPES.NUMERICAL,
        },
        {
            id: 'color',
            name: 'Color',
            sectionId: 'colors',
            required: false,
            dataType: CHANNEL_TYPES.COLOR,
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
            id: 'contourShow',
            name: 'Show contours',
            sectionId: 'contours',
            settingType: configSettingBoolean(false),
        },
        {
            id: 'contourResolution',
            name: 'Contour resolution',
            sectionId: 'contours',
            visibleIf: `$contourShow`,
            settingType: configSettingChoice([50, 100, 150, 250, 500].map(val => ({ id: String(val), name: String(val) })), "250"),
        },
        {
            id: 'contourLevelCount',
            name: 'Contour level count',
            sectionId: 'contours',
            visibleIf: `$contourShow`,
            settingType: configSettingChoice([5, 10, 15].map(val => ({ id: String(val), name: String(val) })), "10"),
        },
        {
            id: 'contourSmoothingKernelWidth',
            name: 'Contour smoothing kernel',
            sectionId: 'contours',
            visibleIf: `$contourShow`,
            settingType: configSettingChoice([1, 2, 3, 4].map(val => ({ id: String(val), name: String(val) })), "2"),
        },

    ],

    createLayerData: createScatter2DLayerData,
    getHoverDataPoint: getHoverDataPoint_ScatterPlot,
    getLabels: getLabels_Scatterplot,
    getThingsTodoHelp,
};


function getThingsTodoHelp(visualSetup: TpVisualSetup): any[] {
    return [
        "Click & drag the mouse to perform a lasso selection",
        ...getZoomPanWdgetsThingsTodoHelp(),
        ...getGenericWidgetsThingsTodoHelp(),
    ];
}
