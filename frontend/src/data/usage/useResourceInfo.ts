import { useEffect, useState } from "react";
import { getConcept, useConfig } from "../helpers";
import { LOAD_STATUS, TpIssue, TpResourceInfo } from "../interfaces";
import { useActiveResourcesStorage } from "./useActiveResourcesStorage";
import { useLoadTableFromDataSource, processLoadedTable } from "./useLoadTable";
import { useLocalResourcesStorage } from "./useLocalResourcesStorage";
import { useTablesStorage } from "./useTablesStorage";
import { locDb } from "../local-database/localDatabase";
import { createConfigError, createInternalError, reportException } from "../../util/errors";
import { closeSourceFile, openSourceFileFromBuffer } from "../../util/data-sources/file-parsers/sourceFileParser";
import { useDispatch } from "react-redux";
import { TpTableData } from "../tables/interface";
import { TpDataSource } from "../../util/data-sources/file-parsers/interface";
import { TpConfigData } from "../store/configSlice";
import { computeCtxAddDataTable, createComputeCtx } from "../../util/table-computations/helpers";
import { evalTableComputationExpressionSync, parseTableComputationExpression } from "../../util/table-computations/tableComputationExpression";
import { addDataSourceAttribsToComputeCtx } from "../../features/import-resource/prompt-globlal-attribute/PromptGlobalAttribute";
import { COMPUTATION_TYPES } from "../../util/table-computations/interface";


function getTableUri(resourceInfo: TpResourceInfo, tableId: string): string {
    return `${resourceInfo.uri}.${tableId}`
}


function computeResourceGlobalAttributes(config: TpConfigData, resourceInfo: TpResourceInfo, sourceFile: TpDataSource, tableDatas: TpTableData[]): TpResourceInfo {
    const updatedResourceInfo = structuredClone(resourceInfo);

    const conceptInfo = getConcept(config, resourceInfo.conceptId);

    const computeCtx = createComputeCtx(COMPUTATION_TYPES.OUTPUT_SCALAR);
    for (const table of tableDatas) {
        computeCtxAddDataTable(computeCtx, table, true, false)
    }

    addDataSourceAttribsToComputeCtx(computeCtx, sourceFile);

    for (const attribDef of conceptInfo.globalAttributeDefs) {
        const computation = parseTableComputationExpression(
            computeCtx,
            attribDef.expression,
            (issue: TpIssue) => {
                updatedResourceInfo.issues.push({
                    severity: issue.severity,
                    message: `Error parsing attribute ${attribDef.identifier}: ${issue.message} (expression: ${attribDef.expression})`
                });
            }
        );

        if (computation.rootElement) {
            let computedValue = evalTableComputationExpressionSync(computeCtx, computation);
            updatedResourceInfo.globalAttributes.push({
                identifier: attribDef.identifier,
                outputType: computation.rootElement!.outputType,
                value: computedValue,
            });
        }
    }

    return updatedResourceInfo;
}

export function useResourceInfo(uri: string): TpResourceInfo | null {
    // Fetches the resource info, makes sure it is part of the active resources
    // and fetches the table data that is either part of this resource or declared be needed from a related resource

    const config = useConfig();
    const loadTableFromDataSource = useLoadTableFromDataSource();
    const tablesStorage = useTablesStorage();
    const activeResourcesStorage = useActiveResourcesStorage();
    const localResourcesStorage = useLocalResourcesStorage();
    const dispatch = useDispatch();

    const [resourceInfo, setResourceInfo] = useState<TpResourceInfo | null>(null);

    function getFullResourceInfo(): Promise<TpResourceInfo> {
        if (!resourceInfo!.isLocal) throw createInternalError(`Only local resources are supported`);
        const localResource = structuredClone(localResourcesStorage.getResource(uri));
        localResource.status = LOAD_STATUS.PRESENT;
        console.log(`==> Loaded resource info: ${JSON.stringify(localResource)}`);
        return Promise.resolve(localResource);
    }

    try {

        // We make sure that the resource is part of the set of active resources
        if (!activeResourcesStorage.hasActiveResource(uri)) {
            setTimeout(() => {
                if (uri) activeResourcesStorage.addActiveResource(uri, `[${uri}]`, '', true);
            }, 25);
        } else {
            if (resourceInfo != activeResourcesStorage.getActiveResource(uri))
                setResourceInfo(activeResourcesStorage.getActiveResource(uri));
        }

        useEffect(() => {
            // If necessary, we fetch the resource information
            if (resourceInfo && (resourceInfo!.status == LOAD_STATUS.ABSENT)) {
                getFullResourceInfo().then((fetchedResourceInfo: TpResourceInfo) => {
                    activeResourcesStorage.updateActiveResource(fetchedResourceInfo, config);
                })
            }
            if (resourceInfo && (resourceInfo!.status == LOAD_STATUS.PRESENT)) {
                // We make sure all the needed table data is fetched
                const neededTableIds: string[] = resourceInfo.tables.map(table => table.id);

                if (!resourceInfo.isLocal) throw createInternalError(`Only local resources are supported`);

                let needLoadTables = false;
                for (const tableId of neededTableIds) {
                    const tableInfo = tablesStorage.findTableInfo(getTableUri(resourceInfo, tableId));
                    if ((!tableInfo) || (tableInfo.status == LOAD_STATUS.ABSENT))
                        needLoadTables = true;
                }
                if (needLoadTables) {
                    const sourceFileType = (resourceInfo as TpResourceInfo).dataSourceType;
                    locDb.loadResourceSourceData(resourceInfo.uri).then(data => {
                        if (!data) reportException(createConfigError("Could not fetch resource data"));
                        console.log(`==> resource data fetched`);
                        const sourceFile = openSourceFileFromBuffer(sourceFileType, resourceInfo.uri, data!);
                        if (sourceFile.error) reportException(createConfigError(sourceFile.error));
                        console.log(`==> resource data opened`);
                        const tableDataList = [];
                        for (const tableId of neededTableIds) {
                            const tableInfo = tablesStorage.findTableInfo(getTableUri(resourceInfo, tableId));
                            if ((!tableInfo) || (tableInfo.status == LOAD_STATUS.ABSENT)) {
                                const loadedTableData = loadTableFromDataSource(resourceInfo, tableId, sourceFile);
                                if (loadedTableData) tableDataList.push(loadedTableData)
                            }
                        }
                        const updatedResourceInfo = computeResourceGlobalAttributes(config, resourceInfo, sourceFile, tableDataList);
                        setResourceInfo(updatedResourceInfo);
                        activeResourcesStorage.updateActiveResource(updatedResourceInfo, config); // udate needed to save the computed attribs
                        // NOTE: we process the table data after loading all tables and computing global resource attributes, because derived table properties can use those resource attributes
                        for (const tableData of tableDataList)
                            processLoadedTable(updatedResourceInfo, tableData, dispatch);
                        closeSourceFile(sourceFile);
                    });
                }

            }
        }, [uri, resourceInfo?.conceptId]);

        return resourceInfo;
    }
    catch (e) {
        reportException(e);
        return null;
    }
}
