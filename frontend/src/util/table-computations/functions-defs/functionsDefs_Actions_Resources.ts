

import { getTableUri } from "../../../data/helpers";
import { createNewLocalResourceInfo, TpConcept, TpResourceInfo } from "../../../data/interfaces";
import { locDb } from "../../../data/local-database/localDatabase";
import { _addActiveResource } from "../../../data/store/activeResourcesSlice";
import { _addLocalResource } from "../../../data/store/localResourcesSlice";
import { globalGetDispatch, globalGetStoreState, TpRootState } from "../../../data/store/store";
import { DT_BOOLEAN, DT_CATEGORICAL, DT_FLOAT, TpColumnData, TpTableData } from "../../../data/tables/interface";
import { assignColumData } from "../../../data/usage/useLoadTable";
import { getTablesStorage, TpTableStorage } from "../../../data/usage/useTablesStorage";
import { arrayBuffer2MemFile } from "../../data-sources/file-parsers/helpers";
import { sourceFileTypesList } from "../../data-sources/file-parsers/interface";
import { addTablesToResource } from "../../data-sources/upload-file-selector/fileImportWizard";
import { createConfigError, createInternalError, createUserError } from "../../errors";
import { filterTypeCustom } from "../../filters/filter-types/filterTypeCustom";
import { startWait, stopWait } from "../../processWithWait";
import { TpComputeContext, TpComputeEnv, TpNumericArray } from "../interface";
import { addFunctionDef, GROUP_ACTIONS_RESOURCES, typeArrayBuffer, typeBooleanColumn, typeBooleanScalar, typeNumberColumn, typeNumberScalar, typeStringColumn, typeStringScalar, typeVectorColumn, typeVectorScalar, typeVoid } from "./functionsDefs";


export function getComputeEnv(computeCtx: TpComputeContext): TpComputeEnv {
    if (!computeCtx.env) throw createInternalError(`env is missing in compute context`);
    return computeCtx.env!;
}


export function globalGetStateTablesStorage(): TpTableStorage {
    return getTablesStorage(globalGetDispatch(), globalGetStoreState().loadedTables);
}


export function scHasLocalResource(theState: TpRootState, uri: string): boolean {
    return !!theState.localResources.localResources.find(res => res.uri == uri);
}


export function scHasConcept(theState: TpRootState, id: string): boolean {
    return theState.config.conceptsMap.hasOwnProperty(id);
}


export function scGetLocalConcept(theState: TpRootState, id: string): TpConcept {
    const concept = theState.localResources.localConcepts.find(c => c.id == id);
    if (!concept) throw createConfigError(`Concept not found: ${id}`);
    return concept;
}


export function scGetLocalResource(theState: TpRootState, uri: string): TpResourceInfo {
    const resource = theState.localResources.localResources.find(res => res.uri == uri);
    if (!resource) throw createConfigError(`Resource not found: ${uri}`);
    return resource;
}


async function createResource(computeCtx: TpComputeContext, uri: string, name: string, description: string, conceptId: string, sourceData: ArrayBuffer, sourceDataType: string, thumbnail: string): Promise<any> {

    const theState = globalGetStoreState();
    const dispatch = globalGetDispatch();

    console.log(`==> creating resource uri=${uri}`);

    if (!scHasLocalResource(theState, uri)) {
        console.log(`==> creating new resource`);
        if (!scHasConcept(theState, conceptId))
            throw createUserError(`Unknown concept ${conceptId}`);
        const conceptDef = scGetLocalConcept(theState, conceptId);

        if (sourceFileTypesList.indexOf(sourceDataType) < 0)
            throw createUserError(`Invalid source file type ${sourceDataType} (expected ${sourceFileTypesList.join(', ')})`);

        const resourceDef = createNewLocalResourceInfo(sourceDataType as any);
        resourceDef.uri = uri;
        resourceDef.name = name;
        resourceDef.description = description;
        resourceDef.thumbnail = thumbnail;
        resourceDef.conceptId = conceptId;

        addTablesToResource(theState.config, resourceDef, conceptDef);
        dispatch(_addLocalResource({ resource: resourceDef }));
        await locDb.addResource(resourceDef, arrayBuffer2MemFile(sourceData));
    }
}


function openResource(computeCtx: TpComputeContext, uri: string) {
    const theState = globalGetStoreState();
    const dispatch = globalGetDispatch();

    const env = getComputeEnv(computeCtx);
    if (!scHasLocalResource(theState, uri))
        throw createUserError(`Resource not found (${uri})`);
    const resourceInfo = scGetLocalResource(theState, uri);
    env.navigate(`/resource/${uri}`);
    setTimeout(() => {
        dispatch(_addActiveResource({ uri, name: resourceInfo.name, description: resourceInfo.description, isLocal: true }));
    }, 20);
}


