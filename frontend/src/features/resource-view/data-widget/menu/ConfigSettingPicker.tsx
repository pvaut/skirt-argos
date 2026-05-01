

import { useEffect, useState } from "react";
import { TpTableData } from "../../../../data/tables/interface";
import { createInternalError } from "../../../../util/errors";
import { CONFIG_SETTING_TYPES, getConfigSettingValue } from "../../element-types/helpers/configSettingTypes";
import { TpVisualSetup } from "../../element-types/helpers/helpers";
import { TpDataWidgetConfigSettingDef } from "../../element-types/interface";
import Switch from "../../../../util/components/switch/Switch";
import { ConfigSettingPickerColumnsDefinition } from "../../element-types/table-view/config/ConfigSettingPickerColumnsDefinition";

import styles from './Menu.module.scss';


interface TpProps {
    tableData: TpTableData;
    layerIdx: number | null;// not null in case of multi-layer widgets
    configSettingDef: TpDataWidgetConfigSettingDef;
    visualSetup: TpVisualSetup;
    updateConfigSetting: (layerIdx: number | null, theSettingId: string, newValue: any) => void;
}


function ConfigSettingPickerRange(props: TpProps) {
    const visualSetup = props.visualSetup;
    const configSettingDef = props.configSettingDef;
    const theInitialValue = getConfigSettingValue(visualSetup, configSettingDef);
    const [stateValue, setStateValue] = useState(theInitialValue);

    useEffect(() => {
        setStateValue(theInitialValue);
    }, [theInitialValue]);

    const debouncedUpdate = props.updateConfigSetting;

    return (
        <div style={{ whiteSpace: 'nowrap' }}>
            <input
                style={{ width: 'calc(100% - 80px)', boxSizing: "border-box" }}
                type="range"
                id={configSettingDef.id}
                min={configSettingDef.settingType.minVal}
                max={configSettingDef.settingType.maxVal}
                step={configSettingDef.settingType.step}
                value={stateValue}
                onChange={(ev) => {
                    const newValue = parseFloat(ev.target.value);
                    setStateValue(newValue);
                    debouncedUpdate(props.layerIdx, configSettingDef.id, newValue);
                }}
            />
            <div style={{ display: 'inline-block', width: '70px', textAlign: 'right', verticalAlign: 'top' }}>{stateValue}</div>

        </div>
    )
}


function ConfigSettingPickerChoice(props: TpProps) {
    const visualSetup = props.visualSetup;
    const configSettingDef = props.configSettingDef;
    const theValue = getConfigSettingValue(visualSetup, configSettingDef);

    return (
        <div>
            <select
                value={theValue}
                onChange={(ev) => {
                    const newValue = ev.target.value;
                    props.updateConfigSetting(props.layerIdx, configSettingDef.id, newValue);
                }}
            >
                {configSettingDef.settingType.choices.map((choice: any) => (
                    <option key={choice.id} value={choice.id}>
                        {choice.name}
                    </option>
                ))}
            </select>
        </div>
    )
}

function ConfigSettingPickerBoolean(props: TpProps) {
    const visualSetup = props.visualSetup;
    const configSettingDef = props.configSettingDef;
    const theValue = getConfigSettingValue(visualSetup, configSettingDef);

    return (
        <div>
            <Switch
                value={theValue}
                onChange={(newValue: boolean) => { props.updateConfigSetting(props.layerIdx, configSettingDef.id, newValue) }}
            />
        </div>
    )
}

function ConfigSettingPickerString(props: TpProps) {
    const visualSetup = props.visualSetup;
    const configSettingDef = props.configSettingDef;
    const theInitialValue = getConfigSettingValue(visualSetup, configSettingDef);
    const [stateValue, setStateValue] = useState(theInitialValue);

    useEffect(() => {
        setStateValue(theInitialValue);
    }, [theInitialValue]);

    function update() {
        props.updateConfigSetting(props.layerIdx, configSettingDef.id, stateValue);
    }

    return (
        <div style={{ whiteSpace: 'nowrap' }}>
            <input
                className={stateValue == theInitialValue ? styles.inputStringUnchanged : styles.inputStringChanged}
                id={configSettingDef.id}
                min={configSettingDef.settingType.minVal}
                max={configSettingDef.settingType.maxVal}
                step={configSettingDef.settingType.step}
                value={stateValue}

                onKeyDown={(event) => {
                    if (event.key === 'Enter') update();
                }}

                onChange={(ev) => {
                    setStateValue(ev.target.value);
                }}
            />

        </div>
    )
}





export function ConfigSettingPicker(props: TpProps) {


    if (props.configSettingDef.settingType.configSettingType == CONFIG_SETTING_TYPES.RANGE)
        return <ConfigSettingPickerRange {...props} />

    if (props.configSettingDef.settingType.configSettingType == CONFIG_SETTING_TYPES.CHOICE)
        return <ConfigSettingPickerChoice {...props} />

    if (props.configSettingDef.settingType.configSettingType == CONFIG_SETTING_TYPES.BOOLEAN)
        return <ConfigSettingPickerBoolean {...props} />

    if (props.configSettingDef.settingType.configSettingType == CONFIG_SETTING_TYPES.COLUMNS_DEFINITION)
        return <ConfigSettingPickerColumnsDefinition {...props} />

    if (props.configSettingDef.settingType.configSettingType == CONFIG_SETTING_TYPES.STRING)
        return <ConfigSettingPickerString {...props} />

    throw createInternalError(`Invalid config parameter type`);
}