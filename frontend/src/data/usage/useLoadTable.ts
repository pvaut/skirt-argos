import { useDispatch } from "react-redux";
import { createRowKeyIndexes } from '../../api/helpers';
import { _addLoadedTable, _setCachedTableData, _setLoadedTableCompleted } from "../store/loadedTablesSlice";
import { DT_BOOLEAN, DT_CATEGORICAL, DT_FLOAT, DT_VECTOR3D, DT_VOID, TpColumnData, TpTableData } from "../tables/interface";
import { createDataArray, getConcept, id2Path, path2Id, toValidIdentifier, useConfig } from "../helpers";
import { TpComputationRecipe, TpIssue, TpResourceInfo } from "../interfaces";
import { createConfigError, createInternalError, logException, reportException } from "../../util/errors";
import {
    evalTableComputationExpressionSync, getTableComputationExpressionDependencies,
    parseTableComputationExpression
} from "../../util/table-computations/tableComputationExpression";
import { getUniformStringValue, perfTimerStart, perfTimerStop } from "../../util/misc";
import { COMPUTATION_TYPES, TpComputeContext, TpComputeDataVectorColumn, TpTableComputationExpression } from "../../util/table-computations/interface";
import { clearCachedTableAggregations } from "../tables/table-aggregations/cachedTableAggregations";
import { Dispatch } from "@reduxjs/toolkit";
import { findAttribute, getDataSourceGroupByPath } from "../../util/data-sources/dataSourceStructure";
import { createFilterMask } from "../../util/filters/helpers";
import { computeTransformation } from "./computeTransformation";
import { TpDataSource } from "../../util/data-sources/file-parsers/interface";
import { getDataSourceData } from "../../util/data-sources/file-parsers/sourceFileParser";
import { computeCtxAddDataTable, computeCtxAddDataTableColumn, computeCtxAddResourceAttributes, createComputeCtx, dataTypeComputation2Column } from "../../util/table-computations/helpers";




function getParentIdForComputedProperty(computeCtx: TpComputeContext, computation: TpTableComputationExpression): string | null {
    // Try to obtain a meaningful parent property id for a derived property. If not possible, return null
    const dependencies = getTableComputationExpressionDependencies(computeCtx, computation);
    if (dependencies.length == 1)
        return dependencies[0].id;
    else
        return getUniformStringValue(dependencies.map(dep => dep.parentColId));
}


function createTableOrigData(tableData: TpTableData) {
    // Sets apart a copy of the table data in order to be able to revert restrictions (which act on the tabla data itself)
    const columnValues: { [colId: string]: any } = {};
    for (const col of tableData.columns)
        if (col.values)
            columnValues[col.id] = col.values.slice(0); // this produces a deep copy of the array
    tableData.origData = {
        rowKeyIndexes: tableData.rowKeyIndexes.slice(),
        rowCount: tableData.rowCount,
        columnValues,
    }
}

function addNewPropertyGroupByName(tableData: TpTableData, groupName: string): string {
    // returns the id of the corresponding group
    const groupId = toValidIdentifier(groupName);
    const existingGroup = tableData.columnGroups.find(grp => grp.id == groupId);
    if (existingGroup) return existingGroup.id; // it already exists
    tableData.columnGroups.push({ id: groupId, name: groupName });
    return groupId;
}

function addNewColumn(tableData: TpTableData, id: string, name: string, parentColId: string | null, columnDataType: string): TpColumnData {

    console.log(`==> creating new computed column ${id} of type ${columnDataType}`);

    const newColumn: TpColumnData = {
        id: id,
        name: name,
        description: '',
        parentColId,
        values: null,
        subComponents: [],
        categoricalStatesList: [],
        dataType: columnDataType as any,
        cache: {},
        config: { decimalDigits: null, unitName: null, pixelSize: null },
    };

    tableData.columns.push(newColumn);
    tableData.columnsMap[newColumn.id] = newColumn;

    if (columnDataType == DT_VECTOR3D) {
        const colX = addNewColumn(tableData, `${id}_X`, `${name || id} - X`, id, DT_FLOAT);
        const colY = addNewColumn(tableData, `${id}_Y`, `${name || id} - Y`, id, DT_FLOAT);
        const colZ = addNewColumn(tableData, `${id}_Z`, `${name || id} - Z`, id, DT_FLOAT);
        newColumn.subComponents = [colX, colY, colZ];
    }

    return newColumn;
}


