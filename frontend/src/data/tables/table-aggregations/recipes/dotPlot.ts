
import { ContourMipmap } from "../../../../util/contour/contourAlgo";
import { calcContours, TpContourData, TpContourSettings } from "../../../../util/contour/contourData";
import { getArrayValueRange, getRangeSize } from "../../../../util/geometry/viewport2D";
import { TpColumnData, TpTableData } from "../../interface";
import { getTableColumn, validateColumnHasData } from "../../table";
import { TpTableAggregationRecipe } from "../interface";

export enum QUANT_AGGR_TYPES {
    SUM = 'sum',
    AVERAGE = 'average',
}

export interface TpDotPlotRecipe {
    xChannelId: string;
    yChannelId: string;
    quantChannelId: string | null;
    quantAggrType: QUANT_AGGR_TYPES | null;
    resolutionX: number;
    resolutionY: number;
    contourSettings: TpContourSettings | null; // if null => do not calculate
}

interface TpBinDef {
    minVal: number;
    step: number;
    count: number;
}

export interface TpDotPlotData {
    binDefX: TpBinDef,
    binDefY: TpBinDef,
    cellCounts: number[][];
    cellCountsSelected: number[][];
    maxCellCount: number;
    cellQuant: number[][];
    quantMin: number;
    quantMax: number;
    contourData: TpContourData | null;
}

function getBinDef(columnData: TpColumnData, resolution: number) {
    const valuesRange = getArrayValueRange(columnData, true);
    const step = getRangeSize(valuesRange) / (resolution - 1);
    const minVal = valuesRange.min - step / 2;
    return { minVal, step, count: resolution };
}

function createMatrix(countX: number, countY: number): number[][] {
    const cells: number[][] = [];
    for (let ix = 0; ix < countX; ix++) {
        cells.push([]);
        for (let iy = 0; iy < countY; iy++) cells[ix].push(0);
    }
    return cells;
}

function calculateDotPlot(table: TpTableData, settings: TpDotPlotRecipe): TpDotPlotData {
    const columnX = getTableColumn(table, settings.xChannelId);
    validateColumnHasData(columnX);
    const columnY = getTableColumn(table, settings.yChannelId);
    validateColumnHasData(columnY);
    const selectionMask = table.currentfilterMask;

    let quantValues: any = null;
    if (settings.quantChannelId) {
        const columnQuant = getTableColumn(table, settings.quantChannelId);
        validateColumnHasData(columnQuant);
        quantValues = columnQuant.values;
    }

    const binDefX = getBinDef(columnX, settings.resolutionX);
    const binDefY = getBinDef(columnY, settings.resolutionX);

    const cellCounts = createMatrix(binDefX.count, binDefY.count);
    const cellCountsSelected = createMatrix(binDefX.count, binDefY.count);
    const cellQuantSum = createMatrix(binDefX.count, binDefY.count);
    const cellQuantSumSelected = createMatrix(binDefX.count, binDefY.count);

    const xValues = columnX.values;
    const yValues = columnY.values;
    for (let i = 0; i < xValues.length; i++) {
        const x = xValues[i];
        const y = yValues[i];
        if (!isNaN(x) && !isNaN(y)) {
            const binX = Math.floor((xValues[i] - binDefX.minVal) / binDefX.step);
            const binY = Math.floor((yValues[i] - binDefY.minVal) / binDefY.step);
            cellCounts[binX][binY] += 1;
            if (quantValues) cellQuantSum[binX][binY] += quantValues[i];
            if (selectionMask[i]) {
                cellCountsSelected[binX][binY] += 1;
                if (quantValues) cellQuantSumSelected[binX][binY] += quantValues[i];
            }
        }
    }

    let maxCellCount = 0;
    for (let ix = 0; ix < binDefX.count; ix++)
        for (let iy = 0; iy < binDefY.count; iy++)
            if (cellCounts[ix][iy] > maxCellCount)
                maxCellCount = cellCounts[ix][iy];

    const quantType = settings.quantAggrType;

    let cellQuant = cellCountsSelected;
    let quantMin = 0;
    let quantMax = maxCellCount
    if (quantValues) {
        if (quantType == QUANT_AGGR_TYPES.AVERAGE) {
            for (let ix = 0; ix < binDefX.count; ix++)
                for (let iy = 0; iy < binDefY.count; iy++) {
                    if (cellCounts[ix][iy] > 0)
                        cellQuantSum[ix][iy] /= cellCounts[ix][iy]
                    else
                        cellQuantSumSelected[ix][iy] = Number.NaN;
                    if (cellCountsSelected[ix][iy] > 0)
                        cellQuantSumSelected[ix][iy] /= cellCountsSelected[ix][iy]
                    else
                        cellQuantSumSelected[ix][iy] = Number.NaN;
                }
        }
        cellQuant = cellQuantSumSelected;
        quantMin = Number.MAX_VALUE;
        quantMax = -Number.MAX_VALUE;
        for (let ix = 0; ix < binDefX.count; ix++)
            for (let iy = 0; iy < binDefY.count; iy++) {
                if (quantMax < cellQuantSum[ix][iy]) quantMax = cellQuantSum[ix][iy];
                if (quantMin > cellQuantSum[ix][iy]) quantMin = cellQuantSum[ix][iy];
            }
    }

    const raster = new Float32Array(binDefX.count * binDefY.count);
    let idx = 0;
    for (let iy = 0; iy < binDefY.count; iy++)
        for (let ix = 0; ix < binDefX.count; ix++) {
            raster[idx] = cellCountsSelected[ix][iy];
            idx++;
        }

    const rs: TpDotPlotData = {
        binDefX,
        binDefY,
        cellCounts,
        cellCountsSelected,
        maxCellCount,
        cellQuant,
        quantMin,
        quantMax,
        contourData: null,
    }

    if (settings.contourSettings)
        rs.contourData = calcContours(
            raster, binDefX.count, binDefY.count,
            settings.contourSettings,
            {
                x: {offset: binDefX.minVal, step: binDefX.step},
                y: {offset: binDefY.minVal, step: binDefY.step},
            }
        );

    return rs;
}

export const aggDotPlot: TpTableAggregationRecipe = {
    recipeId: "AGG_DOTPLOT",
    perform: calculateDotPlot,
}