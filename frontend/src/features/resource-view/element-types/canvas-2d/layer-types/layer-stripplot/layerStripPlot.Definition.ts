

import { configSettingChoice, configSettingRange } from "../../../helpers/configSettingTypes";
import { CHANNEL_TYPES, TpDataWidgetLayerTypeDef, TpElemInfo, TpResourceRenderContext } from "../../../interface";
import { createStripPlotLayerData, stripRandomOffsetCount, stripRandomOffsets } from "./layerStripPlot.CreateData";
import { RENDER_TYPES } from "../../../../../../util/render-gpu/layer-types/colored-points-2D/interfaces";
import { TpCanvas2DRenderLayer, TpHoverPointInfo2D, TpLabelLogical } from "../../interface";
import { getViewport2DCoordConvertors, TpViewport2D } from "../../../../../../util/geometry/viewport2D";
import { distPoints2DFast, TpPoint2D } from "../../../../../../util/geometry/point2D";
import { getTableRowKeyIndex2Label } from "../../../../../../data/tables/table";
import { getOpenedRows } from "../../../../../../data/usage/useActiveResourcesStorage";
import { LAYERTYPE_STRIPPLOT, TpLayerDataSpecificsStripPlot } from "./layerStripPlot.Interface";
import { getSliceState } from "../../../legends/sliceLegend";
import { chartNumericalColorConfigSettings } from "../../../helpers/chartDefinitions";
import { getGenericWidgetsThingsTodoHelp, getZoomPanWdgetsThingsTodoHelp, TpVisualSetup } from "../../../helpers/helpers";



function getHoverDataPoint(elemInfo: TpElemInfo, layerData: TpCanvas2DRenderLayer, viewport: TpViewport2D, dispPos: TpPoint2D): TpHoverPointInfo2D | null {
    const visualSetup = layerData.visualSetup!;
    const tableData = visualSetup.tableData;
    const currentfilterMask = tableData.currentfilterMask;
    const xChannel = visualSetup.channelEncodings.categories.values;
    const yChannel = visualSetup.channelEncodings.values.values;
    const sliceChannel = visualSetup.channelEncodings.slice?.values;
    const rowCount = visualSetup.tableData.rowCount;
    const rowKeyIndexes = visualSetup.tableData.rowKeyIndexes;
    const { xLogic2Disp, yLogic2Disp, xLogic2Elem, yLogic2Elem } = getViewport2DCoordConvertors(viewport);
    let maxDist = 10;
    let bestIdx = null;

    let sliceMin, sliceMax;
    if (sliceChannel) {
        const sliceValueRange = (layerData.customData! as TpLayerDataSpecificsStripPlot).sliceValueRange!;
        const sliceState = getSliceState(elemInfo);
        sliceMin = sliceValueRange.min + sliceState.minFrac * (sliceValueRange.max - sliceValueRange.min);
        sliceMax = sliceValueRange.min + sliceState.maxFrac * (sliceValueRange.max - sliceValueRange.min);
    }
    for (let rowNr = 0; rowNr < rowCount; rowNr++) {
        const xLogic = xChannel[rowNr] + stripRandomOffsets[rowKeyIndexes[rowNr] % stripRandomOffsetCount];
        if (Math.abs(dispPos.x - xLogic2Disp(xLogic)) <= maxDist) { // a fast first triage, based on one coordinate calculation only
            if (currentfilterMask[rowNr]) { // we only look for currently selected points
                if ((!sliceChannel) || ((sliceChannel[rowNr] >= sliceMin!) && (sliceChannel[rowNr] <= sliceMax!))) { // we only look for points in the current slice range, if active
                    const x = xLogic2Disp(xLogic);
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
    const rowKeyIndex = tableData.rowKeyIndexes[bestIdx];
    return {
        targetLayer: layerData,
        rowKeyIndex,
        label: rowLabelFunc(rowKeyIndex),
        elemPos: {
            x: xLogic2Elem(xChannel[bestIdx] + stripRandomOffsets[rowKeyIndex % stripRandomOffsetCount]),
            y: yLogic2Elem(yChannel[bestIdx])
        }

    };
}


function getLabels(resourceRenderCtx: TpResourceRenderContext, canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D, layer: TpCanvas2DRenderLayer): TpLabelLogical[] {
    if (!layer.visualSetup) return [];
    const visualSetup = layer.visualSetup!;
    const tableData = visualSetup.tableData;
    const origData = tableData.origData!;
    const openedRows = getOpenedRows(resourceRenderCtx.resourceInfo);

    const rowLabelFunc = getTableRowKeyIndex2Label(tableData);

    const labels: TpLabelLogical[] = [];
    for (const openedRow of openedRows) {
        if (openedRow.tableUri == tableData.tableUri) {
            const logicX = origData.columnValues[visualSetup.channelEncodings.categories.id][openedRow.rowKeyIndex] + stripRandomOffsets[openedRow.rowKeyIndex % stripRandomOffsetCount];
            const logicY = origData.columnValues[visualSetup.channelEncodings.values.id][openedRow.rowKeyIndex];
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




export const canvas2DLayerStripPlotDefinition: TpDataWidgetLayerTypeDef = {
    id: LAYERTYPE_STRIPPLOT,
    name: 'Strip Plot',
    vizQuality: 1,

    canLassoDraw: false,

    sections: [
        { id: 'coordinates', name: 'Coordinates' },
        { id: 'colors', name: 'Colors' },
        { id: 'points', name: 'Points' },
        { id: 'slicing', name: 'Slicing' },
    ],

    channels: [
        {
            id: 'categories',
            name: 'Categories',
            sectionId: 'coordinates',
            required: true,
            dataType: CHANNEL_TYPES.CATEGORICAL,
        },
        {
            id: 'values',
            name: 'Values',
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

    ],

    createLayerData: createStripPlotLayerData,
    getHoverDataPoint,
    getLabels,
    getThingsTodoHelp,
};


function getThingsTodoHelp(visualSetup: TpVisualSetup): any[] {
    return [
        // "Click & drag the mouse to perform a lasso selection",
        ...getZoomPanWdgetsThingsTodoHelp(),
        ...getGenericWidgetsThingsTodoHelp(),
    ];
}
