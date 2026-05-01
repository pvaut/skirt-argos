

import { TpFilterInstance } from "../../../../../../util/filters/interfaces";
import { getGammaFactor, perfTimerStart, perfTimerStop } from "../../../../../../util/misc";
import { TpPoint2D } from "../../../../../../util/geometry/point2D";
import { RENDER_TYPES, TpGPURLayerDataColoredPoints2D } from "../../../../../../util/render-gpu/layer-types/colored-points-2D/interfaces";
import { GPUR_LAYER_TYPES } from "../../../../../../util/render-gpu/layer-types/interfaces";
import { combineRange, createEmptyRange, getArrayValueRange, getViewport2DCoordConvertors, TpViewport2D } from "../../../../../../util/geometry/viewport2D";
import { TpVisualSetup } from "../../../helpers/helpers";
import { TpElemInfo, TpResourceRenderContext } from "../../../interface";
import { TpCanvas2DRenderLayer } from "../../interface";
import { getColorPaletteInfo, getColorValueRangeInfo, LEGEND_TYPE_COLOR, renderColorCategoriesLegend, renderColorRangeLegend } from "../../../legends/colorLegend";
import { getSliceLegendMouseHoverInfo, LEGEND_TYPE_SLICE, renderSliceLegend, sliceLegendHandleMouseDown, sliceLegendHandleMouseDrag, sliceLegendHandleMouseUp } from "../../../legends/sliceLegend";
import { getSliceData } from "../../../helpers/slicingHelpers";
import { filterTypeLasso2D } from "../../../../../../util/filters/filter-types/filterTypeLasso2D";
import { getTableColumn, hasTableColumn, validateColumnHasData } from "../../../../../../data/tables/table";
import { getColorSchemaGray } from "../../../../../../util/color/appColorSchema";
import { changeOpacity, color2String } from "../../../../../../util/color/color";
import { isCategoricalDataType, isNumericalDataType, TpColumnData } from "../../../../../../data/tables/interface";
import { LAYERTYPE_PARALLEL_COORDS, TpLayerDataSpecificsParallelCoords } from "./layerParallelCoords.Interface";
import { TpGPURLayerDataWhiteLines2D } from "../../../../../../util/render-gpu/layer-types/white-lines-2D/interfaces";
import { TpCanvas2DTransientData } from "../../rendering";
import { getOpenedRows } from "../../../../../../data/usage/useActiveResourcesStorage";


export const stripRandomOffsetCount = 10000;
export const stripRandomOffsets: number[] = [];
for (let i = 0; i < stripRandomOffsetCount; i++) stripRandomOffsets[i] = Math.random() * 0.8 - 0.4;



