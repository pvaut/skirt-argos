import { getResourceElemTrStateList } from "../../../../data/elemTrState";
import { TpLoadedTableInfo } from "../../../../data/store/loadedTablesSlice";
import { DT_BOOLEAN, DT_CATEGORICAL, DT_DOUBLE, DT_FLOAT, DT_INT, DT_STRING, DT_VECTOR3D, isNumericalDataType, TpColumnData, TpTableData } from "../../../../data/tables/interface";
import { getTableColumn, hasTableColumn } from "../../../../data/tables/table";
import { createConfigError } from "../../../../util/errors";
import { getRangeTicks } from "../../../../util/renderHelpers";
import { getViewport2DCoordConvertors, resetViewport2DZoomPan, TpRange, TpSliceState, TpViewport2D } from "../../../../util/geometry/viewport2D";
import { CHANNEL_TYPES, SYNCGROUP_TYPES, TpDataWidgetChannelDef, TpDataWidgetConfigSettingDef, TpElemInfo, TpResourceRenderContext } from "../interface";
import { getCanvasTruncatedRenderText, setCanvasFont } from "../../../../util/canvasTools";
import { color2String } from "../../../../util/color/color";
import { theAppColorSchema } from "../../../../util/color/appColorSchema";
import { resetViewportVolumeZoom, TpViewportVolume } from "../../../../util/geometry/viewportVolume";
import { MESSAGE_UPDATE_SLICE, TpCanvas2DLegendHor, TpViewportMargins } from "../canvas-2d/interface";
import { postAMessage } from "../../../../util/messageBus";
import { TpCanvasVolumeTransientData, TpMouseDragContextVolume } from "../canvas-volume/rendering";
import { TpMouseDragContext2D } from "../canvas-2d/helpers";
import { TpCanvas2DTransientData } from "../canvas-2d/rendering";
import { TpLayerDataSpecificsScatter2D } from "../canvas-2d/layer-types/layer-scatter-2d/layerScatter2D.Interface";
import { getSliceState } from "../legends/sliceLegend";
import { FontAwesomeIcon, FontAwesomeIconProps } from "@fortawesome/react-fontawesome";


export const CHART_MARGIN = 5;
export const CHART_TITLE_HEIGHT = 40;
export const CHART_NUM_XAXIS_HEIGHT = 50;
export const CHART_CAT_XAXIS_HEIGHT = 140;
export const CHART_NUM_YAXIS_WIDTH = 42;


export interface TpLegendMouseDragInfo {
    legend: TpCanvas2DLegendHor,
    mouseDragInfo: any;
}


export function getSliceInfo(trData: TpCanvas2DTransientData | TpCanvasVolumeTransientData): { colId: string, range: TpRange } | null {
    if (!trData.renderData) return null;
    for (const layer of trData.renderData!.layers) {
        if (layer.visualSetup!.channelEncodings.slice) {
            const sliceValueRange = (layer.customData as TpLayerDataSpecificsScatter2D).sliceValueRange;
            if (sliceValueRange) {
                const slice = getSliceState(trData.elemInfo);
                return {
                    colId: layer.visualSetup!.channelEncodings.slice.id,
                    range: {
                        min: sliceValueRange.min + slice.minFrac * (sliceValueRange.max - sliceValueRange.min),
                        max: sliceValueRange.min + slice.maxFrac * (sliceValueRange.max - sliceValueRange.min),
                    },
                }
            }
        }
    }
    return null;
}


export function createMarginsCss(margins: TpViewportMargins): {} {
    return {
        position: 'absolute',
        left: `${margins.left}px`,
        top: `${margins.top}px`,
        width: `calc(100% - ${margins.left + margins.right}px)`,
        height: `calc(100% - ${margins.top + margins.bottom}px)`,
    };
}


