import { getArrayValueRange, getRangeSize } from "../../../../util/geometry/viewport2D";
import { TpTableData } from "../../interface";
import { getTableColumn, validateColumnHasData } from "../../table";
import { TpTableAggregationRecipe } from "../interface";

export enum NUM_STAT_TYPES {
    AVERAGE = 'average',
    SUM = 'sum',
}

export interface TpNumStatsRecipe {
    valuesChannelId: string;
    statType: NUM_STAT_TYPES;
}

export interface TpNumStatsData {
    hasSelection: boolean;
    averages: {
        avgAll: number;
        avgSelected: number;
        avgUnselected: number;
    } | null;
    sums: {
        sumAll: number;
        sumSelected: number;
        sumUnselected: number;
    } | null;
}

function calculateNumStats(table: TpTableData, settings: TpNumStatsRecipe): TpNumStatsData {
    const column = getTableColumn(table, settings.valuesChannelId);
    validateColumnHasData(column);
    const values = column.values;
    const selectionMask = table.currentfilterMask;
    const rowCount = values.length;

    const result: TpNumStatsData = {
        hasSelection: false,
        averages: null,
        sums: null,
    }

    if (settings.statType == NUM_STAT_TYPES.AVERAGE) {
        let sumTotal: number = 0;
        let countTotal: number = 0;
        let sumSel: number = 0;
        let countSel: number = 0;
        for (let i = 0; i < rowCount; i++) {
            if (!isNaN(values[i])) {
                sumTotal += values[i];
                countTotal++;
                if (selectionMask[i]) {
                    sumSel += values[i];
                    countSel++;
                }
            }
        }
        result.hasSelection = countTotal > countSel;
        result.averages = {
            avgAll: countTotal > 0 ? sumTotal / countTotal : NaN,
            avgSelected: countSel > 0 ? sumSel / countSel : NaN,
            avgUnselected: countSel < countTotal ? ((sumTotal - sumSel) / (countTotal - countSel)) : NaN,
        }
    }

    if (settings.statType == NUM_STAT_TYPES.SUM) {
        let sumTotal: number = 0;
        let countTotal: number = 0;
        let sumSel: number = 0;
        let countSel: number = 0;
        for (let i = 0; i < rowCount; i++) {
            if (!isNaN(values[i])) {
                sumTotal += values[i];
                countTotal++;
                if (selectionMask[i]) {
                    sumSel += values[i];
                    countSel++;
                }
            }
        }
        result.hasSelection = countTotal > countSel;
        result.sums = {
            sumAll: sumTotal,
            sumSelected: sumSel,
            sumUnselected: sumTotal - sumSel,
        }
    }

    return result;


}

export const aggNumStats: TpTableAggregationRecipe = {
    recipeId: "AGG_NUM_STATS",
    perform: calculateNumStats,
}