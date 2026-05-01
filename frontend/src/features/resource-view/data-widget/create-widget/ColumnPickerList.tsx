import { TpColumnData, TpTableData } from "../../../../data/tables/interface";
import { CopyClipboardButton } from "../../../../util/components/buttons/copy-clipboard-button/CopyClipboardButton";
import InfoTooltip from "../../../../util/components/info-tooltip/InfoTooltip";
import { createInternalError } from "../../../../util/errors";
import { guid } from "../../../../util/misc";

import styles from './PromptCreateWidget.module.scss';

interface TpColumnTreeBranch {
    element: any;
    level: number,
    children: TpColumnTreeBranch[];
}

interface TpProps {
    dataTable: TpTableData;
    singleSelectedColumn: string | null;
    multiSelectedColumns: string[];
    showIdentifiers?: boolean;
    isColumnCompatible?: (colInfo: TpColumnData) => boolean;
    onClickColumn?: (colId: string) => void;
}

export function ColumnPickerList(props: TpProps) {

    const itemHeight = 24;
    const xOffset = 20;
    const xIndent = 15;
    const treeBranchColor = 'rgba(255,255,255,0.25)';

    const { dataTable, multiSelectedColumns, singleSelectedColumn, isColumnCompatible, onClickColumn, showIdentifiers } = props;

    const usedColumnsMap: { [colId: string]: boolean } = {};

    function renderColumn(col: TpColumnData, level: number): any {
        if (usedColumnsMap[col.id]) throw createInternalError("This should not have happened");
        usedColumnsMap[col.id] = true;
        const selIdx = multiSelectedColumns.indexOf(col.id);
        const isCompatible = !(isColumnCompatible && !isColumnCompatible(col));
        return (
            <div
                key={`col_${col.id}`}
                className={col.id == singleSelectedColumn ? styles.columnSelected : (isCompatible ? styles.column : styles.columnDisabled)}
                onClick={(ev) => {
                    if (isCompatible && onClickColumn) {
                        onClickColumn(col.id);
                        ev.stopPropagation();
                    }
                }}
                style={{ paddingLeft: xOffset + level * xIndent }}
            >
                {(selIdx >= 0) && <div className={styles.colSelIndicator} style={{ left: xOffset + (level - 1) * xIndent - 15 }}>{selIdx + 1}</div>}
                {showIdentifiers && (
                    <>
                        <CopyClipboardButton content={col.id} />
                        <span className={styles.identifier}>{col.id}&nbsp;</span>
                    </>
                )}
                {col.name}
                <InfoTooltip>
                    <>
                        <span className={styles.dataType}>{col.dataType}</span> {col.config.unitName}
                        {col.description}
                    </>
                </InfoTooltip>
                <div style={{ position: 'absolute', top: itemHeight / 2, left: xOffset + (level - 1) * xIndent - 6, width: xIndent, height: 1, backgroundColor: treeBranchColor }} />
            </div>
        );
    }

    const root: TpColumnTreeBranch = {
        element: (
            <div
                key={`group_root`}
                className={styles.group}
                style={{ paddingLeft: xOffset + 0 * xIndent }}
            >
                Properties
            </div>
        ),
        level: 0,
        children: [],

    };

    function createChildrenOf(groupId: string, level: number): TpColumnTreeBranch[] {
        const children: TpColumnTreeBranch[] = [];
        for (const col of dataTable.columns)
            if ((!usedColumnsMap[col.id]) && (col.parentColId == groupId)) children.push({
                element: renderColumn(col, level),
                level,
                children: createChildrenOf(col.id, level + 1),
            });
        return children;
    }

    // Render all groups and columns that belong to groups
    for (const group of dataTable.columnGroups) {
        root.children.push({
            element: (
                <div
                    key={`group_${group.id}`}
                    className={styles.group}
                    style={{ paddingLeft: xOffset + 1 * xIndent }}
                >
                    {group.name}
                    <div style={{ position: 'absolute', top: itemHeight / 2, left: xOffset + (1 - 1) * xIndent - 6, width: xIndent, height: 1, backgroundColor: treeBranchColor }} />
                </div>
            ),
            level: 1,
            children: createChildrenOf(group.id, 2),
        });
    }

    // Render all remaining columns that were not part of a group
    for (const col of dataTable.columns) {
        if (!usedColumnsMap[col.id]) root.children.push({
            element: renderColumn(col, 1),
            level: 1,
            children: createChildrenOf(col.id, 2),
        });
    }

    const elemList: any[] = [];
    const treeLinesList: any[] = [];

    let currentIndex = 0;
    function addElems(branch: TpColumnTreeBranch): number {
        elemList.push(branch.element);
        currentIndex += 1;
        const lineStartIndex = currentIndex;
        let lastChildIndex = 0;
        for (const child of branch.children)
            lastChildIndex = addElems(child);

        treeLinesList.push(<div key={guid()} style={{
            position: 'absolute',
            top: lineStartIndex * itemHeight - itemHeight / 2,
            left: xOffset + branch.level * xIndent - 6,
            width: 1,
            height: (lastChildIndex - lineStartIndex) * itemHeight,
            backgroundColor: treeBranchColor,
        }} />);
        return lineStartIndex;
    }
    addElems(root);

    return (<div key={dataTable.id} >
        <div style={{ height: '10px' }} />
        <div style={{ position: 'relative' }}>
            {elemList}
            {treeLinesList}
        </div>
        <div style={{ height: '10px' }} />
    </div>);
}
