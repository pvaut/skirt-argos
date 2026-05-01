import { TpLoadedTableInfo } from "../../../data/store/loadedTablesSlice";
import { TpTableData } from "../../../data/tables/interface";
import { createInternalError } from "../../errors";
import { guid } from "../../misc";
import { createFilterMask } from "../helpers";
import { TpFilterInstance, TpFilterMask, TpFilterTypeDef } from "../interfaces";

export const FILTER_TYPE_MANUAL = "Manual";


export interface TpFilterInstanceManual {
    filterType: string;
    selectedRowKeyIndexes: number[];
    uid: string;
}


function createFilterInstance(selectedRowKeyIndexes: number[]): TpFilterInstanceManual {
    return {
        filterType: FILTER_TYPE_MANUAL,
        selectedRowKeyIndexes,
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
    const filter = filterInp as TpFilterInstanceManual;


    const rowCount = tableData.rowCount;
    const filterMask = createFilterMask(rowCount, false);
    for (let rowNr = 0; rowNr < rowCount; rowNr++) {
        filterMask[rowNr] = filter.selectedRowKeyIndexes.indexOf(tableData.rowKeyIndexes[rowNr]) >=0 ? 1 :0;
    }
    return filterMask;

    debugger;//@todo: implement
    throw "@todo";
    //return filterMask;
}


function renderFilter(tableInfo: TpLoadedTableInfo, tableData: TpTableData, filterInp: TpFilterInstance) {
    const filter = filterInp as TpFilterInstanceManual;
    return (
        <div>
            Manual selection ({filter.selectedRowKeyIndexes.length})
        </div>
    )
}


export const filterTypeManual: TpFilterTypeDef = {
    id: FILTER_TYPE_MANUAL,
    name: 'Manual filter',
    createFilterInstance,
    isSameFilter,
    mergeFilters,
    applyFilter,
    renderFilter,
}