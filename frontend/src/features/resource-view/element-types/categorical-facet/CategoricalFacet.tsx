import { validateColumnHasData } from "../../../../data/tables/table";
import Loader from "../../../../util/components/loader/Loader";
import { count2DisplayString } from "../../../../util/misc";
import { getVisualSetup, TpVisualSetup } from "../helpers/helpers";
import { TpResourceRenderContext } from "../interface";
import { categoricalFacetDefinition } from "./categoricalFacetDefinition";

import styles from './CategoricalFacet.module.scss';
import { _addFilter } from "../../../../data/store/loadedTablesSlice";
import { useTablesStorage } from "../../../../data/usage/useTablesStorage";
import { filterTypeCategorical } from "../../../../util/filters/filter-types/filterTypeCategorical";
import { findCategoricalFilter } from "../../../../util/filters/helpers";
import { TpDataWidgetCtx } from "../../data-widget/interface";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRef, useState } from "react";
import { useResizedCompRedraw } from "../../../../util/resizeObserverHook";


function getStateFrequencies(visualSetup: TpVisualSetup): {
    statesFrequenciesList: { stateId: string, stateName: string, total: number, selected: number }[];
    maxCount: number;
} {
    const categoriesColumn = visualSetup.channelEncodings.categories;
    validateColumnHasData(categoriesColumn);

    const statesList = categoriesColumn.categoricalStatesList!;

    const statesFrequenciesMap: { [stateId: string]: { seleced: number, total: number } } = {};

    const rowCount = visualSetup.tableData.rowCount;
    const stateValues = categoriesColumn.values;
    const selectionMask = visualSetup.tableData.currentfilterMask;
    for (let rowNr = 0; rowNr < rowCount; rowNr++) {
        const rowValue = stateValues[rowNr];
        if (!(rowValue in statesFrequenciesMap)) {
            statesFrequenciesMap[rowValue] = { seleced: 0, total: 0 };
        }
        statesFrequenciesMap[rowValue].total++;
        if (selectionMask[rowNr])
            statesFrequenciesMap[rowValue].seleced++;
    }
    const statesFrequenciesList: { stateId: string, stateName: string, total: number, selected: number }[] = [];
    for (const [key, value] of Object.entries(statesFrequenciesMap)) {
        statesFrequenciesList.push({
            stateId: key,
            stateName: statesList[parseInt(key)],
            total: value.total,
            selected: value.seleced,
        });
    }
    statesFrequenciesList.sort((a, b) => b.total - a.total);

    let maxCount = 1;
    if (statesFrequenciesList.length > 0) maxCount = statesFrequenciesList[0].total;

    if (visualSetup.configSettings.sortBy == 'alphabetical') {
        statesFrequenciesList.sort((a, b) => a.stateName.localeCompare(b.stateName));

    }

    return {
        statesFrequenciesList,
        maxCount,
    }
}


interface TpProps {
    resourceRenderCtx: TpResourceRenderContext,
    elemDef: any,
    dataWidgetCtx: TpDataWidgetCtx;
}


export function CategoricalFacet(props: TpProps) {
    const { resourceRenderCtx: ctx, elemDef } = props;

    const [pageOffset, setPageOffset] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);
    useResizedCompRedraw(wrapperRef, 200, false);

    const loadedTables = useTablesStorage();

    const visualSetup = getVisualSetup(ctx, categoricalFacetDefinition.channels, categoricalFacetDefinition.configSettings, elemDef);
    if (!visualSetup) return <div><Loader paddingTop={30} /></div>;

    const { statesFrequenciesList, maxCount } = getStateFrequencies(visualSetup);

    let pageSize = 1;
    if (wrapperRef.current) {
        pageSize = Math.floor((wrapperRef.current.clientHeight - 10) / 35);
    }

    const rowCount = statesFrequenciesList.length;

    let filteredStateIds: { [stateId: string]: boolean } = {};
    const tableInfo = loadedTables.getTableInfo(visualSetup.tableData.tableUri);
    const activeFilter = findCategoricalFilter(tableInfo.currentFilterSteps, visualSetup.channelEncodings.categories.id);
    if (activeFilter)
        for (const id of activeFilter.stateIds)
            filteredStateIds[id] = true;

    function performCategoricalSelection(stateId: string) {
        const filter = filterTypeCategorical.createFilterInstance({
            binding: visualSetup!.channelEncodings.categories.id,
            stateIds: [stateId],
        })
        loadedTables.addFilter(visualSetup!.tableData.tableUri, filter);
    }

    const firstIndex = Math.max(0, Math.min(rowCount - 1, pageOffset));
    const lastIndex = Math.max(0, Math.min(rowCount - 1, pageOffset + pageSize - 1));

    const states = statesFrequenciesList.slice(firstIndex, lastIndex + 1).map(stateInfo => (
        <div
            key={stateInfo.stateId}
            className={filteredStateIds[stateInfo.stateId] ? styles.itemFilterActive : styles.item}
            onClick={() => {
                performCategoricalSelection(stateInfo.stateId);
            }}
        >
            <div className={styles.count}>
                {count2DisplayString(stateInfo.selected)}
            </div>
            <div className={styles.barBox}>
                <div
                    className={styles.totalBar}
                    style={{ width: `${stateInfo.total / maxCount * 100}%` }}
                />
                <div
                    className={styles.selectedBar}
                    style={{ width: `${stateInfo.selected / maxCount * 100}%` }}
                />
            </div>
            <div className={styles.label}>
                {stateInfo.stateName}
            </div>
            {filteredStateIds[stateInfo.stateId] && (
                <div className={styles.filterIndication} />
            )}
        </div>
    ))

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
                <div className={styles.title}>{visualSetup!.channelEncodings.categories.name}</div>
            </div>
            <div className={styles.contentWrapper} ref={wrapperRef}>
                {states}
            </div>
        </div>
    )
}