async function clearSelectionFilter(computeCtx: TpComputeContext, tableId: string) {
    const dataTable = computeCtx.dataTables.find(tb => tb.id == tableId);
    if (!dataTable) throw createConfigError(`Table not found: ${tableId}`);

    return new Promise(async (resolve, reject) => {
        const env = getComputeEnv(computeCtx);
        const tableUri = getTableUri(env.resourceInfo.uri, tableId);
        let frozenTablesStorage = globalGetStateTablesStorage();
        frozenTablesStorage.removeAllFilters(tableUri);
        resolve(undefined);
    });
}


async function addSelectionFilter(computeCtx: TpComputeContext, tableId: string, mask: Uint8Array, description: string) {
    const dataTable = computeCtx.dataTables.find(tb => tb.id == tableId);
    if (!dataTable) throw createConfigError(`Table not found: ${tableId}`);
    if (dataTable.currentfilterMask.length != mask.length)
        throw createConfigError(`Incompatible filter mask lengths`);
    const maskBoolean: boolean[] = [];
    for (let i = 0; i < mask.length; i++) maskBoolean.push(mask[i] > 0)

    return new Promise(async (resolve, reject) => {
        const env = getComputeEnv(computeCtx);
        const tableUri = getTableUri(env.resourceInfo.uri, tableId);
        let frozenTablesStorage = globalGetStateTablesStorage();
        frozenTablesStorage.addFilter(
            tableUri,
            filterTypeCustom.createFilterInstance({ mask: maskBoolean, description }),
        );
        resolve(undefined);
    });
}


function createNewColumnData(dataTable: TpTableData, id: string, name: string, description: string, dataType: string): TpColumnData {

    const newCol: TpColumnData = {
        id,
        name,
        description,
        parentColId: null,
        dataType: dataType as any,
        values: null,
        categoricalStatesList: [],
        subComponents: [],
        cache: {},
        config: { decimalDigits: null, unitName: null, pixelSize: null },
    };
    dataTable.columns.push(newCol);
    dataTable.columnsMap[newCol.id] = newCol;
    return newCol;
}


async function addTableColumnNumerical(computeCtx: TpComputeContext, tableId: string, id: string, name: string, description: string, data: TpNumericArray) {
    const dataTable = computeCtx.dataTables.find(tb => tb.id == tableId);
    if (!dataTable) throw createConfigError(`Table not found: ${tableId}`);

    if (data.length != dataTable.currentfilterMask.length) throw createConfigError(`Incompatible column length`);
    if (dataTable.columnsMap[id])
        throw createConfigError(`Column ${id} exists already`);

    const col = createNewColumnData(dataTable, id, name, description, DT_FLOAT);
    assignColumData(col, data);
}


async function addTableColumnBoolean(computeCtx: TpComputeContext, tableId: string, id: string, name: string, description: string, data: TpNumericArray) {
    const dataTable = computeCtx.dataTables.find(tb => tb.id == tableId);
    if (!dataTable) throw createConfigError(`Table not found: ${tableId}`);

    if (data.length != dataTable.currentfilterMask.length) throw createConfigError(`Incompatible column length`);
    if (dataTable.columnsMap[id])
        throw createConfigError(`Column ${id} exists already`);

    const col = createNewColumnData(dataTable, id, name, description, DT_BOOLEAN);
    assignColumData(col, data);
    col.categoricalStatesList = ['False', 'True'];
}


async function addTableColumnCategorical(computeCtx: TpComputeContext, tableId: string, id: string, name: string, description: string, data: string[]) {
    const dataTable = computeCtx.dataTables.find(tb => tb.id == tableId);
    if (!dataTable) throw createConfigError(`Table not found: ${tableId}`);

    if (data.length != dataTable.currentfilterMask.length) throw createConfigError(`Incompatible column length`);
    if (dataTable.columnsMap[id])
        throw createConfigError(`Column ${id} exists already`);

    const col = createNewColumnData(dataTable, id, name, description, DT_CATEGORICAL);
    assignColumData(col, data);
}


