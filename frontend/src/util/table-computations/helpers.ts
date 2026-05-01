import { getTableUri, toValidIdentifier } from "../../data/helpers";
import { TpResourceInfo } from "../../data/interfaces";
import { DT_BOOLEAN, DT_CATEGORICAL, DT_DOUBLE, DT_FLOAT, DT_STRING, DT_VECTOR3D, DT_VOID, TpColumnData, TpTableData } from "../../data/tables/interface";
import { TpTableStorage } from "../../data/usage/useTablesStorage";
import { TpDtSrcAttribute } from "../data-sources/file-parsers/interface";
import { createConfigError, createInternalError } from "../errors";
import { COMP_DATA_TYPES, TpComputeOutputType } from "./computeOperators";
import { COMPUTATION_TYPES, TpComputeContext, TpComputeSourceItem } from "./interface";



export function dataTypeComputation2Column(computationDataType: COMP_DATA_TYPES): string {
    if (computationDataType == COMP_DATA_TYPES.NUMBER) return DT_FLOAT;
    if (computationDataType == COMP_DATA_TYPES.BOOLEAN) return DT_BOOLEAN;
    if (computationDataType == COMP_DATA_TYPES.VECTOR3D) return DT_VECTOR3D;
    if (computationDataType == COMP_DATA_TYPES.STRING) return DT_CATEGORICAL; // NOTE: for now, we assume that string computations should be treated as categorical
    return DT_VOID;
}


export function dataTypeColumn2Computation(columnDataType: string): COMP_DATA_TYPES {
    if (columnDataType == DT_FLOAT) return COMP_DATA_TYPES.NUMBER;
    if (columnDataType == DT_DOUBLE) return COMP_DATA_TYPES.NUMBER;
    if (columnDataType == DT_BOOLEAN) return COMP_DATA_TYPES.BOOLEAN;
    if (columnDataType == DT_VECTOR3D) return COMP_DATA_TYPES.VECTOR3D;
    if (columnDataType == DT_STRING) return COMP_DATA_TYPES.STRING;
    if (columnDataType == DT_CATEGORICAL) return COMP_DATA_TYPES.CATEGORICAL;
    return COMP_DATA_TYPES.VOID;
}


export function dataTypeColumnIsDoublePrecision(columnDataType: string): boolean {
    return columnDataType == DT_DOUBLE;
}


export function findComputeSourceItem(computeCtx: TpComputeContext, identifier: string): TpComputeSourceItem | null {
    return computeCtx.sourceItems.find(item => item.identifier == identifier) || null;
}


export function getComputeSourceItem(computeCtx: TpComputeContext, identifier: string): TpComputeSourceItem {
    const item = computeCtx.sourceItems.find(item => item.identifier == identifier);
    if (!item) {
        throw createConfigError(`Source item not found ${identifier}`);
    }
    return item;
}


export function formatType(tpe: TpComputeOutputType) {
    return `${tpe.dataType}${tpe.isColumn ? "[]" : ""}`;
}


export function createComputeCtx(computationType: COMPUTATION_TYPES): TpComputeContext {
    return {
        dataTables: [],
        sourceItems: [],
        computationType,
        tempVariables: [],
    }
}

export function computeCtxAddDataTableColumn(computeCtx: TpComputeContext, dataTable: TpTableData, col: TpColumnData, addTablePrefix: boolean, onSingleRow: boolean) {
    let identifier = col.id;
    if (addTablePrefix)
        identifier = `${dataTable.id}_${col.id}`;
    let columnData = col;
    if (dataTable.origData)
        columnData = { ...columnData, values: dataTable.origData!.columnValues[col.id] }; // we set to origData because we want to be agnostic of restrictions here
    computeCtx.sourceItems.push({
        identifier,
        outputType: {
            dataType: dataTypeColumn2Computation(col.dataType),
            isColumn: !onSingleRow,
            isDoublePrecision: dataTypeColumnIsDoublePrecision(col.dataType),
        },
        sourceTableId: dataTable.id,
        sourceColumn: columnData,
        onSingleRow,
    })
}


export function computeCtxAddDataTable(computeCtx: TpComputeContext, dataTable: TpTableData, addTablePrefix: boolean, onSingleRow: boolean) {
    for (const col of dataTable.columns) {
        computeCtxAddDataTableColumn(computeCtx, dataTable, col, addTablePrefix, onSingleRow);
    }
}


export function computeCtxAddAllDataTables(computeCtx: TpComputeContext, resourceInfo: TpResourceInfo, tablesStorage: TpTableStorage) {
    for (const table of resourceInfo.tables) {
        const tableUri = getTableUri(resourceInfo.uri, table.id);
        const dataTable = tablesStorage.getTableData(tableUri);
        computeCtx.dataTables.push(dataTable);
        computeCtxAddDataTable(computeCtx, dataTable, true, false);
        computeCtx.sourceItems.push({
            identifier: `${dataTable.id}_currentSelection`,
            outputType: {
                dataType: COMP_DATA_TYPES.BOOLEAN,
                isColumn: true,
                isDoublePrecision: true,
            },
            sourceTableId: dataTable.id,
            sourceValueColumnData: dataTable.currentfilterMask,
            //sourceColumn: null,
            onSingleRow: false,
        })

    }
}


export function computeCtxAddResourceAttributes(computeCtx: TpComputeContext, resourceInfo: TpResourceInfo) {
    for (const attrib of resourceInfo.globalAttributes) {
        computeCtx.sourceItems.push({
            identifier: attrib.identifier,
            outputType: attrib.outputType,
            sourceValue: attrib.value,
        })
    }
}


export function computeCtxAddSourceDataAttributes(computeCtx: TpComputeContext, attributes: TpDtSrcAttribute[]) {
    for (const attrib of attributes) {
        const identifier = toValidIdentifier(attrib.name);
        let sourceValue = null;
        if (attrib.shape.length == 0)
            sourceValue = attrib.value;
        if ((attrib.shape.length == 1) && (attrib.shape[0] == 1)) {
            sourceValue = attrib.value[0];
        }
        if (attrib.dataType == DT_STRING)
            sourceValue = String(sourceValue); // we do this to get rid of potential weird HDF5 string storage
        if (sourceValue !== null) {
            computeCtx.sourceItems.push({
                identifier,
                outputType: {
                    dataType: dataTypeColumn2Computation(attrib.dataType),
                    isColumn: false,
                    isDoublePrecision: dataTypeColumnIsDoublePrecision(attrib.dataType),
                },
                sourceValue,
            })
        }
    }
}


export function computeCtxSetTableRowIdx(computeCtx: TpComputeContext, tableId: string, rowIndex: number) {
    if (computeCtx.usingTableRowIndex)
        throw createInternalError('Table row index cannot be set twice');
    computeCtx.usingTableRowIndex = { tableId, rowIndex }
}