import { useDispatch } from "react-redux";
import { useAppSelector } from "../../util/hooks";
import { selectLoadedTables, _findTableData, TpLoadedTableInfo, _restrictTableToFilter, _addFilter, _getTableData, _replaceFilter, _removeAllFilters, _removeFilter, restrictTableDataToFilter, _removeRestriction, _incrementVersion, _removeCachedTableData, _removeLoadedTable, TpLoadedTablesData, _replaceFilterSteps } from "../store/loadedTablesSlice";
import { TpTableData } from "../tables/interface";
import { TpFilterInstance } from "../../util/filters/interfaces";
import { createConfigError, createInternalError } from "../../util/errors";
import { createFilterMask, getMaskPassCount, isSameFilter, mergeFilters, applyFilter } from "../../util/filters/helpers";
import { getTableFilterStepData } from "../tables/table";
import { clearCachedTableAggregations } from "../tables/table-aggregations/cachedTableAggregations";
import { TpAppDispatch } from "../store/store";

function clearTableCache(tableData: TpTableData) {
    for (const col of tableData.columns) {
        col.cache = {};
    }
}


function combineFilters(tableData: TpTableData, filterSteps: TpFilterInstance[]) {
    const rowCount = tableData.rowCount;
    const currentfilterMask = createFilterMask(rowCount, true);
    for (const filterStep of filterSteps) {
        const mask = getTableFilterStepData(tableData, filterStep.uid).mask;
        for (let rowNr = 0; rowNr < rowCount; rowNr++)
            if (!mask[rowNr])
                currentfilterMask[rowNr] = 0;
    }
    tableData.currentfilterMask = currentfilterMask;
    tableData.currentFilterCount = getMaskPassCount(currentfilterMask);

}

export interface TpTableStorage {
    findTableInfo: (uri: string) => TpLoadedTableInfo | undefined | null;
    findTableData: (uri: string) => TpTableData | null;
    removeTableData: (uri: string) => void;
    getTableInfo: (uri: string) => TpLoadedTableInfo;
    getTableData: (uri: string) => TpTableData;
    removeAllFilters: (uri: string) => void;
    removeFilter: (uri: string, filterStepUid: string) => void;
    restrictTableToFilter: (uri: string) => void;
    removeRestriction: (uri: string) => void;
    hasFilterStep: (uri: string, filter: TpFilterInstance) => boolean;
    addFilter: (uri: string, filter: TpFilterInstance) => void;
    replaceFilterSteps: (uri: string, filterSteps: TpFilterInstance[]) => void;
    recalculateFilter: (uri: string) => void;
    incrementVersion: (uri: string) => void;
}