export function createParallelCoordsLayerData(resourceRenderCtx: TpResourceRenderContext, layerId: string, visualSetup: TpVisualSetup, elemInfo: TpElemInfo): TpCanvas2DRenderLayer {

    // console.log(`==> PARACOORD CONFIG columns ${JSON.stringify(visualSetup.configSettings.columns)}`)

    const tableData = visualSetup.tableData

    const columns: TpColumnData[] = []
    for (const colDef of visualSetup.configSettings.columns) {
        const colId = colDef.id;
        if (hasTableColumn(tableData, colId)) {
            const column = getTableColumn(tableData, colId);
            if (isNumericalDataType(column.dataType))
                columns.push(column);
        }
    }

    let totalRange = createEmptyRange();
    for (const col of columns) combineRange(totalRange, getArrayValueRange(col, true));


    if (visualSetup.channelEncodings.color)
        validateColumnHasData(visualSetup.channelEncodings.color);
    const colorValues = visualSetup.channelEncodings.color?.values;
    const selectionMask = visualSetup.tableData.currentfilterMask;
    const rowKeyIndexes = visualSetup.tableData.rowKeyIndexes;

    const hasNumericalColors = !!colorValues && isNumericalDataType(visualSetup.channelEncodings.color.dataType);
    const hasCategoricalColors = !!colorValues && isCategoricalDataType(visualSetup.channelEncodings.color.dataType);

    const pointCount = selectionMask.length;
    const sizeCorrFactor = 10000 / (10000 + pointCount ** 0.65);
    const pointSizeFactor = ((1 + visualSetup.configSettings.pointSizeFactor) / 11) ** 1.3 * 15 * sizeCorrFactor;

    // // const pf = perfTimerStart();
    // const xValues = new Float32Array(pointCount);
    // for (let i = 0; i < pointCount; i++)
    //     xValues[i] = catValues[i] + stripRandomOffsets[rowKeyIndexes[i] % stripRandomOffsetCount];
    // // perfTimerStop(pf, "random");

    let jitter = 0.2;

    const coordPtPosX = new Float32Array(pointCount * columns.length);
    const coordPtPosY = new Float32Array(pointCount * columns.length);
    const coordPtSelectionMask = new Uint8Array(pointCount * columns.length);
    let idx = 0;
    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const colValues = columns[colIdx].values;
        for (let ptIdx = 0; ptIdx < pointCount; ptIdx++) {
            coordPtPosX[idx] = colIdx + jitter * stripRandomOffsets[rowKeyIndexes[ptIdx] % stripRandomOffsetCount];
            coordPtPosY[idx] = colValues[ptIdx];
            coordPtSelectionMask[idx] = selectionMask[ptIdx];
            idx++
        }
    }

    const renderPoints: TpGPURLayerDataColoredPoints2D = {
        layerId: `${layerId}_sel`,
        layerType: GPUR_LAYER_TYPES.COLORED_POINTS_2D,
        posX: coordPtPosX,
        posY: coordPtPosY,
        selectionMask: coordPtSelectionMask,
        pointSizeFactor,
        opacity: visualSetup.configSettings.opacity,
        renderType: visualSetup.configSettings.renderType,
    };

    if (hasNumericalColors) {
        const coordPtColorValues = new Float32Array(pointCount * columns.length);
        let idx = 0;
        for (let colIdx = 0; colIdx < columns.length; colIdx++) {
            const colValues = columns[colIdx].values;
            for (let ptIdx = 0; ptIdx < pointCount; ptIdx++) {
                coordPtColorValues[idx] = colorValues[ptIdx];
                idx++
            }
        }

        const { restrictedColorValueRange, colorRamp } = getColorValueRangeInfo(visualSetup);
        renderPoints.colorNumerical = {
            values: coordPtColorValues,
            minVal: restrictedColorValueRange!.min,
            maxVal: restrictedColorValueRange!.max,
            gammaFactor: getGammaFactor(visualSetup.configSettings.colorGammaFactor),
            colorRamp,
        }
    }

    // if (hasCategoricalColors) {
    //     const { colorPalette } = getColorPaletteInfo(visualSetup);
    //     renderPoints.colorCategorical = {
    //         values: colorValues,
    //         colorPalette,
    //     }
    // }


    let linesPosX = new Float32Array(pointCount * columns.length * 2);
    let linesPosY = new Float32Array(pointCount * columns.length * 2);
    idx = 0;
    let ptCnt = 0;
    for (let ptIdx = 0; ptIdx < pointCount; ptIdx++) {
        if (selectionMask[ptIdx]) {
            ptCnt++;
            for (let colIdx = 0; colIdx < columns.length - 1; colIdx++) {
                linesPosX[idx] = colIdx;
                linesPosY[idx] = columns[colIdx].values[ptIdx];
                idx++
                linesPosX[idx] = colIdx + 1;
                linesPosY[idx] = columns[colIdx + 1].values[ptIdx];
                idx++
            }
        }
    }
    linesPosX = linesPosX.subarray(0, idx);
    linesPosY = linesPosY.subarray(0, idx);

    const opacity = (0.01 + (1 - 0.01) * 1000 / (ptCnt + 1000));


    const renderLines: TpGPURLayerDataWhiteLines2D = {
        layerId: `${layerId}_lines`,
        layerType: GPUR_LAYER_TYPES.WHITE_LINES_2D,
        posX: linesPosX,
        posY: linesPosY,
        opacity,
        renderType: visualSetup.configSettings.renderTypeLines,
        intensity: visualSetup.configSettings.intensityLines,
    };


    const canvasRange = {
        x: { min: 0 - 0.5, max: (columns.length - 1) + 0.5 },
        y: totalRange,
    }

    const customData: TpLayerDataSpecificsParallelCoords = {
        columns,
        totalRange,
        jitter,
    }

    const layerData: TpCanvas2DRenderLayer = {
        layerTypeId: LAYERTYPE_PARALLEL_COORDS,
        visualSetup,
        canvasRange,
        gpuLayers: [renderLines, renderPoints],
        legendsHor: [],
        chartTitle: `Parallel coordinates`,
        xAxisName: 'X',
        yAxisName: 'Y',
        xAxisCategories: { categories: structuredClone(columns.map(col => col.name)) },

        // createLassoFilter,
        customData,
        renderCentralOverlay,
    };

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


    return layerData;
}


