import { getResourceElemTrStateList } from "../../../../data/elemTrState";
import { TpTableStorage } from "../../../../data/usage/useTablesStorage";
import { getColorSchemaGray, theAppColorSchema } from "../../../../util/color/appColorSchema";
import { getCanvasTruncatedRenderText, setCanvasFont } from "../../../../util/canvasTools";
import { changeOpacity, color2String } from "../../../../util/color/color";
import { createInternalError } from "../../../../util/errors";
import { filterTypeRange } from "../../../../util/filters/filter-types/filterTypeRange";
import { findLassoFilter, findRangeFilter } from "../../../../util/filters/helpers";
import { postAMessage } from "../../../../util/messageBus";
import { TpPoint2D } from "../../../../util/geometry/point2D";
import { getRangeTicks } from "../../../../util/renderHelpers";
import { getRangeSize, getViewport2DCoordConvertors, TpRange, TpViewport2D, TpViewport2DCoordConvertors } from "../../../../util/geometry/viewport2D";
import { SYNCGROUP_TYPES, TpDataWidgetConfigSettingDef, TpElemInfo, TpElemTypeDefDataWidgetSL } from "../interface";
import { getCanvas2DLayerTypeDef } from "./canvas2DDefinition";
import { MESSAGE_CANVAS2D_REDRAW, TpCanvas2DRenderData } from "./interface";
import { LAYERTYPE_HISTOGRAM } from "./layer-types/layer-histogram/layerHistogram.Definition";
import { LAYERTYPE_SCATTER2D } from "./layer-types/layer-scatter-2d/layerScatter2D.Interface";
import { TpCanvas2DTransientData } from "./rendering";
import { CHART_CAT_XAXIS_HEIGHT, CHART_NUM_YAXIS_WIDTH, TpLegendMouseDragInfo } from "../helpers/helpers";
import { LAYERTYPE_DOTPLOT } from "./layer-types/layer-dotplot/layerDotPlot.Definition";
import { TpColumnData } from "../../../../data/tables/interface";
import { LAYERTYPE_BITMAPRGB } from "./layer-types/layer-bitmap-rgb/layerBitmapRGB.Interface";




export interface TpMouseDragContext2D {
    coordConvertors: TpViewport2DCoordConvertors;
    panning: boolean;
    lassoDrawing: boolean;
    hRangeSelecting: boolean;
    startPoint: TpPoint2D;
    currentPoint: TpPoint2D;
    lassoDrawingData: {
        isActive: boolean;
        points: TpPoint2D[];
    };
    rangeSelectingData: {
        point1?: TpPoint2D;
        point2?: TpPoint2D;
    };
    legendDragInfo: TpLegendMouseDragInfo | null;
}


export function renderRangeSelection(canvasCtx: CanvasRenderingContext2D, viewport: TpViewport2D, mouseDragContext: TpMouseDragContext2D) {
    const pixelRatio = viewport.pixelRatio;
    canvasCtx.strokeStyle = 'rgba(255,128,0,1)';
    canvasCtx.fillStyle = 'rgba(255,128,0,0.20)';
    canvasCtx.setLineDash([3 * pixelRatio, 3 * pixelRatio]);
    canvasCtx.lineWidth = pixelRatio * 1;
    const { point1, point2 } = mouseDragContext.rangeSelectingData;
    if (point1 && point2) {
        if (mouseDragContext.hRangeSelecting) {
            const yMin = viewport.displayRange.y.min * pixelRatio;
            const yMax = viewport.displayRange.y.max * pixelRatio;
            const xMin = Math.min(point1.x, point2.x) * pixelRatio;
            const xMax = Math.max(point1.x, point2.x) * pixelRatio;
            canvasCtx.fillRect(xMin, yMin, xMax - xMin, yMax);
            canvasCtx.beginPath();
            canvasCtx.moveTo(xMin, yMin); canvasCtx.lineTo(xMin, yMax);
            canvasCtx.moveTo(xMax, yMin); canvasCtx.lineTo(xMax, yMax);
            canvasCtx.stroke();
        }
    }
}


