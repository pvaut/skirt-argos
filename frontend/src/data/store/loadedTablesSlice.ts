import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LOAD_STATUS } from '../interfaces';
import { TpRootState } from './store';
import { TpTableData } from '../tables/interface';
import { createConfigError, createInternalError } from '../../util/errors';
import { TpFilterInstance } from '../../util/filters/interfaces';
import { createFilterMask } from '../../util/filters/helpers';


// We use the following data structure to store the actual data table content, outside the store for efficiency reasons (as these can be huge)
// Moreover, the store cannot contain binary arrays
const cachedTableData: { [uri: string]: TpTableData } = {};

export function _setCachedTableData(table: TpTableData) {
    cachedTableData[table.tableUri] = table;
}

export function _removeCachedTableData(tableId: string) {
    delete cachedTableData[tableId];
}

export function _findTableData(uri: string): TpTableData | null {
    if (!cachedTableData[uri]) return null;
    return cachedTableData[uri];
}

export function _getTableData(uri: string): TpTableData {
    if (!cachedTableData[uri])
        throw createInternalError(`Table not found: ${uri}`);
    return cachedTableData[uri];
}

export interface TpLoadedTableInfo {
    // All information about a table that is kept in the store
    // For performance reasons, this does not include the actual data (which is kept in TpTableData, outside the store)
    uri: string;
    status: LOAD_STATUS;
    restrictionFilterSteps: TpFilterInstance[];
    currentFilterSteps: TpFilterInstance[];
    filterVersion: number;// used to trigger updates after filter changes
}

export interface TpLoadedTablesData {
    loadedTables: TpLoadedTableInfo[];
}

const initialState: TpLoadedTablesData = {
    loadedTables: [],
};

export function restrictTableDataToFilter(tableData: TpTableData) {
    const filterMask = tableData.currentfilterMask;

    // Filtering the column values
    let newRowCount: number = -1;
    for (const col of tableData.columns) {
        const values = col.values;
        if (values) {
            let newIdx = 0;
            for (let rowNr = 0; rowNr < values.length; rowNr++) {
                if (filterMask[rowNr]) {
                    values[newIdx] = values[rowNr];
                    newIdx++;
                }
            }
            newRowCount = newIdx;
            col.values = values.slice(0, newIdx);
        }
    }

    // Filtering the rowKeyIndexes
    let newIdx = 0;
    for (let rowNr = 0; rowNr < tableData.rowKeyIndexes.length; rowNr++) {
        if (filterMask[rowNr]) {
            tableData.rowKeyIndexes[newIdx] = tableData.rowKeyIndexes[rowNr];
            newIdx++;
        }
    }
    tableData.rowKeyIndexes = tableData.rowKeyIndexes.slice(0, newIdx);

    tableData.currentfilterMask = createFilterMask(newRowCount!, true);
    tableData.currentFilterCount = newRowCount!;
    tableData.rowCount = newRowCount!;
}

function _getLoadedTableInfo(state: TpLoadedTablesData, uri: string): TpLoadedTableInfo {
    const table = state.loadedTables.find(table => table.uri == uri);
    if (!table) throw createConfigError(`Trying to update table not found: ${uri}`);
    return table;
}


export const loadedTablesSlice = createSlice({
    name: 'loadedTables',
    initialState,
    reducers: {

        _addLoadedTable: (state, action: PayloadAction<{ uri: string }>) => {
            const uri = action.payload.uri;
            if (state.loadedTables.filter(table => table.uri == uri).length > 0) return;
            state.loadedTables.push({
                uri,
                status: LOAD_STATUS.LOADING,
                restrictionFilterSteps: [],
                currentFilterSteps: [],
                filterVersion: 1,
            });
        },

        _removeLoadedTable: (state, action: PayloadAction<{ uri: string }>) => {
            const uri = action.payload.uri;
            state.loadedTables = state.loadedTables.filter(table => table.uri != uri);
        },

        _setLoadedTableCompleted: (state, action: PayloadAction<{ uri: string }>) => {
            const uri = action.payload.uri;
            const index = state.loadedTables.map(table => table.uri).indexOf(uri);
            if (index < 0) throw createConfigError(`Trying to update table not found: ${uri}`);
            state.loadedTables[index].status = LOAD_STATUS.PRESENT;
        },

        _addFilter: (state, action: PayloadAction<{ uri: string, filter: TpFilterInstance }>) => {
            const uri = action.payload.uri;
            const filter = action.payload.filter;
            const table = _getLoadedTableInfo(state, uri);
            table.currentFilterSteps.push(filter);
            table.filterVersion += 1;
        },

        _replaceFilterSteps: (state, action: PayloadAction<{ uri: string, filterSteps: TpFilterInstance[] }>) => {
            const uri = action.payload.uri;
            const filterSteps = action.payload.filterSteps;
            const table = _getLoadedTableInfo(state, uri);
            table.currentFilterSteps = structuredClone(filterSteps);
            table.filterVersion += 1;
        },

        _replaceFilter: (state, action: PayloadAction<{ uri: string, filter: TpFilterInstance }>) => {
            const uri = action.payload.uri;
            const filter = action.payload.filter;
            const table = _getLoadedTableInfo(state, uri);
            const stepIdx = table.currentFilterSteps.findIndex(step => step.uid == filter.uid);
            if (stepIdx < 0)
                throw createInternalError(`Filter step to replace not found`);
            table.currentFilterSteps[stepIdx] = filter;
            table.filterVersion += 1;
        },

        _removeFilter: (state, action: PayloadAction<{ uri: string, filterStepUid: string }>) => {
            const uri = action.payload.uri;
            const filterStepUid = action.payload.filterStepUid;
            const table = _getLoadedTableInfo(state, uri);
            table.currentFilterSteps = table.currentFilterSteps.filter(step => step.uid != filterStepUid);
            table.filterVersion += 1;
        },

        _removeAllFilters: (state, action: PayloadAction<{ uri: string }>) => {
            const uri = action.payload.uri;
            const table = _getLoadedTableInfo(state, uri);
            table.currentFilterSteps = [];
            table.filterVersion += 1;
        },

        _restrictTableToFilter: (state, action: PayloadAction<{ uri: string }>) => {
            const uri = action.payload.uri;
            const table = _getLoadedTableInfo(state, uri);
            table.restrictionFilterSteps = [...table.restrictionFilterSteps, ...table.currentFilterSteps];
            table.currentFilterSteps = [];
            table.filterVersion += 1;
        },

        _removeRestriction: (state, action: PayloadAction<{ uri: string }>) => {
            const uri = action.payload.uri;
            const table = _getLoadedTableInfo(state, uri);
            table.currentFilterSteps = table.restrictionFilterSteps;
            table.restrictionFilterSteps = [];
            table.filterVersion += 1;
        },

        _incrementVersion: (state, action: PayloadAction<{ uri: string }>) => {
            const uri = action.payload.uri;
            const table = _getLoadedTableInfo(state, uri);
            table.filterVersion += 1;
        },

    },
});

// IMPORTANT NOTE:
// don't use the following actions directly, only call the functions returned by useTablesStorage

export const {
    _addLoadedTable,
    _removeLoadedTable,
    _setLoadedTableCompleted,
    _addFilter,
    _replaceFilterSteps,
    _replaceFilter,
    _removeFilter,
    _removeAllFilters,
    _restrictTableToFilter,
    _removeRestriction,
    _incrementVersion,
} = loadedTablesSlice.actions;

export const selectLoadedTables = (state: TpRootState) => state.loadedTables;

export default loadedTablesSlice.reducer;
