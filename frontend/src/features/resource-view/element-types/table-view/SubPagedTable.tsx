import { isNumericalDataType, TpColumnData } from "../../../../data/tables/interface";
import { tableValue2DispString } from "../../../../data/tables/table";
import { count2DisplayString, highlightToken } from "../../../../util/misc";
import { TpResourceRenderContext } from "../interface";

import styles from './TableView.module.scss';
import { _addFilter } from "../../../../data/store/loadedTablesSlice";
import { TpDataWidgetCtx } from "../../data-widget/interface";
import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TpColumnDefinition } from "./TableView";
import { usePrevious } from "../../../../util/hooks";



interface TpProps {
    columns: TpColumnDefinition[];
    filterSortedIdxs: number[];
    pageSize: number;
    title: string;
    renderUid: string;
    searchFields: any;
    searchFieldValues: { [colId: string]: (string | null) };
    applyManualFilter: (selectedRows: number[]) => void;
    rowClicked: (rowIdx: number) => void;
}


export function SubPagedTable(props: TpProps) {
    const { columns, filterSortedIdxs, pageSize, title, renderUid, searchFields, searchFieldValues, applyManualFilter, rowClicked } = props;

    const [pageOffset, setPageOffset] = useState(0);

    const [selectedRows, setSelectedRows] = useState<number[]>([]);

    if (renderUid != usePrevious(renderUid)) {
        // This is a dirty trick to reset the paging as soon as any input prop was changed
        // It will be re-rendered with another renderUid, and this triggers a reset of the pager
        if (pageOffset > 0)
            setTimeout(() => { setPageOffset(0) }, 25);
    }

    const rowCount = filterSortedIdxs.length;

    function getColTitle(col: TpColumnDefinition): string {
        return col.colInfo.name + (col.colInfo.config.unitName ?  ` (${col.colInfo.config.unitName})`: '');
    }

    function getCellString(colInfo: TpColumnData, value: any): any {
        let rs = tableValue2DispString(colInfo, value, false);
        const searchField = searchFieldValues[colInfo.id];
        if (searchField)
            rs = highlightToken(rs, searchField, styles.highlight);
        return rs;
    }

    function renderRowCheck(rowIdx: number): any {
        if (selectedRows.indexOf(rowIdx) < 0) {
            return (<div className={styles.selectionBoxUnsel}
                onClick={(ev) => {
                    setSelectedRows([...selectedRows, rowIdx]);
                    ev.stopPropagation();
                 }}
            >
                <FontAwesomeIcon icon="circle" />
            </div>)
        } else {
            return (<div className={styles.selectionBoxSel}
                onClick={(ev) => { 
                    setSelectedRows(selectedRows.filter(idx => idx != rowIdx));
                    ev.stopPropagation();
                 }}
            >
                <FontAwesomeIcon icon="circle-check" />
            </div>)
        }
    }


    const tableHeader = (
        <tr key="_header">
            <td key="_sel" style={{ width: `60px` }}>
                {(selectedRows.length > 0) && (
                    <div style={{ background: "var(--color-sp2)", color: "var(--color-bg3)", display: "inline-block", padding: "0 5px", borderRadius: "4px", cursor: "pointer" }}
                        onClick={() => { applyManualFilter(selectedRows); setSelectedRows([]) }}>
                        <FontAwesomeIcon icon="filter" />
                    </div>
                )}
                {(selectedRows.length > 0) && (
                    <div style={{ color: "var(--color-sp2)", display: "inline-block", paddingLeft: "5px", cursor: "pointer" }}
                        onClick={() => { setSelectedRows([]) }}>
                        <FontAwesomeIcon icon="times" />
                    </div>
                )}
            </td>
            {columns.map(col => (
                <td key={col.id} style={{ width: `${col.width}px` }}><div className={styles.twoLines}>{getColTitle(col)}</div></td>
            ))}
        </tr >
    )

    const tableRows: any[] = [];

    const colStyle: { [id: string]: any } = {};
    for (const col of columns) {
        const style: any = {};
        if (isNumericalDataType(col.colInfo.dataType)) style.textAlign = "right";
        colStyle[col.id] = style;
    }

    for (let idx = 0; idx < pageSize; idx++) {
        const rowIdxInFilter = pageOffset + idx;
        if ((rowIdxInFilter >= 0) && (rowIdxInFilter < rowCount)) {
            const rowIdx = filterSortedIdxs[rowIdxInFilter];
            const row = (
                <tr
                    key={`idx_${rowIdx}`}
                    onClick={()=> rowClicked(rowIdx)}
                >
                    <td key="_sel">
                        {renderRowCheck(rowIdx)}
                    </td>
                    {columns.map(col => (
                        <td key={col.colInfo.id} style={colStyle[col.id]}>
                            <div className={styles.cell}>
                                {getCellString(col.colInfo, col.colInfo.values && col.colInfo.values[rowIdx])}
                            </div>
                        </td>
                    ))}
                </tr>
            );
            tableRows.push(row);
        } else { // make an empty row
            tableRows.push(<tr key={`idx_extra_${idx}`}>
                {columns.map(col => (
                    <td key={col.colInfo.id} style={colStyle[col.id]}>
                        <div className={styles.cell}>&nbsp;</div>
                    </td>
                ))}
            </tr>);
        }
    }

    if (pageSize == 0) return null;

    let totalColWidth = 0;
    for (const col of columns) totalColWidth += col.width;

    const theTable = (
        <table style={{ width: `${totalColWidth}px` }}>
            <thead>
                {tableHeader}
            </thead>
            <tbody>
                {tableRows}
                <tr className={styles.searchRow}>{searchFields}</tr>

            </tbody>
        </table>
    )

    const firstIndex = Math.max(0, Math.min(rowCount - 1, pageOffset));
    const lastIndex = Math.max(0, Math.min(rowCount - 1, pageOffset + pageSize - 1));

    return (
        <div className={styles.wrapper}>
            <div>
                <div className={styles.pagerWrapper} >
                    <div style={{ display: 'inline-block' }}>
                        <button style={{ paddingLeft: "0" }}
                            onClick={() => { setPageOffset(Math.max(0, pageOffset - pageSize)) }}
                        >
                            <FontAwesomeIcon icon="caret-up" />
                        </button>
                        <button style={{ paddingRight: "0" }}
                            onClick={() => {
                                if (pageOffset + pageSize < rowCount)
                                    setPageOffset(Math.min(rowCount - 1, pageOffset + pageSize))
                            }}
                        >
                            <FontAwesomeIcon icon="caret-down" />
                        </button>
                    </div>
                    <div className={styles.pagerText}>
                        {firstIndex + 1}-{lastIndex + 1} / {count2DisplayString(rowCount)}
                    </div>
                </div>
                <div className={styles.title}>{title}</div>
            </div>
            {(columns.length == 0) && (
                <div style={{ textAlign: 'center' }}>No columns selected to display</div>
            )}
            <div className={styles.tableWrapper}>
                {theTable}
            </div>
        </div>
    )
}