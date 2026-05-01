import { getArrayValueRange, getRangeSize } from "../../../../util/geometry/viewport2D";
import { TpTableData } from "../../interface";
import { getTableColumn, validateColumnHasData } from "../../table";
import { TpTableAggregationRecipe } from "../interface";

export enum HISTOGRAM_YSCALE_TYPES {
    COUNT = 'count',
    LOG1P_COUNT = 'log1pCount',
}

export interface TpHistogramRecipe {
    valuesChannelId: string;
    resolutionNudgeFactor: number;
    yScaleType: HISTOGRAM_YSCALE_TYPES;
}

export interface TpHistogramData {
    bucketMin: number;
    bucketSize: number;
    bucketCount: number;
    bucketValuesSel: number[];
    bucketValuesUnsel: number[];
    maxBucketValue: number;
    yLabel: string;
}

function calculateHistogram(table: TpTableData, settings: TpHistogramRecipe): TpHistogramData {
    const column = getTableColumn(table, settings.valuesChannelId);
    validateColumnHasData(column);
    const values = column.values;
    const selectionMask = table.currentfilterMask;
    const rowCount = values.length;

    let targetBucketCount = Math.sqrt((Math.min(rowCount, 50000)));
    targetBucketCount = Math.round(targetBucketCount * settings.resolutionNudgeFactor ** 2 / 5 ** 2);

    const valuesRange = getArrayValueRange(column, true);

    const bucketSize = getRangeSize(valuesRange) / targetBucketCount;
    const bucketMin = Math.floor(valuesRange.min / bucketSize) * bucketSize;
    const bucketCount = Math.floor((valuesRange.max - bucketMin) / bucketSize) + 1;

    const bucketCountsUnsel: number[] = [];
    const bucketCountsSel: number[] = [];
    for (let i = 0; i < bucketCount; i++) {
        bucketCountsUnsel.push(0);
        bucketCountsSel.push(0);
    }

    for (let i = 0; i < rowCount; i++) {
        if (!isNaN(values[i])) {
            const bucketIdx = Math.floor((values[i] - bucketMin) / bucketSize);
            bucketCountsUnsel[bucketIdx]++;
            if (selectionMask[i]) bucketCountsSel[bucketIdx]++;
        }
    }

    let yLabel = 'Count';
    let bucketValuesSel = bucketCountsSel;
    let bucketValuesUnsel = bucketCountsUnsel;

    if (settings.yScaleType == 'log1pCount') { 
        bucketValuesSel = bucketValuesSel.map(val => Math.log1p(val));
        bucketValuesUnsel = bucketValuesUnsel.map(val => Math.log1p(val));
        yLabel = 'log1p Count';
    }

    const maxBucketValue = Math.max(...bucketValuesUnsel);

    return {
        bucketMin,
        bucketSize,
        bucketCount,
        bucketValuesUnsel,
        bucketValuesSel,
        maxBucketValue,
        yLabel,
    }


}

export const aggHistogram: TpTableAggregationRecipe = {
    recipeId: "AGG_HISTOGRAM",
    perform: calculateHistogram,
}