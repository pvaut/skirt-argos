import { tableValue2DispString, validateColumnHasData } from "../../../../data/tables/table";
import Loader from "../../../../util/components/loader/Loader";
import { getVisualSetup, TpVisualSetup } from "../helpers/helpers";
import { TpResourceRenderContext } from "../interface";


import styles from './NumStatSummary.module.scss';
import { _addFilter } from "../../../../data/store/loadedTablesSlice";
import { useTablesStorage } from "../../../../data/usage/useTablesStorage";
import { TpDataWidgetCtx } from "../../data-widget/interface";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRef, useState } from "react";
import { useResizedCompRedraw } from "../../../../util/resizeObserverHook";
import { numStatSummaryDefinition } from "./numStatSummaryDefinition";
import { getTableAggregation } from "../../../../data/tables/table-aggregations/cachedTableAggregations";
import { aggNumStats, NUM_STAT_TYPES, TpNumStatsData, TpNumStatsRecipe } from "../../../../data/tables/table-aggregations/recipes/numStats";



interface TpProps {
    resourceRenderCtx: TpResourceRenderContext,
    elemDef: any,
    dataWidgetCtx: TpDataWidgetCtx;
}


export function NumStatSummary(props: TpProps) {
    const { resourceRenderCtx: ctx, elemDef } = props;



    const wrapperRef = useRef<HTMLDivElement>(null);
    useResizedCompRedraw(wrapperRef, 200, false);

    const loadedTables = useTablesStorage();

    const visualSetup = getVisualSetup(ctx, numStatSummaryDefinition.channels, numStatSummaryDefinition.configSettings, elemDef);
    if (!visualSetup) return <div><Loader paddingTop={30} /></div>;

    const valuesColumn = visualSetup.channelEncodings.values;
    validateColumnHasData(valuesColumn);

    const settings: TpNumStatsRecipe = {
        valuesChannelId: valuesColumn.id,
        statType: visualSetup.configSettings.statType,
    }
    const stats = getTableAggregation<TpNumStatsData>(visualSetup.tableData, aggNumStats.recipeId, settings);

    return (
        <div className={styles.wrapper}>
            <div className={styles.title}>{valuesColumn.name}</div>
            <div className={styles.contentWrapper}>
                {(settings.statType == NUM_STAT_TYPES.AVERAGE) && (!stats.hasSelection) && (
                    <>
                        <div className={styles.tag}>Average:</div>
                        <div className={styles.value}>{tableValue2DispString(valuesColumn, stats.averages!.avgAll, true)}</div>
                    </>
                )}
                {(settings.statType == NUM_STAT_TYPES.AVERAGE) && (stats.hasSelection) && (
                    <>
                        <div className={styles.tag}>Average (selected):</div>
                        <div className={styles.value}>{tableValue2DispString(valuesColumn, stats.averages!.avgSelected, true)}</div>
                        <div className={styles.tag}>Average (unselected):</div>
                        <div className={styles.value}>{tableValue2DispString(valuesColumn, stats.averages!.avgUnselected, true)}</div>
                    </>
                )}
                {(settings.statType == NUM_STAT_TYPES.SUM) && (!stats.hasSelection) && (
                    <>
                        <div className={styles.tag}>Total:</div>
                        <div className={styles.value}>{tableValue2DispString(valuesColumn, stats.sums!.sumAll, true)}</div>
                    </>
                )}
                {(settings.statType == NUM_STAT_TYPES.SUM) && (stats.hasSelection) && (
                    <>
                        <div className={styles.tag}>Total (selected):</div>
                        <div className={styles.value}>{tableValue2DispString(valuesColumn, stats.sums!.sumSelected, true)}</div>
                        <div className={styles.tag}>Total (unselected):</div>
                        <div className={styles.value}>{tableValue2DispString(valuesColumn, stats.sums!.sumUnselected, true)}</div>
                    </>
                )}
            </div>
        </div>
    )
}