export function initFunctionDefs_Actions_Resources() {

    addFunctionDef({
        functionName: 'resourceIsPresent',
        description: "Determines if a resource, given its uri, is present.",
        isVectorType: false,
        isAction: true,
        isAsync: false,
        group: GROUP_ACTIONS_RESOURCES,

        overloads: [
            {
                id: 'default',
                arguments: [
                    { name: 'uri', inputType: typeStringScalar },
                ],
                outputType: typeBooleanScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    const theState = globalGetStoreState();
                    return scHasLocalResource(theState, argList[0]);
                },
            },
        ],
    });

    addFunctionDef({
        functionName: 'createResource',
        description: "Creates a new resource from a downloaded data blob in case it is not yet present locally.",
        isVectorType: false,
        isAction: true,
        isAsync: true,
        group: GROUP_ACTIONS_RESOURCES,

        overloads: [
            {
                id: 'default',
                arguments: [
                    { name: 'uri', inputType: typeStringScalar },
                    { name: 'name', inputType: typeStringScalar },
                    { name: 'description', inputType: typeStringScalar },
                    { name: 'conceptId', inputType: typeStringScalar },
                    { name: 'sourceData', inputType: typeArrayBuffer },
                    { name: 'sourceDataType', inputType: typeStringScalar },
                    { name: 'thumbnail', inputType: typeStringScalar },
                ],
                outputType: typeVoid,
                eval: async (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    await createResource(computeCtx, argList[0], argList[1], argList[2], argList[3], argList[4], argList[5], argList[6]);
                },
            },
        ],
    });

    addFunctionDef({
        functionName: 'openResource',
        description: "Opens an existing resource for viewing.",
        isVectorType: false,
        isAction: true,
        isAsync: false,
        group: GROUP_ACTIONS_RESOURCES,

        overloads: [
            {
                id: 'default',
                arguments: [
                    { name: 'uri', inputType: typeStringScalar },
                ],
                outputType: typeVoid,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    openResource(computeCtx, argList[0]);
                },
            },
        ],
    });

    addFunctionDef({
        functionName: 'clearSelectionFilter',
        description: "Removes all current filters for the selection defined on a table.",
        isVectorType: false,
        isAction: true,
        isAsync: true,
        group: GROUP_ACTIONS_RESOURCES,

        overloads: [
            {
                id: 'default',
                arguments: [
                    { name: 'tableId', inputType: typeStringScalar },
                ],
                outputType: typeVoid,
                eval: async (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    await clearSelectionFilter(computeCtx, argList[0]);
                },
            },
        ],
    });

    addFunctionDef({
        functionName: 'addSelectionFilter',
        description: "Adds a new filter step for the selection defined on a table.",
        isVectorType: false,
        isAction: true,
        isAsync: true,
        group: GROUP_ACTIONS_RESOURCES,

        overloads: [
            {
                id: 'default',
                arguments: [
                    { name: 'tableId', inputType: typeStringScalar },
                    { name: 'mask', inputType: typeBooleanColumn },
                    { name: 'description', inputType: typeStringScalar },
                ],
                outputType: typeVoid,
                eval: async (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    await addSelectionFilter(computeCtx, argList[0], argList[1], argList[2]);
                },
            },
        ],
    });

    addFunctionDef({
        functionName: 'addColumnNumerical',
        description: "Adds a new numerical column to a table.",
        isVectorType: false,
        isAction: true,
        isAsync: true,
        group: GROUP_ACTIONS_RESOURCES,

        overloads: [
            {
                id: 'default',
                arguments: [
                    { name: 'tableId', inputType: typeStringScalar },
                    { name: 'columnId', inputType: typeStringScalar },
                    { name: 'columnName', inputType: typeStringScalar },
                    { name: 'columnDescription', inputType: typeStringScalar },
                    { name: 'data', inputType: typeNumberColumn },
                ],
                outputType: typeVoid,
                eval: async (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    await addTableColumnNumerical(computeCtx, argList[0], argList[1], argList[2], argList[3], argList[4]);
                },
            },
        ],
    });

    addFunctionDef({
        functionName: 'addColumnCategorical',
        description: "Adds a new categorical column to a table.",
        isVectorType: false,
        isAction: true,
        isAsync: true,
        group: GROUP_ACTIONS_RESOURCES,

        overloads: [
            {
                id: 'default',
                arguments: [
                    { name: 'tableId', inputType: typeStringScalar },
                    { name: 'columnId', inputType: typeStringScalar },
                    { name: 'columnName', inputType: typeStringScalar },
                    { name: 'columnDescription', inputType: typeStringScalar },
                    { name: 'data', inputType: typeStringColumn },
                ],
                outputType: typeVoid,
                eval: async (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    await addTableColumnCategorical(computeCtx, argList[0], argList[1], argList[2], argList[3], argList[4]);
                },
            },
        ],
    });

    addFunctionDef({
        functionName: 'addColumnBoolean',
        description: "Adds a new boolean column to a table.",
        isVectorType: false,
        isAction: true,
        isAsync: true,
        group: GROUP_ACTIONS_RESOURCES,

        overloads: [
            {
                id: 'default',
                arguments: [
                    { name: 'tableId', inputType: typeStringScalar },
                    { name: 'columnId', inputType: typeStringScalar },
                    { name: 'columnName', inputType: typeStringScalar },
                    { name: 'columnDescription', inputType: typeStringScalar },
                    { name: 'data', inputType: typeBooleanColumn },
                ],
                outputType: typeVoid,
                eval: async (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    await addTableColumnBoolean(computeCtx, argList[0], argList[1], argList[2], argList[3], argList[4]);
                },
            },
        ],
    });

}