export function renderFilterPolygon(canvasCtx: CanvasRenderingContext2D, viewport: TpViewport2D, points: TpPoint2D[]) {
    const pixelRatio = viewport.pixelRatio;
    canvasCtx.strokeStyle = 'rgba(255,128,0,1)';
    canvasCtx.fillStyle = 'rgba(255,128,0,0.20)';
    canvasCtx.setLineDash([3 * pixelRatio, 3 * pixelRatio]);
    canvasCtx.lineWidth = pixelRatio * 1;
    const { xLogic2Elem, yLogic2Elem } = getViewport2DCoordConvertors(viewport);
    canvasCtx.beginPath();
    let first = true;
    for (const pt of points) {
        const x = xLogic2Elem(pt.x);
        const y = yLogic2Elem(pt.y);
        if (first) canvasCtx.moveTo(x, y);
        else canvasCtx.lineTo(x, y);
        first = false;
    }
    canvasCtx.closePath();
    canvasCtx.stroke();
}

export function performLassoSelection2D(trData: TpCanvas2DTransientData, lassoPointsDisplay: TpPoint2D[],
    sliceInfo: { colId: string, range: TpRange } | null) {
    // NOTE: points are in display coordinates, so we convert the to logical coords first
    const coordConvertors = getViewport2DCoordConvertors(trData.centralViewport);
    const lassoPointsLogical = lassoPointsDisplay.map(point => ({
        x: coordConvertors.xDisp2Logic(point.x),
        y: coordConvertors.yDisp2Logic(point.y),
    }));

    for (const layerData of trData.renderData!.layers) {
        if (layerData.visualSetup) {
            const layerTypeDef = getCanvas2DLayerTypeDef(layerData.layerTypeId);
            if (layerTypeDef.canLassoDraw) {
                const filter = layerData.createLassoFilter!(lassoPointsLogical, layerData.visualSetup!);
                trData.loadedTables!.addFilter(layerData.visualSetup.tableData.tableUri, filter);
                if (sliceInfo) {
                    setTimeout(() => {
                        const filter2 = filterTypeRange.createFilterInstance({
                            range: sliceInfo!.range,
                            binding: sliceInfo!.colId,
                        });
                        trData.loadedTables!.addFilter(layerData.visualSetup!.tableData.tableUri, filter2);
                    }, 100);
                }
            }
        }
    }
}

export function performRangeSelection(trData: TpCanvas2DTransientData, point1: TpPoint2D, point2: TpPoint2D) {
    // NOTE: points are in display coordinates, so we convert the to logical coords first
    const coordConvertors = getViewport2DCoordConvertors(trData.centralViewport);
    const point1Logical = {
        x: coordConvertors.xDisp2Logic(point1.x),
        y: coordConvertors.yDisp2Logic(point1.y),
    }
    const point2Logical = {
        x: coordConvertors.xDisp2Logic(point2.x),
        y: coordConvertors.yDisp2Logic(point2.y),
    }

    const horizontalRange: TpRange = {
        min: Math.min(point1Logical.x, point2Logical.x),
        max: Math.max(point1Logical.x, point2Logical.x),
    };

    for (const layerData of trData.renderData!.layers) {
        if (layerData.visualSetup) {
            const layerTypeDef = getCanvas2DLayerTypeDef(layerData.layerTypeId);
            if (layerTypeDef.canSelectHorizontalRange) {
                const filter = layerData.createHorizontalRangeFilter!(horizontalRange, layerData.visualSetup!);
                trData.loadedTables!.addFilter(layerData.visualSetup.tableData.tableUri, filter);
            }
        }
    }
}

export function renderRangeFilter(canvasCtx: CanvasRenderingContext2D, viewport: TpViewport2D, range: TpRange) {
    const coordConvertors = getViewport2DCoordConvertors(viewport);
    const pixelRatio = viewport.pixelRatio;

    const yMin = viewport.displayRange.y.min * pixelRatio;
    const yMax = viewport.displayRange.y.max * pixelRatio;
    const xMin = coordConvertors.xLogic2Elem(range.min);
    const xMax = coordConvertors.xLogic2Elem(range.max);

    canvasCtx.strokeStyle = 'rgba(255,128,0,1)';
    canvasCtx.fillStyle = 'rgba(255,128,0,0.30)';
    canvasCtx.setLineDash([3 * pixelRatio, 3 * pixelRatio]);
    canvasCtx.lineWidth = pixelRatio * 1;

    const gradient = canvasCtx.createLinearGradient(xMin, yMax, xMax, yMax);
    gradient.addColorStop(0, canvasCtx.fillStyle);
    gradient.addColorStop(0.25, 'transparent');
    gradient.addColorStop(0.75, 'transparent');
    gradient.addColorStop(1, canvasCtx.fillStyle);
    canvasCtx.fillStyle = gradient;


    canvasCtx.fillRect(xMin, yMin, xMax - xMin, yMax);
    canvasCtx.beginPath();
    canvasCtx.moveTo(xMin, yMin); canvasCtx.lineTo(xMin, yMax);
    canvasCtx.moveTo(xMax, yMin); canvasCtx.lineTo(xMax, yMax);
    canvasCtx.stroke();

}

