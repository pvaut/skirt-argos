import { configSettingChoice, configSettingColumnsDefinition, configSettingRange } from "../helpers/configSettingTypes";
import { getGenericWidgetsThingsTodoHelp, TpVisualSetup } from "../helpers/helpers";
import { TpElemTypeDefDataWidgetSL, ELEMTYPE_CLASSES, CHANNEL_TYPES } from "../interface";
import { TableView } from "./TableView";



const WIDGETTYPE_TABLE_VIEW = 'tableView';

export const tableViewDefinition: TpElemTypeDefDataWidgetSL = {
    id: WIDGETTYPE_TABLE_VIEW,
    name: 'Table View',
    elementClass: ELEMTYPE_CLASSES.DATA_SINGLE_LAYER,
    renderComponent: TableView,
    vizQuality: 0.1,

    sections: [
        { id: 'main', name: "Table layout" },
    ],

    channels: [
        {
            id: 'sortBy',
            name: 'Sort by',
            required: false,
            dataType: CHANNEL_TYPES.SORTABLE,
            sectionId: 'main',
        }
    ],

    configSettings: [
        {
            id: "sortDir",
            name: "Sort direction",
            sectionId: "main",
            settingType: configSettingChoice([
                {id: 'asc', name: "Ascending"},
                {id: 'desc', name: "Descending"},
            ]),
            visibleIf: "!!$sortBy",
        },
        {
            id: 'pageSize',
            name: 'Page size',
            sectionId: 'main',
            settingType: configSettingRange(5, 50, 1, 20),
        },
        {
            id: 'columns',
            name: 'Columns',
            sectionId: 'main',
            settingType: configSettingColumnsDefinition(true),
        },

    ],

    getThingsTodoHelp,
}

function getThingsTodoHelp(visualSetup: TpVisualSetup): any[] {
    return [
        "Scroll through the multi-page view with the pager buttons",
        "Click on a row to open it in the side view",
        ...getGenericWidgetsThingsTodoHelp(),
    ];
}