// function createLassoFilter(lassoPoints: TpPoint2D[], visualSetup: TpVisualSetup): TpFilterInstance {
//     const filter = filterTypeLasso2D.createFilterInstance({
//         polygon: lassoPoints,
//         bindingX: visualSetup.channelEncodings.x.id,
//         bindingY: visualSetup.channelEncodings.y.id,
//     });
//     return filter;
// }


function renderCentralOverlay(canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D, layerData: TpCanvas2DRenderLayer, trData: TpCanvas2DTransientData) {
    const { xLogic2Elem, yLogic2Elem, sizeDisp2Elem } = getViewport2DCoordConvertors(centralViewport);
    const pixelRatio = centralViewport.pixelRatio;


    // render opened rows
    if (layerData.visualSetup && trData) {
        const visualSetup = layerData.visualSetup!;
        const tableData = visualSetup.tableData;
        const origData = tableData.origData!;
        const resourceRenderCtx = trData.resourceRenderCtx;
        const openedRows = getOpenedRows(resourceRenderCtx.resourceInfo);

        const columns: TpColumnData[] = []
        for (const colDef of visualSetup.configSettings.columns) {
            const colId = colDef.id;
            if (hasTableColumn(tableData, colId)) {
                const column = getTableColumn(tableData, colId);
                if (isNumericalDataType(column.dataType))
                    columns.push(column);
            }
        }

        for (let take = 0; take <= 1; take++) {
            if (take == 0) {
                canvasCtx.lineWidth = 3 * pixelRatio;
                canvasCtx.strokeStyle = color2String(changeOpacity(getColorSchemaGray(0), 0.5));
            } else {
                canvasCtx.lineWidth = 1 * pixelRatio;
                canvasCtx.strokeStyle = 'rgb(255,192,0)';
            }

            for (const openedRow of openedRows) {

                let firstPt = true;
                canvasCtx.beginPath();

                for (let colIdx = 0; colIdx < columns.length; colIdx++) {
                    const col = columns[colIdx];
                    const vl = origData.columnValues[col.id][openedRow.rowKeyIndex];
                    if (!isNaN(vl)) {
                        const px = xLogic2Elem(colIdx);
                        const py = yLogic2Elem(vl);
                        if (firstPt) canvasCtx.moveTo(px, py);
                        else canvasCtx.lineTo(px, py);
                        firstPt = false;
                    } else {
                        firstPt = true;
                    }
                }
                canvasCtx.stroke();
            }
        }
    }

    if (trData && trData.hoverPointInfo) {

        const hoverPointInfo = trData.hoverPointInfo;
        const colValues = hoverPointInfo.customData!.colValues as number[];

        for (let take = 0; take <= 1; take++) {
            if (take == 0) {
                canvasCtx.lineWidth = 5 * pixelRatio;
                canvasCtx.strokeStyle = color2String(changeOpacity(getColorSchemaGray(0), 0.5));
            } else {
                canvasCtx.lineWidth = 2 * pixelRatio;
                canvasCtx.strokeStyle = color2String(getColorSchemaGray(1));
            }
            let firstPt = true;
            canvasCtx.beginPath();
            for (let colIdx = 0; colIdx < colValues.length; colIdx++) {
                if (!isNaN(colValues[colIdx])) {
                    const px = xLogic2Elem(colIdx);
                    const py = yLogic2Elem(colValues[colIdx]);
                    if (firstPt) canvasCtx.moveTo(px, py);
                    else canvasCtx.lineTo(px, py);
                    firstPt = false;
                } else {
                    firstPt = true;
                }
            }
            canvasCtx.stroke();
        }
    }


}