export function renderActiveFiltersOverlay(renderData: TpCanvas2DRenderData, loadedTables: TpTableStorage, viewport: TpViewport2D, canvasCtx: CanvasRenderingContext2D) {
    for (const layer of renderData.layers) {
        // @todo: make this factory-driven!

        if (layer.visualSetup && ((layer.layerTypeId == LAYERTYPE_SCATTER2D) || (layer.layerTypeId == LAYERTYPE_BITMAPRGB) || (layer.layerTypeId == LAYERTYPE_DOTPLOT))) {
            const tableUri = layer.visualSetup.tableData.tableUri;
            const tableInfo = loadedTables.findTableInfo(tableUri);
            if (tableInfo) {
                const activeFilter = findLassoFilter(tableInfo.currentFilterSteps, layer.visualSetup.channelEncodings.x.id, layer.visualSetup.channelEncodings.y.id);
                if (activeFilter)
                    renderFilterPolygon(canvasCtx, viewport, activeFilter.polygon);
            }
        }

        if (layer.visualSetup && (layer.layerTypeId == LAYERTYPE_HISTOGRAM)) {
            const tableUri = layer.visualSetup.tableData.tableUri;
            const tableInfo = loadedTables.findTableInfo(tableUri);
            if (tableInfo) {
                const activeFilter = findRangeFilter(tableInfo.currentFilterSteps, layer.visualSetup.channelEncodings.values.id);
                if (activeFilter)
                    renderRangeFilter(canvasCtx, viewport, activeFilter.range);
            }
        }


    }
}


export function renderNumXAxis(canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D, renderData: TpCanvas2DRenderData) {
    const convertors = getViewport2DCoordConvertors(centralViewport);
    const { xLogic2Elem, xDisp2Logic, sizeDisp2Elem } = convertors;
    const pixelRatio = centralViewport.pixelRatio;

    const left = sizeDisp2Elem(centralViewport.displayRange.x.min);
    const width = sizeDisp2Elem(getRangeSize(centralViewport.displayRange.x));
    const top = sizeDisp2Elem(centralViewport.displayRange.y.max);

    canvasCtx.setLineDash([]);

    const visibleRangeX: TpRange = {
        min: xDisp2Logic(centralViewport.displayRange.x.min),
        max: xDisp2Logic(centralViewport.displayRange.x.max),
    }

    canvasCtx.lineWidth = sizeDisp2Elem(4);
    canvasCtx.strokeStyle = color2String(getColorSchemaGray(0.6));
    canvasCtx.fillStyle = color2String(getColorSchemaGray(0.6));
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'top';
    setCanvasFont(canvasCtx, pixelRatio, 10);

    canvasCtx.beginPath();
    canvasCtx.moveTo(left - sizeDisp2Elem(4), top + sizeDisp2Elem(2));
    canvasCtx.lineTo(left + width, top + sizeDisp2Elem(2));
    canvasCtx.stroke();


    const ticksX = getRangeTicks(visibleRangeX, 4);
    for (const tick of ticksX) {
        canvasCtx.beginPath();
        canvasCtx.lineWidth = sizeDisp2Elem(tick.label ? 2 : 1);
        canvasCtx.moveTo(xLogic2Elem(tick.value), top);
        canvasCtx.lineTo(xLogic2Elem(tick.value), top + sizeDisp2Elem(8));
        if (tick.label) {
            canvasCtx.fillText(tick.label, xLogic2Elem(tick.value), top + sizeDisp2Elem(12));

        }
        canvasCtx.stroke()
    }

    canvasCtx.textAlign = 'right';
    canvasCtx.fillStyle = color2String(getColorSchemaGray(1));
    canvasCtx.fillText(renderData.xAxisName, left + width, top + sizeDisp2Elem(30));

    if (centralViewport.mapX.zoom > 1.001) {
        const fr1 = (visibleRangeX.min - centralViewport.logicalRange.x.min) / getRangeSize(centralViewport.logicalRange.x);
        const fr2 = (visibleRangeX.max - centralViewport.logicalRange.x.min) / getRangeSize(centralViewport.logicalRange.x);
        const x1 = left + fr1 * width;
        const x2 = left + fr2 * width;
        canvasCtx.fillStyle = color2String(changeOpacity(theAppColorSchema.colorSp1, 0.4));
        canvasCtx.beginPath();
        canvasCtx.roundRect(x1, sizeDisp2Elem(centralViewport.totalDisplayHeight - 7), x2 - x1, sizeDisp2Elem(7), sizeDisp2Elem(14));
        canvasCtx.fill()
    }

}



