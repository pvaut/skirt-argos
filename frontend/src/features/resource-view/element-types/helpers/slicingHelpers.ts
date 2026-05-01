import { combineRange, getArrayValueRange, TpRange } from "../../../../util/geometry/viewport2D";
import { SYNCGROUP_TYPES, TpElemInfo, TpResourceRenderContext } from "../interface";
import { getSliceState } from "../legends/sliceLegend";
import { getDashboardConsolidatedRange } from "./dashboardConsolidatedRanges";
import { TpVisualSetup } from "./helpers";


export interface TpSliceData {
    sliceValues: Float32Array;
    sliceValueRange: TpRange;
    sliceMin: number;
    sliceMax: number;
};


export function getSliceData(resourceRenderCtx: TpResourceRenderContext, visualSetup: TpVisualSetup, elemInfo: TpElemInfo): TpSliceData | null {
    let sliceValueRange;
    if (!visualSetup.channelEncodings.slice) return null;

    const sliceState = getSliceState(elemInfo);
    const sliceValues = visualSetup.channelEncodings.slice.values;
    sliceValueRange = getArrayValueRange(visualSetup.channelEncodings.slice, true);
    if (elemInfo.syncGroups[SYNCGROUP_TYPES.SLICE]) {
        const sliceRangeDashboard = getDashboardConsolidatedRange(resourceRenderCtx, SYNCGROUP_TYPES.SLICE, elemInfo.syncGroups[SYNCGROUP_TYPES.SLICE]);
        if (sliceRangeDashboard)
            combineRange(sliceValueRange, sliceRangeDashboard);
    }
    return {
        sliceValues,
        sliceValueRange,
        sliceMin: sliceValueRange.min + sliceState.minFrac * (sliceValueRange.max - sliceValueRange.min),
        sliceMax: sliceValueRange.min + sliceState.maxFrac * (sliceValueRange.max - sliceValueRange.min),
    }
}