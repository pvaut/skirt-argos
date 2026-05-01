import { TpLoadedTableInfo } from "../../data/store/loadedTablesSlice";
import { TpTableData } from "../../data/tables/interface";


export type TpFilterMask = Uint8Array; // 0=filtered away 1=present in filter


export interface TpFilterInstance {
    filterType: string;
    uid: string;
};


export interface TpFilterTypeDef {
    id: string;
    name: string;
    createFilterInstance(inputData: any): TpFilterInstance;
    isSameFilter(filter1: TpFilterInstance, filter2: TpFilterInstance): boolean;
    mergeFilters(filterOrig: TpFilterInstance, filterToAdd: TpFilterInstance): TpFilterInstance | null; // NOTE: null is returned when the result of the action means there is no filter anymore
    applyFilter: (tableData: TpTableData, filter: TpFilterInstance) => TpFilterMask;
    renderFilter: (tableInfo: TpLoadedTableInfo, tableData: TpTableData, filter: TpFilterInstance) => any;

    exportJSON?(filter: TpFilterInstance, tableData: TpTableData): any;
    importJSON?(json: any, tableData: TpTableData): TpFilterInstance;

    toExpression?(filter: TpFilterInstance, tableData: TpTableData): string;

    promptEditFilter?: (tableInfo: TpLoadedTableInfo, tableData: TpTableData, filter: TpFilterInstance) => Promise<TpFilterInstance>;
}