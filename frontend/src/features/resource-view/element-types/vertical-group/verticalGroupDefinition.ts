import { configSettingString } from "../helpers/configSettingTypes";
import { TpElemTypeDefBasic, ELEMTYPE_CLASSES, ELEMTYPES } from "../interface";
import { VerticalGroup } from "./VerticalGroup";




export const verticalGroupDefinition: TpElemTypeDefBasic = {
    id: ELEMTYPES.VERTICAL_GROUP,
    name: 'Vertical Group',
    elementClass: ELEMTYPE_CLASSES.BASIC,
    renderComponent: VerticalGroup,
    configSettings: [
        {
            id: 'title',
            name: 'Title',
            sectionId: '',
            settingType: configSettingString(1, ""),
        },
    ],
}