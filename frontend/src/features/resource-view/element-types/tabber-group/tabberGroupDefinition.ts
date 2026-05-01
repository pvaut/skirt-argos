import { configSettingString } from "../helpers/configSettingTypes";
import { TpElemTypeDefBasic, ELEMTYPE_CLASSES, ELEMTYPES } from "../interface";
import { TabberGroup } from "./TabberGroup";


export const tabberGroupDefinition: TpElemTypeDefBasic = {
    id: ELEMTYPES.TAB_GROUP,
    name: 'Tab Group',
    elementClass: ELEMTYPE_CLASSES.BASIC,
    renderComponent: TabberGroup,
    configSettings:[
                {
                    id: 'tabNames',
                    name: 'Tab names (separated by ;)',
                    sectionId: '',
                    settingType: configSettingString(6, ""),
                },
        
    ],
}