export function renderNumYAxis(canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D, renderData: TpCanvas2DRenderData) {

    const convertors = getViewport2DCoordConvertors(centralViewport);
    const { yLogic2Elem, yDisp2Logic, sizeDisp2Elem } = convertors;
    const pixelRatio = centralViewport.pixelRatio;

    const left = sizeDisp2Elem(centralViewport.displayRange.x.min - CHART_NUM_YAXIS_WIDTH);
    const width = sizeDisp2Elem(CHART_NUM_YAXIS_WIDTH);


    const top = sizeDisp2Elem(centralViewport.displayRange.y.min);
    const height = sizeDisp2Elem(getRangeSize(centralViewport.displayRange.y));

    canvasCtx.setLineDash([]);

    const visibleRangeY: TpRange = {
        max: yDisp2Logic(centralViewport.displayRange.y.min),
        min: yDisp2Logic(centralViewport.displayRange.y.max),
    }

    canvasCtx.lineWidth = sizeDisp2Elem(4);
    canvasCtx.strokeStyle = color2String(getColorSchemaGray(0.6));
    canvasCtx.fillStyle = color2String(getColorSchemaGray(0.6));
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'bottom';
    setCanvasFont(canvasCtx, pixelRatio, 10);

    canvasCtx.beginPath();
    canvasCtx.moveTo(left + width - sizeDisp2Elem(2), top);
    canvasCtx.lineTo(left + width - sizeDisp2Elem(2), top + height);
    canvasCtx.stroke();

    const ticksY = getRangeTicks(visibleRangeY, 4);
    for (const tick of ticksY) {
        canvasCtx.beginPath();
        canvasCtx.lineWidth = sizeDisp2Elem(tick.label ? 2 : 1);
        canvasCtx.moveTo(left + width - sizeDisp2Elem(8), yLogic2Elem(tick.value));
        canvasCtx.lineTo(left + width, yLogic2Elem(tick.value));
        if (tick.label) {
            canvasCtx.save();
            canvasCtx.translate(left + width - sizeDisp2Elem(10), yLogic2Elem(tick.value));
            canvasCtx.rotate(-Math.PI / 2);
            canvasCtx.fillText(tick.label, 0, 0);
            canvasCtx.restore();
        }
        canvasCtx.stroke()
    }

    canvasCtx.textAlign = 'right';
    canvasCtx.fillStyle = color2String(getColorSchemaGray(1));
    canvasCtx.save();
    canvasCtx.translate(left + width - sizeDisp2Elem(28), top);
    canvasCtx.rotate(-Math.PI / 2);
    canvasCtx.fillText(renderData.yAxisName, 0, 0);
    canvasCtx.restore();

    if (centralViewport.mapY.zoom > 1.001) {
        const fr1 = 1 - (visibleRangeY.min - centralViewport.logicalRange.y.min) / getRangeSize(centralViewport.logicalRange.y);
        const fr2 = 1 - (visibleRangeY.max - centralViewport.logicalRange.y.min) / getRangeSize(centralViewport.logicalRange.y);
        const y1 = top + fr1 * height;
        const y2 = top + fr2 * height;
        canvasCtx.fillStyle = color2String(changeOpacity(theAppColorSchema.colorSp1, 0.4));
        canvasCtx.beginPath();
        canvasCtx.roundRect(0, y1, sizeDisp2Elem(7), y2 - y1, sizeDisp2Elem(14));
        canvasCtx.fill()
    }
}


