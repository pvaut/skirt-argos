import { TpElemTypeDefBasic, ELEMTYPE_CLASSES, ELEMTYPES } from "../interface";
import { HorizontalGroup } from "./HorizontalGroup";


export const horizontalGroupDefinition: TpElemTypeDefBasic = {
    id: ELEMTYPES.HORIZONTAL_GROUP,
    name: 'Horizontal Group',
    elementClass: ELEMTYPE_CLASSES.BASIC,
    renderComponent: HorizontalGroup,
    configSettings:[],
}