export function createOrUpdateDerivedProperty(resourceInfo: TpResourceInfo, tableData: TpTableData,
    id: string, name: string, parentGroupName: string | null, description: string, unitName: string, decimalDigits: number | null,
    computeCtx: TpComputeContext, computation: TpTableComputationExpression): TpColumnData {
    let computedColumn = tableData.columnsMap[id];
    let computedValues: any = null;
    let columnDataType = DT_VOID;
    if (computation.rootElement) {
        const pf = perfTimerStart();
        computedValues = evalTableComputationExpressionSync(computeCtx, computation);
        perfTimerStop(pf, "Computing derived column");
        columnDataType = dataTypeComputation2Column(computation.rootElement.outputType.dataType);
    }
    if (!computedColumn) {
        let parentColId: string | null = null;
        if (parentGroupName) parentColId = addNewPropertyGroupByName(tableData, parentGroupName);
        if (!parentColId)
            parentColId = getParentIdForComputedProperty(computeCtx, computation);
        computedColumn = addNewColumn(tableData, id, name, parentColId, columnDataType);
    }

    function updateOrigData(column: TpColumnData) {
        if (tableData.origData)
            tableData.origData.columnValues[column.id] = column.values.slice(0);
    }

    if (columnDataType == DT_VECTOR3D) {
        computedColumn.subComponents[0].values = (computedValues as TpComputeDataVectorColumn).x;
        computedColumn.subComponents[1].values = (computedValues as TpComputeDataVectorColumn).y;
        computedColumn.subComponents[2].values = (computedValues as TpComputeDataVectorColumn).z;
        updateOrigData(computedColumn.subComponents[0]);
        updateOrigData(computedColumn.subComponents[1]);
        updateOrigData(computedColumn.subComponents[2]);
        computedColumn.subComponents[0].cache = {};
        computedColumn.subComponents[1].cache = {};
        computedColumn.subComponents[2].cache = {};
    } else {
        assignColumData(computedColumn, computedValues);
        updateOrigData(computedColumn);
    }
    computedColumn.dataType = columnDataType as any;
    computedColumn.name = name || id;
    computedColumn.description = description;
    computedColumn.config.unitName = unitName;
    computedColumn.config.decimalDigits = decimalDigits;
    computedColumn.cache = {}; // note: we clear the cache because the values were changed!
    if (columnDataType == DT_BOOLEAN)
        computedColumn.categoricalStatesList = ['False', 'True'];
    clearCachedTableAggregations(tableData);
    return computedColumn;
}


function createDerivedProperties(resourceInfo: TpResourceInfo, tableData: TpTableData, computationRecipes: TpComputationRecipe[]) {
    try {
        const computeCtx = createComputeCtx(COMPUTATION_TYPES.OUTPUT_COLUMN);
        computeCtxAddDataTable(computeCtx, tableData, false, false);
        computeCtxAddResourceAttributes(computeCtx, resourceInfo);

        for (const recipe of computationRecipes) {
            if (tableData.columnsMap[recipe.id]) throw createInternalError(`Duplicate derived column id: ${recipe.id}`);
            const computation = parseTableComputationExpression(
                computeCtx,
                recipe.expression,
                (issue: TpIssue) => { tableData.issues.push(issue) }
            );
            const computedColumn = createOrUpdateDerivedProperty(resourceInfo, tableData, 
                recipe.id, recipe.name, recipe.groupName || null, recipe.description, recipe.unitName, recipe.decimalDigits,
                computeCtx, computation);
            computeCtxAddDataTableColumn(computeCtx, tableData, computedColumn, false, false);
        }
    } catch (e) {
        logException(e);
    }
}


export function processLoadedTable(resourceInfo: TpResourceInfo, tableData: TpTableData, dispatch: Dispatch) {
    if (resourceInfo.renderTemplate?.computationRecipes && resourceInfo.renderTemplate?.computationRecipes[tableData.id]) {
        createDerivedProperties(resourceInfo, tableData, resourceInfo.renderTemplate?.computationRecipes[tableData.id]);
    }
    createTableOrigData(tableData);
    console.log(`==>  Table data processed: ${tableData.id} | ${tableData.rowCount / 1000}k rows`);
    dispatch(_setLoadedTableCompleted({ uri: tableData.tableUri }));
    _setCachedTableData(tableData)
}