// Defines how a set of channels from a data widget are connected to the data
export interface TpVisualSetup {
    tableData: TpTableData;
    tableInfo: TpLoadedTableInfo;
    channelEncodings: { [channelId: string]: TpColumnData };
    configSettings: { [configSettingId: string]: any };
}


export function getVisualSetup(ctx: TpResourceRenderContext, mappings: TpDataWidgetChannelDef[], configSettings: TpDataWidgetConfigSettingDef[], elemDef: any, suppressErrors?: boolean): TpVisualSetup | null {
    let table;
    const tableId = elemDef.table;
    if (tableId) {
        const tableUri = `${ctx.resourceInfo.uri}.${tableId}`;
        table = ctx.resourceTables.find(table => table.tableData.tableUri == tableUri);
    } else { // no table specified - we just take the first
        if (ctx.resourceTables.length > 0)
            table = ctx.resourceTables[0];
    }
    if (!table) {
        return null;
    }
    const encodings = elemDef.encodings || [];
    const visualSetup: TpVisualSetup = {
        tableData: table.tableData,
        tableInfo: table.tableInfo,
        channelEncodings: {},
        configSettings: {},
    }
    for (const mapping of mappings) {
        const colId = encodings[mapping.id];
        if (colId) {
            if (hasTableColumn(table.tableData, colId)) {
                const colInfo = getTableColumn(table.tableData, colId);
                if (!isColumnCompatileWithChannel(mapping, colInfo)) {
                    if (!suppressErrors)
                        throw createConfigError(`Column "${colInfo.name}" (${colInfo.dataType}) is not compatible with channel "${mapping.name}" (${mapping.dataType})`);
                } else
                    visualSetup.channelEncodings[mapping.id] = colInfo;
            } else {
                if (!suppressErrors)
                    throw createConfigError(`Column with id ${colId} not found in table with id ${table.tableData.id}`);
            }
        }
    }
    for (const configSetting of configSettings) {
        if (elemDef.settings && (configSetting.id in elemDef.settings)) {
            visualSetup.configSettings[configSetting.id] = elemDef.settings[configSetting.id];
        } else {
            visualSetup.configSettings[configSetting.id] =
                configSetting.settingType.defaultVal;
        }
    }
    return visualSetup;
}



export function renderCoordGrid(canvasCtx: CanvasRenderingContext2D, viewport: TpViewport2D, xIsCategorical: boolean) {

    canvasCtx.lineWidth = viewport.pixelRatio * 1;
    canvasCtx.setLineDash([]);

    const convertors = getViewport2DCoordConvertors(viewport);
    const { xLogic2Elem, yLogic2Elem, xDisp2Logic, yDisp2Logic } = convertors;

    const displayRange = viewport.displayRange;
    const pixelRatio = viewport.pixelRatio;

    if (!xIsCategorical) {
        const visibleRangeX: TpRange = {
            min: xDisp2Logic(viewport.displayRange.x.min),
            max: xDisp2Logic(viewport.displayRange.x.max),
        }
        const ticksX = getRangeTicks(visibleRangeX, 4);
        for (const tick of ticksX) {
            canvasCtx.beginPath();
            if (tick.label)
                canvasCtx.strokeStyle = "rgba(255,255,255,0.25)";
            else
                canvasCtx.strokeStyle = "rgba(255,255,255,0.1)";
            canvasCtx.moveTo(xLogic2Elem(tick.value), (displayRange.y.min) * pixelRatio);
            canvasCtx.lineTo(xLogic2Elem(tick.value), (displayRange.y.max) * pixelRatio);
            canvasCtx.stroke()
        }
    }

    const visibleRangeY: TpRange = {
        min: yDisp2Logic(viewport.displayRange.y.max),
        max: yDisp2Logic(+ viewport.displayRange.y.min),
    }
    const ticksY = getRangeTicks(visibleRangeY, 4);
    for (const tick of ticksY) {
        canvasCtx.beginPath();
        if (tick.label)
            canvasCtx.strokeStyle = "rgba(255,255,255,0.25)";
        else
            canvasCtx.strokeStyle = "rgba(255,255,255,0.10)";
        canvasCtx.moveTo((displayRange.x.min) * pixelRatio, yLogic2Elem(tick.value));
        canvasCtx.lineTo((displayRange.x.max) * pixelRatio, yLogic2Elem(tick.value));
        canvasCtx.stroke()
    }
}