export function renderCategoricalXAxis(canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D, renderData: TpCanvas2DRenderData) {
    const convertors = getViewport2DCoordConvertors(centralViewport);
    const { xLogic2Elem, xDisp2Logic, sizeDisp2Elem } = convertors;
    const pixelRatio = centralViewport.pixelRatio;

    const left = sizeDisp2Elem(centralViewport.displayRange.x.min);
    const width = sizeDisp2Elem(getRangeSize(centralViewport.displayRange.x));
    const top = sizeDisp2Elem(centralViewport.displayRange.y.max);

    canvasCtx.setLineDash([]);

    const visibleRangeX: TpRange = {
        min: xDisp2Logic(centralViewport.displayRange.x.min),
        max: xDisp2Logic(centralViewport.displayRange.x.max),
    }

    canvasCtx.lineWidth = sizeDisp2Elem(4);
    canvasCtx.strokeStyle = color2String(getColorSchemaGray(0.6));
    canvasCtx.fillStyle = color2String(getColorSchemaGray(0.6));
    canvasCtx.textAlign = 'right';
    canvasCtx.textBaseline = 'top';
    setCanvasFont(canvasCtx, pixelRatio, 10);

    canvasCtx.beginPath();
    canvasCtx.moveTo(left - sizeDisp2Elem(4), top + sizeDisp2Elem(2));
    canvasCtx.lineTo(left + width, top + sizeDisp2Elem(2));
    canvasCtx.stroke();

    if (!renderData.xAxisCategories) throw createInternalError(`Expected X axis categories`);
    const xAxisCategories = renderData.xAxisCategories;

    for (let i = 0; i < xAxisCategories.categories.length; i++) {
        canvasCtx.save();
        canvasCtx.translate(xLogic2Elem(i) - 4 * pixelRatio, top + sizeDisp2Elem(12));
        canvasCtx.rotate(-Math.PI / 2);
        let label = xAxisCategories.categories[i];
        label = getCanvasTruncatedRenderText(canvasCtx, label, CHART_CAT_XAXIS_HEIGHT * pixelRatio - 5 * pixelRatio);
        canvasCtx.fillText(label, 0, 0);
        canvasCtx.restore();
    }

}



export function getDataWidgetSLConfigSettingParamDef(widgetDef: TpElemTypeDefDataWidgetSL, configSettingId: string): TpDataWidgetConfigSettingDef {
    const configSetting = widgetDef.configSettings.find(setting => setting.id == configSettingId);
    if (!configSetting) throw createInternalError(`Could not find config setting ${configSettingId} in ${widgetDef.id}`);
    return configSetting;
}





export function canLassoDraw(renderData: TpCanvas2DRenderData | null): boolean {
    if (!renderData) return false;
    for (const layer of renderData.layers)
        if (getCanvas2DLayerTypeDef(layer.layerTypeId).canLassoDraw)
            return true;
    return false;
}

export function canSelectHorizontalRange(renderData: TpCanvas2DRenderData | null): boolean {
    if (!renderData) return false;
    for (const layer of renderData.layers)
        if (getCanvas2DLayerTypeDef(layer.layerTypeId).canSelectHorizontalRange)
            return true;
    return false;
}

export function broadcastSyncViewport2D(centralViewport: TpViewport2D, sourceElemInfo: TpElemInfo) {
    // When the 2D viewport of a chart is changed, make sure the update is applied to all other charts in the same sync group
    if (!sourceElemInfo.syncGroups[SYNCGROUP_TYPES.XAXIS] && !sourceElemInfo.syncGroups[SYNCGROUP_TYPES.YAXIS]) return;
    for (const targetElemState of getResourceElemTrStateList(sourceElemInfo.resourceUri)) {
        if (targetElemState.elemTrStateId != sourceElemInfo.elemTrStateId) // we don't send to the source chart, this should be already handled
            if (targetElemState.state.centralViewport2D) {
                const targetCentralViewport2D = targetElemState.state.centralViewport2D as TpViewport2D;
                let affected = false;
                if (sourceElemInfo.syncGroups[SYNCGROUP_TYPES.XAXIS] && (targetElemState.syncGroups[SYNCGROUP_TYPES.XAXIS] == sourceElemInfo.syncGroups[SYNCGROUP_TYPES.XAXIS])) {
                    targetCentralViewport2D.mapX = { ...centralViewport.mapX };
                    affected = true;
                }
                if (sourceElemInfo.syncGroups[SYNCGROUP_TYPES.YAXIS] && (targetElemState.syncGroups[SYNCGROUP_TYPES.YAXIS] == sourceElemInfo.syncGroups[SYNCGROUP_TYPES.YAXIS])) {
                    targetCentralViewport2D.mapY = { ...centralViewport.mapY };
                    affected = true;
                }
                if (affected)
                    postAMessage(MESSAGE_CANVAS2D_REDRAW, { elemTrStateId: targetElemState.elemTrStateId, debounced: false });
            }
    }
}


export function getAxisName(col: TpColumnData): string {
    if (!col.config.unitName) return col.name;
    return `${col.name} (${col.config.unitName})`;
}