// The following function should be used for all access and manipulations of table data and metadata
export function getTablesStorage(dispatch: TpAppDispatch, loadedTables: TpLoadedTablesData): TpTableStorage {

    function findTableInfo(uri: string) {
        return loadedTables.loadedTables.find(table => table.uri == uri);
    }

    function getTableInfo(uri: string) {
        const info = loadedTables.loadedTables.find(table => table.uri == uri);
        if (!info) throw createConfigError(`Table info not found: ${uri}`);
        return info;
    }

    return {
        findTableInfo,
        getTableInfo,

        findTableData: (uri: string) => {
            return _findTableData(uri);
        },

        removeTableData: (uri: string) => {
            _removeCachedTableData(uri);
            dispatch(_removeLoadedTable({ uri }));
        },

        getTableData: (uri: string) => {
            const tableData = _findTableData(uri);
            if (!tableData) throw createConfigError(`Table data not found: ${uri}`);
            return tableData;
        },

        removeFilter: (uri: string, filterStepUid: string) => {
            const tableData = _getTableData(uri);
            const newCurrentFilterSteps = structuredClone(getTableInfo(uri).currentFilterSteps).filter(step => step.uid != filterStepUid);
            delete tableData.filterStepsData[filterStepUid];
            dispatch(_removeFilter({ uri, filterStepUid }));
            combineFilters(tableData, newCurrentFilterSteps);
            clearCachedTableAggregations(tableData);
        },


        removeAllFilters: (uri: string) => {
            const tableData = _getTableData(uri);
            tableData.filterStepsData = {};
            dispatch(_removeAllFilters({ uri }));
            tableData.currentfilterMask = createFilterMask(tableData.rowCount, true);
            tableData.currentFilterCount = tableData.rowCount;
            clearCachedTableAggregations(tableData);
        },

        restrictTableToFilter: (uri: string) => {
            const tableData = _getTableData(uri);
            restrictTableDataToFilter(tableData);
            dispatch(_restrictTableToFilter({ uri }));
            tableData.filterStepsData = {};
            clearTableCache(tableData);
            clearCachedTableAggregations(tableData);
        },

        removeRestriction: (uri: string) => {
            // removes the restriction filter, and sets it as the current filter
            const tableData = _getTableData(uri);
            const restrictionFilterSteps = structuredClone(getTableInfo(uri).restrictionFilterSteps);

            const origData = tableData.origData;
            if (!origData) throw createInternalError(`Orig data for table was not created: ${tableData.tableUri}`);
            tableData.rowCount = origData.rowCount;
            for (const col of tableData.columns)
                if (col.values)
                    col.values = origData.columnValues[col.id].slice(0);
            tableData.rowKeyIndexes = origData.rowKeyIndexes.slice(); // we need a deep copy because we may modify it
            dispatch(_removeRestriction({ uri }));
            tableData.filterStepsData = {};
            tableData.currentfilterMask = createFilterMask(tableData.rowCount, true);
            tableData.currentFilterCount = tableData.rowCount;
            clearTableCache(tableData);
            clearCachedTableAggregations(tableData);

            // We need to recompute all filter steps that were part of the restriction filter
            for (const step of restrictionFilterSteps) {
                const newFilterMask = applyFilter(tableData, step);
                tableData.filterStepsData[step.uid] = {
                    mask: newFilterMask,
                    filterPassCount: getMaskPassCount(newFilterMask),
                }
            }
            combineFilters(tableData, restrictionFilterSteps);

        },

        hasFilterStep: (uri: string, filter: TpFilterInstance) => {
            return getTableInfo(uri).currentFilterSteps.find(step => isSameFilter(step, filter)) != undefined;
        },

        addFilter: (uri: string, filter: TpFilterInstance) => {
            const currentFilterSteps = structuredClone(getTableInfo(uri).currentFilterSteps);
            const tableData = _getTableData(uri);

            const existingFilterStepIndex = currentFilterSteps.findIndex(step => isSameFilter(step, filter));

            if (existingFilterStepIndex < 0) {
                // New step, we just add it
                dispatch(_addFilter({ uri, filter }));
                currentFilterSteps.push(filter); // we also apply it on local copy
                const newFilterMask = applyFilter(tableData, filter);
                tableData.filterStepsData[filter.uid] = {
                    mask: newFilterMask,
                    filterPassCount: getMaskPassCount(newFilterMask),
                }
            } else {
                // Step already exists, we merge both steps and replace it
                const mergedFilter = mergeFilters(currentFilterSteps[existingFilterStepIndex], filter);
                if (!mergedFilter) {
                    // the merger results in the removal of the existing filter step
                    const filterStepUid = currentFilterSteps[existingFilterStepIndex].uid;
                    dispatch(_removeFilter({ uri, filterStepUid }));
                    currentFilterSteps.splice(existingFilterStepIndex, 1); // we also apply it on local copy
                    delete tableData.filterStepsData[filterStepUid];
                } else {
                    // the merger results in the modification of the existing filter step
                    dispatch(_replaceFilter({ uri, filter: mergedFilter }));
                    currentFilterSteps[existingFilterStepIndex] = mergedFilter; // we also apply it on local copy
                    const mergedFilterMask = applyFilter(tableData, mergedFilter);
                    tableData.filterStepsData[mergedFilter.uid] = {
                        mask: mergedFilterMask,
                        filterPassCount: getMaskPassCount(mergedFilterMask),
                    }
                }
            }

            combineFilters(tableData, currentFilterSteps);
            clearCachedTableAggregations(tableData);
        },

        replaceFilterSteps: (uri: string, filterSteps: TpFilterInstance[]) => {
            dispatch(_replaceFilterSteps({ uri, filterSteps }));
            const tableData = _getTableData(uri);
            console.log(`==> h1`);
            for (const step of filterSteps) {
                const newFilterMask = applyFilter(tableData, step);
                tableData.filterStepsData[step.uid] = {
                    mask: newFilterMask,
                    filterPassCount: getMaskPassCount(newFilterMask),
                }
            }
            console.log(`==> h2`);
            combineFilters(tableData, filterSteps);
            clearCachedTableAggregations(tableData);
        },


        recalculateFilter: (uri: string) => {
            const tableData = _getTableData(uri);
            const currentFilterSteps = getTableInfo(uri).currentFilterSteps;
            for (const step of currentFilterSteps) {
                const newFilterMask = applyFilter(tableData, step);
                tableData.filterStepsData[step.uid] = {
                    mask: newFilterMask,
                    filterPassCount: getMaskPassCount(newFilterMask),
                }
            }
            combineFilters(tableData, currentFilterSteps);
            clearCachedTableAggregations(tableData);
        },

        incrementVersion: (uri: string) => {
            dispatch(_incrementVersion({ uri }));
            const tableData = _getTableData(uri);
            clearCachedTableAggregations(tableData);
        },

    }
}

// The following function should be used for all access and manipulations of table data and metadata
export function useTablesStorage(): TpTableStorage {
    const dispatch = useDispatch();
    const loadedTables = useAppSelector(selectLoadedTables);
    return getTablesStorage(dispatch, loadedTables);
}
