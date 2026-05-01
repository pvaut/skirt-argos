import { TpLoadedTableInfo } from "../../../data/store/loadedTablesSlice";
import { TpTableData } from "../../../data/tables/interface";
import { getTableColumn, tableValue2DispString } from "../../../data/tables/table";
import { createInternalError } from "../../errors";
import { guid } from "../../misc";
import { TpRange } from "../../geometry/viewport2D";
import { createFilterMask } from "../helpers";
import { TpFilterInstance, TpFilterMask, TpFilterTypeDef } from "../interfaces";
import { executeForm, TpForm } from "../../components/form/Form";
import { createFormNumber } from "../../components/form/formFieldTypes";

export const FILTER_TYPE_RANGE = "Range";


export interface TpFilterInstanceRange {
    filterType: string;
    uid: string;
    binding: string;
    range: TpRange;
}


function createFilterInstance({ binding, range }:
    { binding: string, range: TpRange })
    : TpFilterInstanceRange {
    return {
        filterType: FILTER_TYPE_RANGE,
        uid: guid(),
        binding,
        range,
    }
}


function isSameFilter(filter1Inp: TpFilterInstance, filter2Inp: TpFilterInstance): boolean {
    if ((filter1Inp.filterType != FILTER_TYPE_RANGE) || (filter2Inp.filterType != FILTER_TYPE_RANGE))
        throw createInternalError("Unexpected filter type");
    const filter1 = filter1Inp as TpFilterInstanceRange;
    const filter2 = filter2Inp as TpFilterInstanceRange;
    return (filter1.binding == filter2.binding);
}


function mergeFilters(filterOrigInp: TpFilterInstance, filterToAddInp: TpFilterInstance): TpFilterInstance | null {
    if ((filterOrigInp.filterType != FILTER_TYPE_RANGE) || (filterToAddInp.filterType != FILTER_TYPE_RANGE))
        throw createInternalError("Unexpected filter type");
    const filterOrig = filterOrigInp as TpFilterInstanceRange;
    const filterToAdd = filterToAddInp as TpFilterInstanceRange;
    const newFilter = structuredClone(filterOrig);
    newFilter.range = filterToAdd.range;
    return newFilter;
}


function applyFilter(tableData: TpTableData, filterInp: TpFilterInstance): TpFilterMask {
    const filter = filterInp as TpFilterInstanceRange;
    const values = getTableColumn(tableData, filter.binding).values;
    const rangeMin = filter.range.min;
    const rangeMax = filter.range.max;
    const rowCount = values.length;

    const filterMask = createFilterMask(rowCount, false);
    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
        if ((values[rowIdx] >= rangeMin) && (values[rowIdx] <= rangeMax))
            filterMask[rowIdx] = 1;
    }
    return filterMask;
}


function renderFilter(tableInfo: TpLoadedTableInfo, tableData: TpTableData, filterInp: TpFilterInstance) {
    const filter = filterInp as TpFilterInstanceRange;
    const col = getTableColumn(tableData, filter.binding);
    const dispValMin = tableValue2DispString(col, filter.range.min, true);
    const dispValMax = tableValue2DispString(col, filter.range.max, true);
    return (
        <div>
            <i>{col.name} in [{dispValMin}, {dispValMax}]</i>
        </div>
    )
}


function promptEditFilter(tableInfo: TpLoadedTableInfo, tableData: TpTableData, filterInp: TpFilterInstance): Promise<TpFilterInstance> {
    const filter = filterInp as TpFilterInstanceRange;
    const col = getTableColumn(tableData, filter.binding);
    return new Promise<TpFilterInstance>((resolve, reject) => {
        const fldMinVal = createFormNumber("minVal", "Minimum value", filter.range.min);
        fldMinVal.required = true;
        const fldMaxVal = createFormNumber("maxVal", "Maximum value", filter.range.max);
        fldMaxVal.required = true;
        const theForm: TpForm = {
            name: `${col.name} range filter`,
            fields: [fldMinVal, fldMaxVal],
            buttons: [],
        }
        executeForm(theForm).then((rs) => {
            const newFilter = structuredClone(filter);
            newFilter.range.min = (rs as any).data.minVal;
            newFilter.range.max = (rs as any).data.maxVal;
            resolve(newFilter);
        })
    })
}


function exportJSON(filterInp: TpFilterInstance, tableData: TpTableData): any {
    const filter = filterInp as TpFilterInstanceRange;
    return {
        type: FILTER_TYPE_RANGE,
        values: filter.binding,
        min: filter.range.min,
        max: filter.range.max,
    }
}


function importJSON(json: any, tableData: TpTableData): TpFilterInstanceRange {
    return {
        filterType: FILTER_TYPE_RANGE,
        uid: guid(),
        binding: json.values,
        range: { min: json.min, max: json.max }
    }
}

function toExpression(filterInp: TpFilterInstance, tableData: TpTableData): string { 
    const filter = filterInp as TpFilterInstanceRange;
    return `(${filter.binding} >= ${filter.range.min}) && (${filter.binding} <= ${filter.range.max})`;
}



export const filterTypeRange: TpFilterTypeDef = {
    id: FILTER_TYPE_RANGE,
    name: 'Range filter',
    createFilterInstance,
    isSameFilter,
    mergeFilters,
    applyFilter,
    renderFilter,
    promptEditFilter,
    exportJSON,
    importJSON,
    toExpression,
}