import { DT_CATEGORICAL, DT_STRING, isNumericalDataType, TpColumnData } from "../../../../data/tables/interface";
import { getTableColumn, hasTableColumn, tableValue2DispString } from "../../../../data/tables/table";
import Loader from "../../../../util/components/loader/Loader";
import { count2DisplayString, guid, perfTimerStart, perfTimerStop, useDebounceInComponent } from "../../../../util/misc";
import { RenderElement } from "../elementsFactory";
import { getVisualSetup, TpVisualSetup } from "../helpers/helpers";
import { TpElemProps, TpResourceRenderContext } from "../interface";

import styles from './TableView.module.scss';
import { _addFilter } from "../../../../data/store/loadedTablesSlice";
import { useTablesStorage } from "../../../../data/usage/useTablesStorage";
import { filterTypeCategorical } from "../../../../util/filters/filter-types/filterTypeCategorical";
import { TpFilterInstance } from "../../../../util/filters/interfaces";
import { findCategoricalFilter } from "../../../../util/filters/helpers";
import { TpDataWidgetCtx } from "../../data-widget/interface";
import { tableViewDefinition } from "./tableViewDefinition";
import { useCallback, useEffect, useRef, useState } from "react";
import { getConcept, useConfig } from "../../../../data/helpers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { SubPagedTable } from "./SubPagedTable";
import { SearchField } from "../../../../util/components/search-field/SearchField";
import { addCurrentObservedElement, delCurrentObservedElement, useResizedCompRedraw } from "../../../../util/resizeObserverHook";
import { filterTypeManual } from "../../../../util/filters/filter-types/filterTypeManual";



function fastArgsortNumerical(origIndexes: number[], values: number[]): number[] {
    const sortedIndices = origIndexes.slice();
    sortedIndices.sort((a, b) => (values[a] - values[b]));
    return sortedIndices;
}


function fastArgsortNumericalDesc(origIndexes: number[], values: number[]): number[] {
    const sortedIndices = origIndexes.slice();
    sortedIndices.sort((a, b) => (values[b] - values[a]));
    return sortedIndices;
}


function fastArgsortString(origIndexes: number[], values: string[]): number[] {
    const sortedIndices = origIndexes.slice();
    // NOTE: for speed reasons, we don't use localeCompare!
    sortedIndices.sort((a, b) => (values[a] < values[b] ? -1 : (values[a] > values[b] ? 1 : 0)));
    return sortedIndices;
}


function fastArgsortStringDesc(origIndexes: number[], values: string[]): number[] {
    const sortedIndices = origIndexes.slice();
    // NOTE: for speed reasons, we don't use localeCompare!
    sortedIndices.sort((b, a) => (values[a] < values[b] ? -1 : (values[a] > values[b] ? 1 : 0)));
    return sortedIndices;
}


export interface TpColumnDefinition {
    id: string;
    colInfo: TpColumnData;
    width: number;
}


interface TpProps {
    resourceRenderCtx: TpResourceRenderContext,
    elemDef: any,
    dataWidgetCtx: TpDataWidgetCtx;
}


