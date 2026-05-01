export enum SOURCE_FILE_TYPES {
    UNKNOWN = "UNKNOWN",
    HDF5 = "HDF5",
    TSV = "TSV",
}


export const sourceFileTypesList = ["HDF5", "TSV"];


export interface TpMemFile {
    chunks: ArrayBuffer[];
}


export type TpDtSrcShape = number[]; // array size = number of dimensions; values = number of values per dimension


export interface TpDtSrcAttribute {
    name: string;
    dataType: string; // DT_XXX definition
    shape: TpDtSrcShape;
    value: any;
}


export interface TpDtSrcGroup {
    id: string
    path: string;
    memberGroups: TpDtSrcGroup[];
    memberData: TpDtSrcData[];
    attributes: TpDtSrcAttribute[];
}


export interface TpDtSrcData {
    id: string
    path: string;
    dataType: string; // DT_XXX definition
    shape: TpDtSrcShape;
    attributes: TpDtSrcAttribute[];
}


export type TpDtSrcNode = TpDtSrcGroup | TpDtSrcData;


export interface TpDataSource {
    fileType: SOURCE_FILE_TYPES;
    fileName: string;
    error: string | null;
    root: TpDtSrcGroup;
}


export interface TpSourceFileParser {
    fileType: SOURCE_FILE_TYPES;
    acceptedExtensions: string[]; // should be defined as lower case
    openFromMemFile: (fileName: string, memFile: TpMemFile) => TpDataSource;
    getData: (dataSource: TpDataSource, path: string) => any;
    close: (dataSource: TpDataSource) => void;
}