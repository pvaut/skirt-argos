import { TpLoadedTableInfo } from "../../../data/store/loadedTablesSlice";
import { DT_BOOLEAN, TpTableData } from "../../../data/tables/interface";
import { getTableColumn } from "../../../data/tables/table";
import { createInternalError, createUserError } from "../../errors";
import { guid } from "../../misc";
import { createFilterMask } from "../helpers";
import { TpFilterInstance, TpFilterMask, TpFilterTypeDef } from "../interfaces";


export const FILTER_TYPE_CATEGORICAL = "Categorical";


export interface TpFilterInstanceCategorical {
    filterType: string;
    uid: string;
    binding: string;
    stateIds: string[];
}


function createFilterInstance({ binding, stateIds }:
    { binding: string, stateIds: string[] })
    : TpFilterInstanceCategorical {
    return {
        filterType: FILTER_TYPE_CATEGORICAL,
        uid: guid(),
        binding,
        stateIds,
    }
}


function isSameFilter(filter1Inp: TpFilterInstance, filter2Inp: TpFilterInstance): boolean {
    if ((filter1Inp.filterType != FILTER_TYPE_CATEGORICAL) || (filter2Inp.filterType != FILTER_TYPE_CATEGORICAL))
        throw createInternalError("Unexpected filter type");
    const filter1 = filter1Inp as TpFilterInstanceCategorical;
    const filter2 = filter2Inp as TpFilterInstanceCategorical;
    return filter1.binding == filter2.binding;
}


function mergeFilters(filterOrigInp: TpFilterInstance, filterToAddInp: TpFilterInstance): TpFilterInstance | null {
    if ((filterOrigInp.filterType != FILTER_TYPE_CATEGORICAL) || (filterToAddInp.filterType != FILTER_TYPE_CATEGORICAL))
        throw createInternalError("Unexpected filter type");
    const filterOrig = filterOrigInp as TpFilterInstanceCategorical;
    const filterToAdd = filterToAddInp as TpFilterInstanceCategorical;
    const newFilter = structuredClone(filterOrig);
    for (const stateId of filterToAdd.stateIds)
        if (filterOrig.stateIds.indexOf(stateId) < 0)
            newFilter.stateIds.push(stateId); // step not yet present => we add it
        else
            newFilter.stateIds = newFilter.stateIds.filter(item => item != stateId); // step present => we remove it (this give a toggle UI)
    if (newFilter.stateIds.length == 0)
        return null; // no more states to filter on, so filter disappears
    return newFilter;
}


function applyFilter(tableData: TpTableData, filterInp: TpFilterInstance): TpFilterMask {
    const filter = filterInp as TpFilterInstanceCategorical;

    const activeStateIdxs = filter.stateIds.map(stateId => parseInt(stateId));
    const activeStateCount = activeStateIdxs.length;

    const rowCount = tableData.rowCount;
    const filterMask = createFilterMask(rowCount, false);
    const stateIdxs = getTableColumn(tableData, filter.binding).values;
    for (let rowNr = 0; rowNr < rowCount; rowNr++) {
        let included = 0;
        for (let i = 0; i < activeStateCount; i++)
            if (stateIdxs[rowNr] == activeStateIdxs[i])
                included = 1;
        filterMask[rowNr] = included;
    }
    return filterMask;
}


function renderFilter(tableInfo: TpLoadedTableInfo, tableData: TpTableData, filterInp: TpFilterInstance) {
    const filter = filterInp as TpFilterInstanceCategorical;
    const filterColumn = getTableColumn(tableData, filter.binding);
    const stateNames = filter.stateIds.map(stateId => filterColumn.categoricalStatesList![parseInt(stateId)]).join(', ');
    return (
        <>
            <i>{filterColumn.name}</i> = {stateNames}
        </>
    )
}


function exportJSON(filterInp: TpFilterInstance, tableData: TpTableData): any {
    const filter = filterInp as TpFilterInstanceCategorical;
    const filterColumn = getTableColumn(tableData, filter.binding);


    const stateNames = filter.stateIds.map(stateId => filterColumn.categoricalStatesList![parseInt(stateId)]).join(';');

    return {
        type: FILTER_TYPE_CATEGORICAL,
        categories: filter.binding,
        states: stateNames,
    }
}


function importJSON(json: any, tableData: TpTableData): TpFilterInstanceCategorical {
    const filterColumn = getTableColumn(tableData, json.categories);

    const statesMap: {[id: string]: string} = {};
    for (let i=0; i<filterColumn.categoricalStatesList!.length; i++) {
        statesMap[filterColumn.categoricalStatesList![i]] = String(i);
    }
    const stateNames = json.states.split(';') as string[];
    const stateIds = stateNames.map(name => statesMap[name]);
    return {
        filterType: FILTER_TYPE_CATEGORICAL,
        uid: guid(),
        binding: json.categories,
        stateIds,
    }
}


function toExpression(filterInp: TpFilterInstance, tableData: TpTableData): string { 
    const filter = filterInp as TpFilterInstanceCategorical;
    const filterColumn = getTableColumn(tableData, filter.binding);
    if (filterColumn.dataType == DT_BOOLEAN) {
        if ((filter.stateIds.length > 1) || (filter.stateIds.length > 1))
            throw createUserError(`A boolean filter should have a single selected state`);
        if (filter.stateIds[0] == '1') return `${filter.binding}`;
        else return `(!${filter.binding})`;
    }
    return filter.stateIds.map(stateId => `(${filter.binding}=="${filterColumn.categoricalStatesList![parseInt(stateId)]}")`).join(' || ');
}


export const filterTypeCategorical: TpFilterTypeDef = {
    id: FILTER_TYPE_CATEGORICAL,
    name: 'Lasso filter',
    createFilterInstance,
    isSameFilter,
    mergeFilters,
    applyFilter,
    renderFilter,
    exportJSON,
    importJSON,
    toExpression,
}