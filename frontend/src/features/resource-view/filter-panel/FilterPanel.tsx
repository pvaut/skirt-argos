import { getConcept, getTableUri, useConfig } from '../../../data/helpers';
import { TpConcept, TpResourceInfo } from '../../../data/interfaces';
import { TpLoadedTableInfo } from '../../../data/store/loadedTablesSlice';
import { TpTableData } from '../../../data/tables/interface';
import { getTableFilterStepData } from '../../../data/tables/table';
import { useTablesStorage } from '../../../data/usage/useTablesStorage';
import { getFilterTypeDef } from '../../../util/filters/filterTypeFactory';
import { renderFilter } from '../../../util/filters/helpers';
import { count2DisplayString, fraction2DisplayString } from '../../../util/misc';
import { StyledButton } from '../../../util/components/buttons/styled-button/StyledButton';
import styles from './FilterPanel.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import CircularDial from '../../../util/components/circular-dial/CircularDial';
import { updateElementsTrStateAfterDataChange } from '../element-types/helpers/helpers';
import Loader from '../../../util/components/loader/Loader';
import { promptEditFilterStep, promptFilterActions } from './filterActions';
import { useActiveResourcesStorage } from '../../../data/usage/useActiveResourcesStorage';



function ArrowDown({ }: {}) {
    return (
        <div style={{ display: "inline-block", paddingBottom: '3px' }}>
            <div className={styles.arrowDown} />
        </div>);
}


interface TpProps {
    resourceInfo: TpResourceInfo;
}