export function assignColumData(column: TpColumnData, data: any) {
    if (column.dataType != DT_CATEGORICAL)
        column.values = data;
    else {
        type TpState = { value: string; count: number; };
        const countMap = new Map<string, number>();
        for (const str of data) countMap.set(str, (countMap.get(str) || 0) + 1);
        const result: TpState[] = Array.from(countMap.entries()).map(([value, count]) => ({ value, count }));
        result.sort((a, b) => b.count - a.count);
        column.categoricalStatesList = result.map(state => state.value);
        const state2IndexMap: { [value: string]: number } = {};
        for (let idx = 0; idx < result.length; idx++)
            state2IndexMap[result[idx].value] = idx;
        column.values = new Uint32Array(data.length);
        for (let i = 0; i < data.length; i++)
            column.values[i] = state2IndexMap[data[i]];
    }
}




export function useLoadTableFromDataSource() {
    const config = useConfig();
    const dispatch = useDispatch();


    return (resourceInfo: TpResourceInfo, tableId: string, dataSource: TpDataSource): TpTableData | null => {
        try {
            const tableUri = `${resourceInfo.uri}.${tableId}`;
            dispatch(_addLoadedTable({ uri: tableUri }));

            // We convert table path names to more standard ids (e.g. without /)
            const tablePath = id2Path(tableId);

            const conceptInfo = getConcept(config, resourceInfo.conceptId);
            const tableConcept = conceptInfo.tableConcepts.find(tableConcept => tableConcept.path == tablePath);
            if (!tableConcept) throw createConfigError(`Table concept not found: ${tableId}`);

            const sourceGroup = getDataSourceGroupByPath(dataSource, tablePath);

            // We aggressively assume that the first dim of the shape of the first member data set contains the right number of rows
            const rowCount = sourceGroup.memberData[0].shape[0];

            const tableData: TpTableData = {
                id: tableId,
                name: tableConcept.namePlural || tableId,
                description: tableConcept.description,
                tableUri: tableUri,
                rowCount,
                labelColumnId: tableConcept.labelColumnPath ? path2Id(tableConcept.labelColumnPath, tablePath) : null,
                rowKeyIndexes: createRowKeyIndexes(rowCount),
                columnGroups: structuredClone(tableConcept.propertyGroups),
                columns: [],
                columnsMap: {},
                currentfilterMask: createFilterMask(rowCount, true),
                currentFilterCount: 0,
                filterStepsData: {},
                issues: [],
            };

            for (const prop of tableConcept.properties) {
                const dataSet = sourceGroup.memberData.find(member => member.path == prop.path);
                if (!dataSet) throw createConfigError(`Data set not found: ${prop.path}`);
                const data = getDataSourceData(dataSource, prop.path);

                // We convert property path names to more standard ids (e.g. without /)
                let propId = path2Id(prop.path, tablePath);

                const decimalDigits = (prop.decimalDigits != null) && (prop.decimalDigits != undefined) ? prop.decimalDigits : null;
                const unitName: string | null = prop.unitName || findAttribute(dataSet, "unit")?.value || null;

                const pixelSizeAttrib = findAttribute(dataSet, 'pixel_size');

                const pixelSize = pixelSizeAttrib ? Number(pixelSizeAttrib.value) : null;

                const column: TpColumnData = {
                    id: propId,
                    name: prop.name,
                    parentColId: prop.groupId,
                    description: prop.description,
                    dataType: prop.dataType as any,
                    values: null,
                    categoricalStatesList: [],
                    config: { decimalDigits, unitName, pixelSize },
                    cache: {},
                    subComponents: [],
                };
                if (prop.children.length == 0)
                    assignColumData(column, data);
                computeTransformation(dataSource, prop, column);
                tableData.columns.push(column);

                for (const child of prop.children) {
                    const partialData = createDataArray(rowCount, child.dataType);
                    const sliceLen = prop.totalChildCount!;
                    for (let i = child.index, j = 0; i < data.length; i += sliceLen, j++) partialData[j] = data[i];
                    const childColumn: TpColumnData = {
                        id: `${propId}_${child.index}`,
                        name: child.name,
                        description: prop.description,
                        parentColId: propId,
                        dataType: child.dataType as any,
                        values: null,
                        categoricalStatesList: [],
                        config: { decimalDigits, unitName, pixelSize: null },
                        cache: {},
                        subComponents: [],
                    };
                    assignColumData(childColumn, partialData);
                    computeTransformation(dataSource, prop, childColumn);
                    column.subComponents.push(childColumn);
                    tableData.columns.push(childColumn);
                }

            }

            for (const col of tableData.columns) tableData.columnsMap[col.id] = col;

            return tableData;

        } catch (ex) {
            reportException(ex);
            return null;
        };
    }

}
