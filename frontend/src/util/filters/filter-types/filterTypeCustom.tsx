import { TpLoadedTableInfo } from "../../../data/store/loadedTablesSlice";
import {  TpTableData } from "../../../data/tables/interface";
import { createInternalError } from "../../errors";
import { guid } from "../../misc";
import { createFilterMask } from "../helpers";
import { TpFilterInstance, TpFilterMask, TpFilterTypeDef } from "../interfaces";

export const FILTER_TYPE_CUSTOM = "Custom";


export interface TpFilterInstanceCustom {
    filterType: string;
    maskString: string; // length = number of items "1" = selected, "0" = i=unselected. We store in this format because filter definitions are part of the store and must be both serialisable and not too complex
    description: string;
    uid: string;
}


function createFilterInstance({ mask, description }: { mask: boolean[], description: string }): TpFilterInstanceCustom {
    let maskString = "";
    for (let i = 0; i < mask.length; i++) maskString += mask[i] ? "1" : "0";
    return {
        filterType: FILTER_TYPE_CUSTOM,
        maskString,
        description,
        uid: guid(),
    }
}


function isSameFilter(filter1Inp: TpFilterInstance, filter2Inp: TpFilterInstance): boolean {
    return false;
}


function mergeFilters(filterOrigInp: TpFilterInstance, filterToAddInp: TpFilterInstance): TpFilterInstance | null {
    throw createInternalError('Cannot merge manual filter')
}


function applyFilter(tableData: TpTableData, filterInp: TpFilterInstance): TpFilterMask {
    const filter = filterInp as TpFilterInstanceCustom;


    const rowCount = tableData.rowCount;
    const filterMask = createFilterMask(rowCount, false);
    for (let rowNr = 0; rowNr < rowCount; rowNr++) {
        filterMask[rowNr] = filter.maskString[rowNr] == "1" ? 1 : 0;
    }
    return filterMask;

    debugger;//@todo: implement
    throw "@todo";
    //return filterMask;
}


function renderFilter(tableInfo: TpLoadedTableInfo, tableData: TpTableData, filterInp: TpFilterInstance) {
    const filter = filterInp as TpFilterInstanceCustom;
    return (
        <div>
            {filter.description}
        </div>
    )
}


export const filterTypeCustom: TpFilterTypeDef = {
    id: FILTER_TYPE_CUSTOM,
    name: 'Custom filter',
    createFilterInstance,
    isSameFilter,
    mergeFilters,
    applyFilter,
    renderFilter,
}