export function TableView(props: TpProps) {
    const { resourceRenderCtx, elemDef } = props;
    const loadedTables = useTablesStorage(); // NOTE: calling useTablesStorage is needed to refesh on updates of filtering

    const [searchFieldValues, setSearchFieldValues] = useState<{ [colId: string]: (string | null) }>({});

    const config = useConfig();

    const wrapperRef = useRef<HTMLDivElement>(null);
    useResizedCompRedraw(wrapperRef, 200, false);

    const visualSetup = getVisualSetup(resourceRenderCtx, tableViewDefinition.channels, tableViewDefinition.configSettings, elemDef);
    if (!visualSetup) return <div><Loader paddingTop={30}/></div>;
    const tableData = visualSetup.tableData;
    const concept = getConcept(config, resourceRenderCtx.resourceInfo.conceptId);

    const columnDefsInp = elemDef.settings?.columns || [];
    const columns: TpColumnDefinition[] = columnDefsInp.filter((colDef:any) => hasTableColumn(tableData, colDef.id)).map((colDef: any) => ({
        id: colDef.id,
        colInfo: getTableColumn(tableData, colDef.id),
        width: colDef.width || 100,
    }));

    let pageSize = 0;
    if (wrapperRef.current) {
        pageSize = Math.floor((wrapperRef.current.clientHeight - 150) / 25);
    }

    //const pf0 = perfTimerStart();
    let hasSearchFieldValues = false;
    const filterIdxs: number[] = [];
    for (const col of columns) if (searchFieldValues[col.id]) hasSearchFieldValues = true
    if (hasSearchFieldValues) {
        for (let i = 0; i < tableData.rowCount; i++)
            if (tableData.currentfilterMask[i]) {
                // evaluate extra text search filters
                let included = true;
                for (const col of columns)
                    if (searchFieldValues[col.id]) {
                        // Note: we do not perform case insensitive search via toLocaleLowerCase() because this seems to slow things down a lot on Safari
                        if (!tableValue2DispString(col.colInfo, col.colInfo.values[i], false).toLowerCase().includes(searchFieldValues[col.id]!.toLowerCase()))
                            included = false;
                    }
                if (included)
                    filterIdxs.push(i);
            }
    } else {
        for (let i = 0; i < tableData.rowCount; i++)
            if (tableData.currentfilterMask[i])
                filterIdxs.push(i);
    }
    //perfTimerStop(pf0, `Filtering table`);

    let filterSortedIdxs = filterIdxs;
    const sortByField = visualSetup.channelEncodings.sortBy;
    if (sortByField) {
        const sortDesc = visualSetup.configSettings.sortDir == 'desc';
        //const pf = perfTimerStart();
        if (isNumericalDataType(sortByField.dataType)) {
            if (!sortDesc)
                filterSortedIdxs = fastArgsortNumerical(filterIdxs, sortByField.values);
            else
                filterSortedIdxs = fastArgsortNumericalDesc(filterIdxs, sortByField.values);
        } else {
            let toSortValues = sortByField.values;
            if (sortByField.dataType == DT_CATEGORICAL) {
                toSortValues = (Array.from(toSortValues)).map((val: any) => tableValue2DispString(sortByField, val, false));
            }
            if (!sortDesc)
                filterSortedIdxs = fastArgsortString(filterIdxs, toSortValues);
            else
                filterSortedIdxs = fastArgsortStringDesc(filterIdxs, toSortValues);
        }
        //perfTimerStop(pf, `Sorting table by ${sortByField.id} - size=${filterSortedIdxs.length}`);
    }

    function applyManualFilter(selectedRowIndexes: number[]) {
        const selectedRowKeyIndexes = selectedRowIndexes.map(idx => tableData.rowKeyIndexes[idx]);
        const filter = filterTypeManual.createFilterInstance(selectedRowKeyIndexes);
        loadedTables.addFilter(visualSetup!.tableData.tableUri, filter);
    }

    function rowClicked(rowIdx: number) {
        resourceRenderCtx.addOpenedRow(tableData.tableUri, tableData.rowKeyIndexes[rowIdx]);
    }


    const searchFields = [
        <td key="_sel"></td>, // the first column = check boxes
        ...columns.map((col) => {
            if (col.colInfo.dataType == DT_STRING) {
                return (
                    <td key={col.id}>
                        <div style={{ paddingTop: "4px" }}>
                            <SearchField
                                value={searchFieldValues[col.id] || ""}
                                placeholder={`🔎 ${col.colInfo.name}`}
                                update={(newValue: string) => {
                                    setSearchFieldValues({ ...searchFieldValues, [col.id]: newValue });
                                }}
                            />
                        </div>
                    </td>
                );
            } else {
                return <td key={col.id} />
            }
        })];


    return (
        <div ref={wrapperRef} style={{ width: '100%', height: '100%' }}>
            <SubPagedTable
                columns={columns}
                pageSize={pageSize}
                filterSortedIdxs={Array.from(filterSortedIdxs)}
                title={concept.name}
                renderUid={guid()}
                searchFields={searchFields}
                searchFieldValues={searchFieldValues}
                applyManualFilter={applyManualFilter}
                rowClicked={rowClicked}
            />
        </div>);

}