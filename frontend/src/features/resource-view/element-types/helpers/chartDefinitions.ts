import { configSettingBoolean, configSettingColorPalette, configSettingColorRamp, configSettingGammaFactor, configSettingRange } from "./configSettingTypes";

export function chartNumericalColorConfigSettings(needColorAspect: boolean) {
    const visibleIfNum = needColorAspect ? `isNumericalProperty($color)`: undefined;
    const visibleIfCat = needColorAspect ? `isCategoricalProperty($color)`: undefined;

    return [
        {
            id: 'colorCategoricalPalette',
            name: 'Palette',
            sectionId: 'colors',
            settingType: configSettingColorPalette(),
            visibleIf: visibleIfCat,
        },
        {
            id: 'colorRamp',
            name: 'Ramp',
            sectionId: 'colors',
            settingType: configSettingColorRamp(false),
            visibleIf: visibleIfNum,
        },
        {
            id: 'colorRampSwapped',
            name: 'Swapped',
            sectionId: 'colors',
            settingType: configSettingBoolean(false),
            visibleIf: visibleIfNum,
        },
        {
            id: 'colorGammaFactor',
            name: 'Color gamma factor',
            sectionId: 'colors',
            settingType: configSettingGammaFactor(),
            visibleIf: visibleIfNum,
        },
        {
            id: 'colorRangeMin',
            name: 'Color range minimum',
            sectionId: 'colors',
            settingType: configSettingRange(0, 0.99, 0.01, 0.0),
            visibleIf: visibleIfNum,
        },
        {
            id: 'colorRangeMax',
            name: 'Color range maximum',
            sectionId: 'colors',
            settingType: configSettingRange(0.01, 1, 0.01, 1.0),
            visibleIf: visibleIfNum,
        },

    ];
}