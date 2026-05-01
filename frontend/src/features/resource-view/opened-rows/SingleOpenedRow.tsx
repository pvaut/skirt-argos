import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getTableColumn, getTableRowKeyIndex2Label, hasTableColumn, tableValue2DispString } from "../../../data/tables/table";
import { TpOpenedRowInfo, useActiveResourcesStorage } from "../../../data/usage/useActiveResourcesStorage";
import { TpTableStorage } from "../../../data/usage/useTablesStorage";
import { TpResourceRenderContext } from "../element-types/interface";

import styles from './OpenedRows.module.scss';
import { act } from "react";
import { TpDashboardAction, TpIssue } from "../../../data/interfaces";
import { computeCtxAddDataTable, computeCtxAddResourceAttributes, computeCtxSetTableRowIdx, createComputeCtx } from "../../../util/table-computations/helpers";
import { COMPUTATION_TYPES } from "../../../util/table-computations/interface";
import { evalTableComputationExpressionAsync, parseTableComputationExpression } from "../../../util/table-computations/tableComputationExpression";
import { createUserError, reportException } from "../../../util/errors";
import { useNavigate } from "react-router-dom";
import { TpColumnData } from "../../../data/tables/interface";
import { findColumn } from "@uiw/react-codemirror";


interface TpProps {
    resourceRenderCtx: TpResourceRenderContext,
    tablesStorage: TpTableStorage;
    row: TpOpenedRowInfo;
}


export function SingleOpenedRow({ resourceRenderCtx, tablesStorage, row }: TpProps): any {
    const rowKeyIndex = row.rowKeyIndex;
    const tableData = tablesStorage.getTableData(row.tableUri);
    const rowLabelFunc = getTableRowKeyIndex2Label(tableData);

    const navigate = useNavigate();

    let actions: TpDashboardAction[] = [];
    if (resourceRenderCtx.resourceInfo.renderTemplate?.actions)
        actions = resourceRenderCtx.resourceInfo.renderTemplate!.actions!
            .filter(action => action.targetTableId == tableData.id);

    function executeAction(action: TpDashboardAction) {
        const computeCtx = createComputeCtx(COMPUTATION_TYPES.NO_OUTPUT);
        computeCtx.env = {
            resourceInfo: resourceRenderCtx.resourceInfo,
            navigate,
        };
        computeCtxAddResourceAttributes(computeCtx, resourceRenderCtx.resourceInfo);
        computeCtxAddDataTable(computeCtx, tableData, false, true);
        computeCtxSetTableRowIdx(computeCtx, tableData.id, rowKeyIndex);
        console.log(`==> Starting single row action id=${action.id} name=${action.name}`);
        try {
            const expr = parseTableComputationExpression(computeCtx, action.actionDef, (issue: TpIssue) => { throw createUserError(issue.message) })
            evalTableComputationExpressionAsync(computeCtx, expr);
        } catch (e) {
            reportException(e);
        }
    }

    function renderProp(col: TpColumnData) {
        return (
            <div key={col.id} className={styles.col}>
                <div className={styles.colName}>
                    {col.name}
                </div>
                <div className={styles.colContent}>
                    {tableData.origData!.columnValues[col.id] && tableValue2DispString(col, tableData.origData!.columnValues[col.id][rowKeyIndex], true)}
                </div>
            </div>
        );
    }

    function colIsPartOfGroup(col: TpColumnData, groupId: string) {
        if (col.parentColId == groupId) return true;
        if (col.parentColId) {
            if (hasTableColumn(tableData, col.parentColId)) {
                if (getTableColumn(tableData, col.parentColId).parentColId == groupId) return true;
            }
        }
        return false;
    }

    function colIsPartOfNoGroup(col: TpColumnData, ) {
        if (!col.parentColId) return true;
        if (col.parentColId) {
            if (hasTableColumn(tableData, col.parentColId)) {
                if (!getTableColumn(tableData, col.parentColId).parentColId) return true;
            }
        }
        return false;
    }

    const usedColumnsMap: { [colId: string]: boolean } = {};
    const propElems = [];
    // Render all groups and columns that belong to groups
    for (const group of tableData.columnGroups) {
        propElems.push(
            <div key={group.id}>
                <div className={styles.group}>{group.name}</div>
                {
                    tableData.columns.filter(col => colIsPartOfGroup(col, group.id)).map(col => renderProp(col))
                }
            </div>
        )
    }
    // Render props not part of a group
    if (tableData.columns.filter(col => !col.parentColId).length > 0) {
        propElems.push(
            <div key='other'>
                {(tableData.columnGroups.length > 0) && <div className={styles.group}>Other</div>}
                {
                    tableData.columns.filter(col => colIsPartOfNoGroup(col)).map(col => renderProp(col))
                }
            </div>
        )
    }



    return (
        <div key={`${row.tableUri}_${row.rowKeyIndex}`} style={{ position: 'relative' }}>
            <div className={styles.rowTitle}>
                {rowLabelFunc(rowKeyIndex)}
            </div>
            {actions.length > 0 && (
                <div style={{ paddingBottom: '10px' }}>
                    {actions.map(action => (
                        <div key={action.id} style={{ display: 'inline-block' }}>
                            <button className={styles.actionButton}
                                onClick={() => executeAction(action)}
                            >
                                {action.name}
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <div>
                {propElems}
                {/* {tableData.columns.map(col => renderProp(col))} */}
            </div>
            <div
                className={styles.rowCloseButton}
                onClick={() => resourceRenderCtx.closeOpenedRow(row.tableUri, row.rowKeyIndex)}
            >
                <FontAwesomeIcon icon="times" />
            </div>
        </div>
    );
}