export function renderLassoDrawing(canvasCtx: CanvasRenderingContext2D, viewport: TpViewport2D | TpViewportVolume, mouseDragContext: TpMouseDragContext2D | TpMouseDragContextVolume) {
    const pixelRatio = viewport.pixelRatio;
    canvasCtx.strokeStyle = 'rgba(255,128,0,1)';
    canvasCtx.fillStyle = 'rgba(255,128,0,0.20)';
    canvasCtx.setLineDash([3 * pixelRatio, 3 * pixelRatio]);
    canvasCtx.lineWidth = pixelRatio * 1;
    canvasCtx.beginPath();
    canvasCtx.moveTo(mouseDragContext.currentPoint.x * pixelRatio, mouseDragContext.currentPoint.y * pixelRatio);
    for (const pt of mouseDragContext.lassoDrawingData.points) canvasCtx.lineTo(pt.x * pixelRatio, pt.y * pixelRatio);
    canvasCtx.closePath();
    canvasCtx.fill();
    canvasCtx.stroke();
}



export function updateElementsTrStateAfterDataChange(resourceUri: string) {
    // update all transient state of elements after a change in the data (e.g. "restrict to filter")
    const elemStateList = getResourceElemTrStateList(resourceUri);
    for (const elemState of elemStateList) {
        if (elemState.state.centralViewport2D) {
            resetViewport2DZoomPan(elemState.state.centralViewport2D);
        }
        if (elemState.state.viewportVolume) {
            resetViewportVolumeZoom(elemState.state.viewportVolume);
        }
    }
}



export function clipCanvasArea(canvasCtx: CanvasRenderingContext2D, margins: TpViewportMargins, viewport: TpViewport2D | TpViewportVolume) {
    const pixelRatio = viewport.pixelRatio;
    const top = margins.top * pixelRatio;
    const left = margins.left * pixelRatio;
    const right = (viewport.totalDisplayWidth - margins.right) * pixelRatio;
    const bottom = (viewport.totalDisplayHeight - margins.bottom) * pixelRatio;
    canvasCtx.beginPath();
    canvasCtx.moveTo(left, top);
    canvasCtx.lineTo(right, top);
    canvasCtx.lineTo(right, bottom);
    canvasCtx.lineTo(left, bottom);
    canvasCtx.closePath();
    canvasCtx.clip();
}


export function renderTitle(canvasCtx: CanvasRenderingContext2D, viewport: TpViewport2D | TpViewportVolume, title: string, offsetX: number) {
    const pixelRatio = viewport.pixelRatio;
    const maxWidth = (viewport.totalDisplayWidth - 80 - offsetX) * pixelRatio;
    setCanvasFont(canvasCtx, viewport.pixelRatio, 12);

    canvasCtx.textAlign = 'left';
    canvasCtx.textBaseline = 'top';
    canvasCtx.fillStyle = color2String(theAppColorSchema.colorFg);
    const renderTxt = getCanvasTruncatedRenderText(canvasCtx, title, maxWidth);
    canvasCtx.fillText(
        renderTxt,
        (CHART_MARGIN + offsetX) * pixelRatio,
        (CHART_MARGIN + 10) * pixelRatio,
    );
}


