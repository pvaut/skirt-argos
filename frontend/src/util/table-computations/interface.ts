import { NavigateFunction } from "react-router-dom";
import { TpColumnData, TpTableData } from "../../data/tables/interface";
import { TpComputeOperator, TpComputeOutputType } from "./computeOperators";
import { TpResourceInfo } from "../../data/interfaces";

export const TARGET_DASHBOARD = '_dashboard_';


export interface TpComputeSourceItem {
    identifier: string;
    outputType: TpComputeOutputType;
    sourceTableId?: string; // only present in case it originated from a column
    sourceColumn?: TpColumnData; // only present in case it originated from a column
    onSingleRow?: boolean; // in case it originated from a column, this specifies that this should act on a single row, not the entire column
    sourceValue?: any// only present in case it originated from an attribute
    sourceValueColumnData?: any// only present in case it originated from table selection
}


export interface TpComputeTempVariable {
    identifier: string;
    outputType: TpComputeOutputType;
    content: any;
}


export enum COMPUTATION_TYPES {
    OUTPUT_COLUMN = "OUTPUT_COLUMN",
    OUTPUT_SCALAR = "OUTPUT_SCALAR",
    NO_OUTPUT = "NO_OUTPUT",
}


export interface TpComputeEnv {
    resourceInfo: TpResourceInfo;
    navigate: NavigateFunction,
}


export interface TpComputeContext {
    dataTables: TpTableData[];
    sourceItems: TpComputeSourceItem[];
    tempVariables: TpComputeTempVariable[];
    computationType: COMPUTATION_TYPES;
    usingTableRowIndex?: {
        tableId: string,
        rowIndex: number;
    }
    env?: TpComputeEnv;
}


export interface TpTableComputationExpression {
    rootElement: TpComputeOperator | null;
}


export type TpComputeDataNumberColumn = TpNumericArray;


// Format used to store a column of 3D vectors
export interface TpComputeDataVectorColumn {
    x: TpNumericArray;
    y: TpNumericArray;
    z: TpNumericArray;
}


// Format used to store a single 3D vector
export interface TpComputeDataVectorScalar {
    x: number;
    y: number;
    z: number;
}


export type TpNumericArray = Float32Array | Float64Array;


export function createNumericArray(colLen: number, useDoublePrecision: boolean | null): TpNumericArray {
    if (!useDoublePrecision) return new Float32Array(colLen);
    else return new Float64Array(colLen);
}