

import { SOURCE_FILE_TYPES } from "../util/data-sources/file-parsers/interface";
import { guid } from "../util/misc";
import { TpComputeOutputType } from "../util/table-computations/computeOperators";


export enum LOAD_STATUS {
    ABSENT = "ABSENT",
    LOADING = "LOADING",
    PRESENT = "LOADED",
    LOADING_STATIC_DATA = "LOADING_STATIC_DATA",
}

export const PREFIX_STATIC_RESOURCE = "static_";

export interface TpIssue {
    severity: number; // 0=info, 1=warning, 2=error, 3=critical error
    message: string;
}

export interface TpConcept {
    // Defines the structure of a class of resources
    id: string;
    name: string;
    namePlural: string;
    description: string;

    isLocal?: true,
    isTable?: boolean, // if true, defines records in a table rather than a top-level resource
    serverVersion?: string // when fetched as a static file from the server, contains the version as specified in the static index

    tableConcepts: TpConceptTableDefinition[]; // the tables that are part of this class of resources
    globalAttributeDefs: TpConceptGlobalAttributeDef[]; // the attributes that are part of this class of resources
}

export interface TpOntology {
    concepts: TpConcept[];
}

export interface TpComputationRecipe {
    // Defines the computation of a derived property
    id: string;
    name: string;
    description: string;
    unitName:string;
    groupName: string | null;
    decimalDigits: number | null;
    expression: string;
}

export interface TpDashboardAction {
    // An action defines an operation that can be triggerd by the user in the context of a resource dashboard
    id: string;
    name: string;
    targetTableId: string | null;// if set, the action operates on a single table record
    actionDef: string;
}

export interface TpResourceRenderTemplate {
    // Definition of the dashboard that is displayed for a class of resources
    templateId: string;
    targetConcept: string; // the concept this template is rendering
    name: string;
    rootElement: any;
    computationRecipes?: { [tableId: string]: TpComputationRecipe[] }; // the defined derived properties
    actions?: TpDashboardAction[]; // the defined actions
}

export interface TpAppConfig {
    ontology: TpOntology;
    resourceRenderTemplates: TpResourceRenderTemplate[];
    serverIsBigEndian: boolean;
}

export interface TpResourceTableDef {
    // An actual resource table instance.
    // IMPORTANT: the actual table data is not contained here because this is intended to go in the redux store which can't handle this
    // The table data is contained in
    //   * TpLoadedTableInfo structuctures in loadedTableSlice reducer ==> status & filter info
    //   * TpTableData structures in cachedTableData ==> actual table column data
    id: string;
    concept: string;
}

export interface TpResourceGlobalAttribute {
    // An actual resource attribute instance
    identifier: string;
    outputType: TpComputeOutputType;
    value: any;
}

export interface TpResourceInfo {
    // Definition of an actual resource instance
    uri: string;
    conceptId: string;
    name: string;
    description: string;
    creationTimeStamp: string;
    status: LOAD_STATUS;
    downloadProgress?: number;
    tables: TpResourceTableDef[];
    renderTemplate?: TpResourceRenderTemplate;
    globalAttributes: TpResourceGlobalAttribute[];
    issues: TpIssue[]; // accumulates issues that occurred e.g. during loading or rendering
    thumbnail: string;
    openedRowsVersion: number; // only used to trigger rerenders, actual info is kept outside store for speed reasons
    serverVersion?: string; // when fetched as a static file from the server, the version as specified in the static index
    isLocal: true;
    dataSourceType: SOURCE_FILE_TYPES;
}


export function createNewLocalResourceInfo(dataSourceType: SOURCE_FILE_TYPES): TpResourceInfo {
    const creationTimeStamp = new Date().toISOString();
    return {
        isLocal: true,
        dataSourceType,
        uri: guid(),
        conceptId: '',
        name: '',
        description: '',
        creationTimeStamp,
        status: LOAD_STATUS.ABSENT,
        tables: [],
        globalAttributes: [],
        issues: [],
        thumbnail: '',
        openedRowsVersion: 0,
    };
}


export interface TpConceptTablePGroupDefinition {
    // Defines a group of properties in a table, mainly used for vidual grouping in e.g. dropdown property selectors
    id: string;
    name: string;
}

export interface TpConceptTablePropertyDefinition {
    // Defines a single table property (= a column)
    path: string;
    name: string;
    groupId: string | null;
    description: string;
    dataType: string; // DT_XXX
    transformationExpression: string;
    totalChildCount?: number;
    children: { // used for source properties that have more than one element, such as 3D vectors
        index: number;
        name: string;
        dataType: string;// DT_XXX
    }[],
    decimalDigits: number | null | undefined;
    unitName: string | undefined;
}

export interface TpConceptTableDefinition {
    // Defines a table, as part of a resource
    path: string;
    nameSingle: string;
    namePlural: string;
    description: string;
    labelColumnPath: string | null; // optional identifier of the column holding the record display label
    propertyGroups: TpConceptTablePGroupDefinition[];
    properties: TpConceptTablePropertyDefinition[];
}

export interface TpConceptGlobalAttributeDef {
    // Defines the recipe fror a global attribute of a resource
    identifier: string;
    expression: string;
}