export function broadcastSyncSlicing(sliceState: TpSliceState, sourceElemInfo: TpElemInfo) {
    // When te slicing position of a chart is changed, make sure the update is applied to all other charts in the same sync group
    if (!sourceElemInfo.syncGroups[SYNCGROUP_TYPES.SLICE]) return;
    for (const targetElemState of getResourceElemTrStateList(sourceElemInfo.resourceUri)) {
        if (targetElemState.elemTrStateId != sourceElemInfo.elemTrStateId) // we don't send to the source chart, this should be already handled
            if (targetElemState.syncGroups[SYNCGROUP_TYPES.SLICE] == sourceElemInfo.syncGroups[SYNCGROUP_TYPES.SLICE]) {
                if (targetElemState.state.sliceState) {
                    targetElemState.state.sliceState.minFrac = sliceState.minFrac;
                    targetElemState.state.sliceState.maxFrac = sliceState.maxFrac;
                    postAMessage(MESSAGE_UPDATE_SLICE, { elemTrStateId: targetElemState.elemTrStateId, debounced: false });
                }
            }
    }
}


export function getElemSyncGroupsFromDef(elemDef: any): { [syncGroupType: string]: string } {
    const syncGroups: { [syncGroupType: string]: string } = {};
    if (!elemDef.settings) return syncGroups;
    for (const syncGroupType of Object.values(SYNCGROUP_TYPES))
        if (elemDef.settings[syncGroupType])
            syncGroups[syncGroupType] = elemDef.settings[syncGroupType];
    return syncGroups;
}


export function checkIsColumnDataType(colInfo: TpColumnData, dataType: string) {
    if (colInfo.dataType != dataType)
        throw createConfigError(`Expected type ${dataType}, but is column "${colInfo.name}" of type ${colInfo.dataType}`);
    if ((dataType == DT_VECTOR3D) && (colInfo.subComponents.length != 3))
        throw createConfigError(`${dataType} does not have three components`);
}


export function isColumnCompatileWithChannel(channelDef: TpDataWidgetChannelDef, colInfo: TpColumnData): boolean {
    if (channelDef.dataType == CHANNEL_TYPES.ANY) return true;
    if ((channelDef.dataType == CHANNEL_TYPES.CATEGORICAL) && (colInfo.dataType == DT_CATEGORICAL)) return true;
    if ((channelDef.dataType == CHANNEL_TYPES.CATEGORICAL) && (colInfo.dataType == DT_BOOLEAN)) return true;
    if ((channelDef.dataType == CHANNEL_TYPES.NUMERICAL) && [DT_DOUBLE, DT_FLOAT, DT_INT].indexOf(colInfo.dataType) >= 0) return true;
    if ((channelDef.dataType == CHANNEL_TYPES.VECTOR3D) && (colInfo.dataType == DT_VECTOR3D)) return true;
    if ((channelDef.dataType == CHANNEL_TYPES.SORTABLE) && [DT_DOUBLE, DT_FLOAT, DT_INT, DT_CATEGORICAL, DT_STRING].indexOf(colInfo.dataType) >= 0) return true;
    if ((channelDef.dataType == CHANNEL_TYPES.COLOR) && [DT_DOUBLE, DT_FLOAT, DT_INT, DT_CATEGORICAL, DT_BOOLEAN].indexOf(colInfo.dataType) >= 0) return true;
    if ((channelDef.dataType == CHANNEL_TYPES.GRID_AXIS) && isNumericalDataType(colInfo.dataType) && (colInfo.config.pixelSize)) return true;
    return false;
}


export function getGenericWidgetsThingsTodoHelp(): any[] {
    return [
        <span>Click on the <FontAwesomeIcon icon="bars" /> button to change the widget settings</span>,
        <span>Click on the <FontAwesomeIcon icon="display" /> button to show the widget in full screen mode</span>
    ];
}

export function getZoomPanWdgetsThingsTodoHelp(): any[] {
    return [
        "Use shift + scroll wheel to zoom",
        "Use shift + mouse click & drag to pan when zoomed",
        <span>Click on the <FontAwesomeIcon icon="magnifying-glass" /> button to switch to zoom & pan mode (avoid having to press the shift key)</span>
    ]
}