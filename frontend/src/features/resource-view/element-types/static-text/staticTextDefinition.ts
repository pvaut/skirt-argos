import { getComputationHelpInWrapper } from "../../../../util/table-computations/computation-help/ComputationHelp";
import { computeCtxAddResourceAttributes, createComputeCtx } from "../../../../util/table-computations/helpers";
import { COMPUTATION_TYPES } from "../../../../util/table-computations/interface";
import { configSettingString } from "../helpers/configSettingTypes";
import { TpElemTypeDefBasic, ELEMTYPE_CLASSES, ELEMTYPES, TpResourceRenderContext } from "../interface";
import { StaticText } from "./StaticText";





export const staticTextDefinition: TpElemTypeDefBasic = {
    id: ELEMTYPES.STATIC_TEXT,
    name: 'Static Text',
    renderComponent: StaticText,
    elementClass: ELEMTYPE_CLASSES.BASIC,

    configSettings: [
        {
            id: 'content',
            name: 'Content',
            sectionId: '',
            settingType: configSettingString(8, ""),
        },
    ],

    createCustomSettingElement: (resourceRenderCtx: TpResourceRenderContext) => {
        const computeCtx = createComputeCtx(COMPUTATION_TYPES.OUTPUT_SCALAR);
        computeCtxAddResourceAttributes(computeCtx, resourceRenderCtx.resourceInfo);
        return getComputationHelpInWrapper(computeCtx, "Text can be entered as markdown. You can use expressions between curly braces.");
    }

}

