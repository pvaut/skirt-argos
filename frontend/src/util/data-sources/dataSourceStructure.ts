
import { createConfigError, createInternalError } from "../errors";
import { DT_CATEGORICAL, DT_DOUBLE, DT_FLOAT, DT_INT, DT_STRING } from "../../data/tables/interface";
import { SOURCE_FILE_TYPES, TpDataSource, TpDtSrcAttribute, TpDtSrcData, TpDtSrcGroup } from "./file-parsers/interface";






export function getDataSourceAvailableTables(dataSource: TpDataSource): string[] {
    const tables: string[] = [];

    function _collect(node: TpDtSrcGroup) {
        if (node.memberData.length > 0) {
            tables.push(node.path);
        }
        for (const memberGroup of node.memberGroups)
            _collect(memberGroup);
    }

    _collect(dataSource.root);

    return tables;
}


export function findDataSourceGroupByPath(dataSource: TpDataSource, path: string): TpDtSrcGroup | null {
    let theGroup: TpDtSrcGroup | null = null;

    function _find(node: TpDtSrcGroup) {
        if (node.path == path) {
            if (theGroup) throw createConfigError(`Duplicate paths: ${path}`);
            theGroup = node;
        }
        for (const subGroup of node.memberGroups)
            _find(subGroup)
    }

    _find(dataSource.root);
    return theGroup;
}


export function getDataSourceGroupByPath(dataSource: TpDataSource, path: string): TpDtSrcGroup {
    let theGroup = findDataSourceGroupByPath(dataSource, path);
    if (!theGroup) throw createConfigError(`Path to group not found: ${path}`);
    return theGroup;
}


export function hasDataSourceData(dataSource: TpDataSource, path: string): boolean {
    const pathTokens = path.split('/');
    let theGroup = findDataSourceGroupByPath(dataSource, pathTokens.slice(0, pathTokens.length - 1).join('/'));
    if (!theGroup) return false;
    return theGroup.memberData.find(data => data.path == path) != null;
}


// Returns the definition of the data
export function getDataSourceDataDef(dataSource: TpDataSource, path: string): TpDtSrcData {
    const pathTokens = path.split('/');
    let theGroup = getDataSourceGroupByPath(dataSource, pathTokens.slice(0, pathTokens.length - 1).join('/'));
    const data = theGroup.memberData.find(data => data.path == path);
    if (!data) throw createConfigError(`Could not find data item ${path}`);
    return data;
}


export function getDataTypeFromSourceData(dataDef: TpDtSrcData): string { // returns DT_XXX
    if ([DT_INT].indexOf(dataDef.dataType) >= 0) return DT_INT;
    if (['float', DT_FLOAT].indexOf(dataDef.dataType) >= 0) return DT_FLOAT;
    if (['double', DT_DOUBLE].indexOf(dataDef.dataType) >= 0) return DT_DOUBLE;
    if (dataDef.dataType == DT_STRING) return DT_STRING;
    if (dataDef.dataType == DT_CATEGORICAL) return DT_CATEGORICAL;
    throw createConfigError(`Unknown data type: ${dataDef.dataType}`);
}

export function findAttribute(prop: TpDtSrcData, attribName: string): TpDtSrcAttribute | undefined {
    return prop.attributes.find(attr => attr.name == attribName);
}
