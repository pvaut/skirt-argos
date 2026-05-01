import { configSettingChoice } from "../helpers/configSettingTypes";
import { getGenericWidgetsThingsTodoHelp, TpVisualSetup } from "../helpers/helpers";
import { TpElemTypeDefDataWidgetSL, ELEMTYPE_CLASSES, CHANNEL_TYPES } from "../interface";
import { CategoricalFacet } from "./CategoricalFacet";


const WIDGETTYPE_CATEGORICAL_FACET = 'categoricalFacet';


export const categoricalFacetDefinition: TpElemTypeDefDataWidgetSL = {
    id: WIDGETTYPE_CATEGORICAL_FACET,
    name: 'Categorical Facet',
    elementClass: ELEMTYPE_CLASSES.DATA_SINGLE_LAYER,
    vizQuality: 1,
    renderComponent: CategoricalFacet,

    sections: [
        { id: 'main', name: "Categories" },
    ],

    channels: [
        {
            id: 'categories',
            name: 'Categories',
            required: true,
            dataType: CHANNEL_TYPES.CATEGORICAL,
            sectionId: 'main',
        }
    ],

    configSettings: [
        {
            id: 'sortBy',
            name: 'Sort by',
            sectionId: 'main',
            settingType: configSettingChoice([
                { id: 'frequency', name: 'Frequency' },
                { id: 'alphabetical', name: 'Alphabetical' },
            ]),
        },

    ],

    getThingsTodoHelp,

}

function getThingsTodoHelp(visualSetup: TpVisualSetup): any[] {
    return [
        "Click on one more states to select those states",
        ...getGenericWidgetsThingsTodoHelp(),
    ];
}
