import { useRef } from "react";
import { TpTableData } from "../../../../../data/tables/interface";
import { getConfigSettingValue } from "../../helpers/configSettingTypes";
import { TpVisualSetup } from "../../helpers/helpers";
import { TpDataWidgetConfigSettingDef } from "../../interface";
import { getTableColumn } from "../../../../../data/tables/table";

import styles from './ConfigSettingPickerColumnsDefinition.module.scss';
import { executeForm } from "../../../../../util/components/form/Form";
import { createFormChoice } from "../../../../../util/components/form/formFieldTypes";
import { messagePopup } from "../../../../../util/components/simple-modals/MessagePopup";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { RangeSlider } from "../../../../../util/components/range-slider/RangeSlider";


interface TpProps {
    tableData: TpTableData;
    layerIdx: number | null;// not null in case of multi-layer widgets
    configSettingDef: TpDataWidgetConfigSettingDef;
    visualSetup: TpVisualSetup;
    updateConfigSetting: (layerIdx: number | null, theSettingId: string, newValue: any) => void;
}

interface TpColumnConfig {
    id: string;
    width: number;
}



export function ConfigSettingPickerColumnsDefinition(props: TpProps) {
    const visualSetup = props.visualSetup;
    const configSettingDef = props.configSettingDef;
    const tableData = visualSetup.tableData;

    const includeLayoutSettings = configSettingDef.settingType.includeLayoutSettings;

    const columnDefinitions: TpColumnConfig[] = getConfigSettingValue(visualSetup, configSettingDef);

    const columnDefinitionsRef = useRef(columnDefinitions);
    columnDefinitionsRef.current = columnDefinitions;

    function updateColumnConfig(colId: string, property: string, newValue: any) {
        const newColumnDefinitions = structuredClone(columnDefinitionsRef.current);
        const theColumn = newColumnDefinitions.find(col => col.id == colId)!;
        (theColumn as any)[property] = newValue;
        props.updateConfigSetting(props.layerIdx, 'columns', newColumnDefinitions);
    }

    const renderedCols = columnDefinitions.map((colDef) => {
        const colInfo = getTableColumn(tableData, colDef.id);
        return (
            <div key={colDef.id} className={styles.column}>
                <div><b>{colInfo.name}</b></div>
                {includeLayoutSettings && (
                    <div style={{ paddingTop: '5px' }}>
                        <div style={{ verticalAlign: 'top', display: 'inline-block', width: '70px' }}>width:</div>
                        <div style={{ display: 'inline-block', width: '170px' }}>
                            <RangeSlider minVal={60} maxVal={400} step={10} value={colDef.width} update={(newValue: number) => {
                                updateColumnConfig(colDef.id, 'width', newValue);
                            }} />
                        </div>
                    </div>
                )}
                <div
                    className={styles.closeButton}
                    onClick={() => { removeColumn(colDef.id) }}
                >
                    <FontAwesomeIcon icon="times" />
                </div>
            </div>
        )
    })

    function removeColumn(colId: string) {
        const newColumnDefinitions = columnDefinitions.filter(colDef => colDef.id != colId);
        props.updateConfigSetting(props.layerIdx, 'columns', newColumnDefinitions);

    }

    function promptAddColumn() {
        const usedColIds = columnDefinitions.map(colDef => colDef.id);
        const columnChoices = tableData.columns.filter(col => usedColIds.indexOf(col.id) < 0).map(col => ({ id: col.id, value: col.name }));
        if (columnChoices.length == 0) {
            messagePopup({ title: "Error", description: "No more columns to add" });
            return;
        }
        executeForm({
            name: 'Select column',
            fields: [
                createFormChoice('column', 'Column', columnChoices),
            ],
            buttons: [],

        })
            .then((result) => {
                const colId = (result as any).data.column;
                const newColumnDefinitions = structuredClone(columnDefinitions);
                newColumnDefinitions.push({
                    id: colId,
                    width: 250,
                });
                props.updateConfigSetting(props.layerIdx, 'columns', newColumnDefinitions);
            })
            .catch(() => { })
    }

    return (
        <div >
            <div className={styles.columnGroup}>
                {renderedCols}
            </div>
            <button onClick={() => { promptAddColumn() }}>Add...</button>
        </div>
    )
}
