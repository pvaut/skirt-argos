import { theColorPalettes } from "../../../../util/color/colorPalettes";
import { theColorRamps } from "../../../../util/color/colorRamps";
import { createInternalError } from "../../../../util/errors";
import { TpDataWidgetConfigSettingDef } from "../interface";
import { TpVisualSetup } from "./helpers";


export enum CONFIG_SETTING_TYPES {
    RANGE = "range",
    CHOICE = "choice",
    BOOLEAN = "boolean",
    STRING = "string",
    COLUMNS_DEFINITION = "columnsDefinition",
}


export function configSettingRange(minVal: number, maxVal: number, step: number, defaultVal: number) {
    return {
        configSettingType: CONFIG_SETTING_TYPES.RANGE,
        minVal,
        maxVal,
        step,
        defaultVal,
    }
}


export function configSettingBoolean(defaultVal: boolean) {
    return {
        configSettingType: CONFIG_SETTING_TYPES.BOOLEAN,
        defaultVal,
    }
}


export function configSettingChoice(choices: { id: string, name: string }[], defaultVal? : string) {
    return {
        configSettingType: CONFIG_SETTING_TYPES.CHOICE,
        choices: structuredClone(choices),
        defaultVal: defaultVal || choices[0].id,
    }
}


export function configSettingGammaFactor() {
    return configSettingRange(0, 1, 0.01, 0.5);
}


export function configSettingColorRamp(divergentOnly: boolean) {
    if (divergentOnly) {
        return configSettingChoice(theColorRamps.filter(map => map.divergent).map(ramp => ({ id: ramp.id, name: ramp.name })))
    }
    return configSettingChoice(theColorRamps.map(ramp => ({ id: ramp.id, name: ramp.name })))
}


export function configSettingColorPalette() {
    return configSettingChoice(theColorPalettes.map(palette => ({ id: palette.id, name: palette.name })))
}


export function configSettingString(lineCount: number, defaultVal: string) {
    return {
        configSettingType: CONFIG_SETTING_TYPES.STRING,
        lineCount,
        defaultVal,
    }
}


export function configSettingColumnsDefinition(includeLayoutSettings: boolean) {
    return {
        configSettingType: CONFIG_SETTING_TYPES.COLUMNS_DEFINITION,
        defaultVal: [],
        includeLayoutSettings,
    }
}



export function getConfigSettingValue(visualSetup: TpVisualSetup, configSettingDef: TpDataWidgetConfigSettingDef): any {
    let value = visualSetup.configSettings[configSettingDef.id];
    if ((value != undefined) && (value != null)) return value;
    value = configSettingDef.settingType.defaultVal;
    if ((value != undefined) && (value != null)) return value;
    throw createInternalError(`Unable to obtain config setting value for ${configSettingDef.id}`);
}
