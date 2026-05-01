import { NUM_STAT_TYPES } from "../../../../data/tables/table-aggregations/recipes/numStats";
import { configSettingChoice } from "../helpers/configSettingTypes";
import { getGenericWidgetsThingsTodoHelp, TpVisualSetup } from "../helpers/helpers";
import { TpElemTypeDefDataWidgetSL, ELEMTYPE_CLASSES, CHANNEL_TYPES } from "../interface";
import { NumStatSummary } from "./NumStatSummary";



const WIDGETTYPE_NUM_STAT_SUMMARY = 'numStatSummary';


export const numStatSummaryDefinition: TpElemTypeDefDataWidgetSL = {
    id: WIDGETTYPE_NUM_STAT_SUMMARY,
    name: 'Numerical summary',
    elementClass: ELEMTYPE_CLASSES.DATA_SINGLE_LAYER,
    vizQuality: 0.1,
    renderComponent: NumStatSummary,

    sections: [
        { id: 'main', name: "Values" },
    ],

    channels: [
        {
            id: 'values',
            name: 'Values',
            required: true,
            dataType: CHANNEL_TYPES.NUMERICAL,
            sectionId: 'main',
        }
    ],

    configSettings: [
        {
            id: 'statType',
            name: 'Statistic',
            sectionId: 'main',
            settingType: configSettingChoice([
                { id: NUM_STAT_TYPES.AVERAGE, name: 'Average' },
                { id: NUM_STAT_TYPES.SUM, name: 'Sum' },
            ]),
        },
    ],

    getThingsTodoHelp,

}

function getThingsTodoHelp(visualSetup: TpVisualSetup): any[] {
    return [
        ...getGenericWidgetsThingsTodoHelp(),
    ];
}