export function FilterPanel({ resourceInfo }: TpProps) {

    const displayedTables: {
        resourceInfo: TpResourceInfo,
        tableInfo: TpLoadedTableInfo,
        tableData: TpTableData,
        concept: TpConcept;
    }[] = [];

    const config = useConfig()
    const tablesStorage = useTablesStorage();
    const activeResourcesStorage = useActiveResourcesStorage();

    let loadingCompleted = true;

    for (const tableDef of resourceInfo.tables) {
        const tableUri = getTableUri(resourceInfo.uri, tableDef.id);
        const tableInfo = tablesStorage.findTableInfo(tableUri);
        const tableData = tablesStorage.findTableData(tableUri);

        if (tableInfo && tableData)
            displayedTables.push({
                resourceInfo,
                tableInfo,
                tableData,
                concept: getConcept(config, tableDef.concept),
            });
        if (!tableInfo || !tableDef) loadingCompleted = false;
    }

    function removeFilterStep(tableUri: string, filterUid: string) {
        tablesStorage.removeFilter(tableUri, filterUid);
    }

    const renderedTableInfo = [];

    let sectionIndex = 0;
    for (const displayedTable of displayedTables) {
        const { tableInfo, tableData } = displayedTable;

        const hasRestriction = tableInfo.restrictionFilterSteps.length > 0;
        const hasCurrentSelection = tableInfo.currentFilterSteps.length > 0;

        const renderedRestrictionSteps = tableInfo.restrictionFilterSteps.map(filter => {
            return (
                <div key={filter.uid} className={styles.filterStepDisabled}>
                    <ArrowDown />
                    <div>
                        {renderFilter(tableInfo, tableData, filter)}
                    </div>
                </div>)
        })

        const renderedFilterSteps = tableInfo.currentFilterSteps.map(filter => {
            const filterData = getTableFilterStepData(tableData, filter.uid);
            const canEditFilter = !!getFilterTypeDef(filter.filterType).promptEditFilter;
            return (
                <div
                    key={filter.uid}
                    className={canEditFilter ? styles.filterStepSelectable : styles.filterStep}
                    onClick={() => { if (canEditFilter) promptEditFilterStep(displayedTable, tablesStorage, filter) }}
                >
                    <ArrowDown />
                    <div>
                        {renderFilter(tableInfo, tableData, filter)}
                    </div>
                    <div style={{ paddingTop: "6px" }}>
                        {(tableData.rowCount > 0) && (
                            <CircularDial
                                value={filterData.filterPassCount / tableData.rowCount}
                                size={25}
                                strokeWidth={4}
                            />
                        )}
                        <div style={{ display: 'inline-block', verticalAlign: 'top', lineHeight: '25px', paddingLeft: '5px' }}>
                            {fraction2DisplayString(filterData.filterPassCount, tableData.rowCount)}
                        </div>
                    </div>
                    <div
                        className={styles.closeButton}
                        onClick={(ev) => { ev.stopPropagation(); removeFilterStep(tableData.tableUri, filter.uid) }}
                    >
                        <FontAwesomeIcon icon="times" />
                    </div>
                </div>)
        })

        const filterEditButton = (<div
            className={styles.filterEditButton}
            onClick={() => promptFilterActions(activeResourcesStorage, tablesStorage, resourceInfo, tableInfo, tableData)}
        >
            <FontAwesomeIcon icon="pencil" />
        </div>
        );

        renderedTableInfo.push(
            <div key={tableInfo.uri} className={styles.tableWrapper}>
                <div style={{ height: '10px' }} />

                {hasRestriction && (
                    <>
                        <div className={styles.tag}>
                            {tableData.name}: {count2DisplayString(tableData.origData!.rowCount)}
                        </div>
                        {renderedRestrictionSteps}
                    </>

                )}
                <div className={styles.tag}>
                    {tableData.name}: {count2DisplayString(tableData.rowCount)}
                    {tableData.description && (
                        <div className={styles.description}>{tableData.description}</div>
                    )}
                </div>
                {hasRestriction && (
                    <div style={{ textAlign: 'center', marginTop: '30px', marginBottom: '15px' }}>
                        <StyledButton
                            text={'Remove restriction'}
                            disabled={hasCurrentSelection}
                            onClick={() => {
                                tablesStorage.removeRestriction(tableInfo.uri);
                                updateElementsTrStateAfterDataChange(resourceInfo.uri);
                            }}
                        />
                    </div>

                )}
                {hasCurrentSelection && (
                    <>
                        <div style={{ position: "relative" }}>
                            {renderedFilterSteps}
                            <div className={styles.filterStepsGrouperIndication} />
                            <div style={{ position: "absolute", bottom: "2px", left: 0 }}>
                                {filterEditButton}
                            </div>
                            <div style={{ textAlign: "center", paddingTop: "7px" }}><ArrowDown /></div>
                        </div>
                        <div className={styles.tag}>
                            {tableData.name}: {count2DisplayString(tableData.currentFilterCount)}
                        </div>
                        <div style={{ height: '20px' }} />
                        <div style={{ textAlign: 'center' }}>
                            <StyledButton
                                text={'Clear filter'}
                                width={80}
                                marginRight={20}
                                onClick={() => {
                                    tablesStorage.removeAllFilters(tableInfo.uri);
                                }}
                            />
                            <StyledButton
                                text={'Restrict to filter'}
                                width={80}
                                onClick={() => {
                                    tablesStorage.restrictTableToFilter(tableInfo.uri);
                                    updateElementsTrStateAfterDataChange(resourceInfo.uri);
                                }}
                            />
                        </div>
                    </>
                )}
                {(!hasCurrentSelection) && (!hasRestriction) && (
                    <div className={styles.filterStep}>
                        No filter applied
                        <div style={{ position: "absolute", top: "1px", left: 0 }}>
                            {filterEditButton}
                        </div>
                    </div>
                )}

            </div>
        );

        if (sectionIndex < displayedTables.length - 1) {
            renderedTableInfo.push(<div key={`sep_${sectionIndex}`} className={styles.sectionDivider} />)
        }
        sectionIndex++;
    }


    return (
        <div>
            {renderedTableInfo}
            {!loadingCompleted && (
                <Loader paddingTop={40} />
            )}
        </div>
    );
}