import { createConfigError } from "../../util/errors";
import { DT_BOOLEAN, DT_CATEGORICAL, DT_INT, isNumericalDataType, TpColumnData, TpFilterData, TpTableData } from "./interface";


export function getTableColumn(table: TpTableData, colId: string): TpColumnData {
    if (!table.columnsMap[colId]) throw createConfigError(`Column "${colId}" not found in table "${table.name}"`);
    return table.columnsMap[colId];
}

export function hasTableColumn(table: TpTableData, colId: string): boolean {
    return !!table.columnsMap[colId];
}

export function validateColumnHasData(column: TpColumnData) {
    if (!column.values) throw createConfigError(`Column "${column.name}" has no data`);
}


type TpTableRowLabelFunc = (rowKeyIndex: number) => string;

// Returns a function that converts a row index to a display label
export function getTableRowKeyIndex2Label(table: TpTableData): TpTableRowLabelFunc {
    if (!table.labelColumnId) {
        return (rowKeyIndex: number) => String(rowKeyIndex);
    } else {
        const origData = table.origData!;
        const labelColumn = getTableColumn(table, table.labelColumnId);
        return (rowIdx: number) => tableValue2DispString(labelColumn, origData.columnValues[labelColumn.id][rowIdx], false)
    }
}


export function getTableFilterStepData(table: TpTableData, filterUid: string): TpFilterData {
    if (!table.filterStepsData[filterUid])
        throw createConfigError(`Invalid filter step for table ${table.tableUri}: ${filterUid}`);
    return table.filterStepsData[filterUid];
}

// Converts a value from a table colun to a string intended to be displayed to the user
export function tableValue2DispString(col: TpColumnData, value: any, withUnits: boolean): string {
    const unitExtension = (withUnits ? ((col.config.unitName ? ` ${col.config.unitName}` : "")) : "");

    if ((value == null) || (value == undefined)) return "-";
    if (col.dataType == DT_CATEGORICAL) {
        return col.categoricalStatesList![value] ?? "-?-";
    }
    if (col.dataType == DT_BOOLEAN) {
        return value ? "True" : "False";
    }
    if (isNumericalDataType(col.dataType)) {
        if (isNaN(value)) return '-';
        if ((col.config.decimalDigits != null) && (col.config.decimalDigits != undefined))
            return value.toFixed(col.config.decimalDigits) + unitExtension;
    }

    return String(value) + unitExtension;
}