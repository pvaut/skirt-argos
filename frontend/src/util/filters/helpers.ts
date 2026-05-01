import { TpLoadedTableInfo } from "../../data/store/loadedTablesSlice";
import { TpTableData } from "../../data/tables/interface";
import { createInternalError } from "../errors";
import { FILTER_TYPE_CATEGORICAL, TpFilterInstanceCategorical } from "./filter-types/filterTypeCategorical";
import { FILTER_TYPE_LASSO_2D, TpFilterInstanceLasso2D } from "./filter-types/filterTypeLasso2D";
import { FILTER_TYPE_RANGE, TpFilterInstanceRange } from "./filter-types/filterTypeRange";
import { getFilterTypeDef } from "./filterTypeFactory";
import { TpFilterInstance, TpFilterMask } from "./interfaces";


export function createFilterMask(rowCount: number, fillIncluded: boolean): TpFilterMask {
    if (fillIncluded)
        return new Uint8Array(rowCount).fill(1);
    else
        return new Uint8Array(rowCount).fill(0);
}


export function getMaskPassCount(mask: TpFilterMask): number {
    let count = 0;
    for (let i = 0; i < mask.length; i++)
        if (mask[i]) count++;
    return count;
}


export function isSameFilter(filter1: TpFilterInstance, filter2: TpFilterInstance): boolean {
    if (filter1.filterType != filter2.filterType) return false;
    return getFilterTypeDef(filter1.filterType).isSameFilter(filter1, filter2);
}


export function mergeFilters(filterOrig: TpFilterInstance, filterToAdd: TpFilterInstance): TpFilterInstance | null {
    if (filterOrig.filterType != filterToAdd.filterType)
        throw createInternalError(`Filter types not compatible for merge`);
    const mergedFilter = getFilterTypeDef(filterOrig.filterType).mergeFilters(filterOrig, filterToAdd);
    if (!mergedFilter) return null;
    if (filterOrig.filterType != mergedFilter.filterType) // sanity check
        throw createInternalError(`Something went wrong`);
    if (filterOrig.uid != mergedFilter.uid) // sanity check
        throw createInternalError(`Something went wrong`);
    return mergedFilter;
}


export function applyFilter(tableData: TpTableData, filter: TpFilterInstance): TpFilterMask {
    return getFilterTypeDef(filter.filterType).applyFilter(tableData, filter)
}


export function renderFilter(tableInfo: TpLoadedTableInfo, tableData: TpTableData, filter: TpFilterInstance) {
    return getFilterTypeDef(filter.filterType).renderFilter(tableInfo, tableData, filter);
}


export function findCategoricalFilter(filterSteps: TpFilterInstance[], colId: string): TpFilterInstanceCategorical | null {
    // In a set of filters, determine if a categorical filter is present for a specified column
    for (const filterStep of filterSteps)
        if (filterStep.filterType == FILTER_TYPE_CATEGORICAL) {
            const filterStepCat = filterStep as TpFilterInstanceCategorical;
            if (filterStepCat.binding == colId)
                return filterStepCat;
        }
    return null;
}


export function findLassoFilter(filterSteps: TpFilterInstance[], colX: string, colY: string): TpFilterInstanceLasso2D | null {
    // In a set of filters, determine if a lasso filter is present with compatible coordinates
    for (const filterStep of filterSteps)
        if (filterStep.filterType == FILTER_TYPE_LASSO_2D) {
            const filterStepLasso = filterStep as TpFilterInstanceLasso2D;
            if ((filterStepLasso.bindingX == colX) && (filterStepLasso.bindingY == colY))
                return filterStepLasso;
        }
    return null;
}


export function findRangeFilter(filterSteps: TpFilterInstance[], colValues: string): TpFilterInstanceRange | null {
    for (const filterStep of filterSteps)
        if (filterStep.filterType == FILTER_TYPE_RANGE) {
            const filterStepRange = filterStep as TpFilterInstanceRange;
            if ((filterStepRange.binding == colValues))
                return filterStepRange;
        }
    return null;
}