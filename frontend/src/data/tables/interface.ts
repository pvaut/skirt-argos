import { TpFilterMask } from "../../util/filters/interfaces";
import { TpRange } from "../../util/geometry/viewport2D";
import { TpIssue } from "../interfaces";


export const DT_VOID = "void"; // has no data
export const DT_INT = "int"; // int32, signed
export const DT_FLOAT = "float"; //32 bit IEEE
export const DT_DOUBLE = "double"; // 64 bit IEEE
export const DT_VECTOR3D = "vector3d"; // compound, consists of 3 numerical components
export const DT_CATEGORICAL = "categorical"; // states encoded as uint32, unsigned
export const DT_BOOLEAN = "boolean"; // states encoded as uint8
export const DT_STRING = "string"; // encoding: see implementation
// export const DT_BIGINT = "bigint";

export function isNumericalDataType(dataType: string) {
    return (dataType == DT_INT) || (dataType == DT_DOUBLE) || (dataType == DT_FLOAT);
}

export function isCategoricalDataType(dataType: string) {
    return (dataType == DT_CATEGORICAL) || (dataType == DT_BOOLEAN);
}



export interface TpColumnGroup {
    id: string;
    name: string;
}

export interface TpColumnData {
    id: string;
    name: string;
    description: string;
    parentColId: string | null;
    dataType: "void" | "int" | "float" | "double" | "categorical" | "string" | "vector3d" | "boolean";
    values: any | null;
    categoricalStatesList: string[] | null; // Used as lookup for encoded categorical states and boolean states
    subComponents: TpColumnData[]; // used in case of compound data, such as vector3d
    config: {
        decimalDigits: number | null; // if null => automatic
        unitName: string | null; // if undefined => no units
        pixelSize: number | null; // if defined, the column represents the X or Y axis of a bitmap
    }
    cache: {
        valueRange?: TpRange;
        average?: number;
        stdev?: number;
    }
}

export interface TpFilterData {
    mask: TpFilterMask;
    filterPassCount: number; // number of entities passed by this mask
}

export interface TpTableData {
    // The actual data content of a table (not kept in the store)
    // Metadata, including current filter definition, is kept in TpLoadedTableInfo, inside the store
    id: string;
    name: string;
    description?: string;
    tableUri: string; // = {resourceuri}.{tableid}
    labelColumnId: string | null; // optional identifier of the column holding the record display label
    rowCount: number;
    rowKeyIndexes: Int32Array; // index of the row in the full, original table
    columnGroups: TpColumnGroup[];
    columns: TpColumnData[];
    columnsMap: { [colId: string]: TpColumnData };
    currentfilterMask: TpFilterMask;
    currentFilterCount: number; // number of entities currently present in the filter
    filterStepsData: { [filterId: string]: TpFilterData };

    issues: TpIssue[];

    origData?: {
        //a copy of the original full data, used to revert any applied restrictions 
        rowCount: number;
        rowKeyIndexes: Int32Array;
        columnValues: { [colId: string]: any };
    }
}

