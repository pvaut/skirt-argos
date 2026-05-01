import { createFormChoice } from "../../../../util/components/form/formFieldTypes";
import { getComputationHelpInWrapper } from "../../../../util/table-computations/computation-help/ComputationHelp";
import { computeCtxAddResourceAttributes, createComputeCtx } from "../../../../util/table-computations/helpers";
import { COMPUTATION_TYPES, TARGET_DASHBOARD } from "../../../../util/table-computations/interface";
import { configSettingString } from "../helpers/configSettingTypes";
import { TpElemTypeDefBasic, ELEMTYPE_CLASSES, ELEMTYPES, TpResourceRenderContext } from "../interface";
import { ActionButton } from "./ActionButton";



export const actionButtonDefinition: TpElemTypeDefBasic = {
    id: ELEMTYPES.ACTION_BUTTON,
    name: 'Action Button',
    renderComponent: ActionButton,
    elementClass: ELEMTYPE_CLASSES.BASIC,

    configSettings: [
        {
            id: 'action',
            name: 'Action',
            sectionId: '',
            settingType: configSettingString(8, ""),
            generator: (resourceRenderCtx: TpResourceRenderContext, elemDef: any) => {
                const actions = resourceRenderCtx.resourceInfo.renderTemplate!.actions?.filter(act => act.targetTableId == TARGET_DASHBOARD) || [];
                return createFormChoice('action', 'Action',
                    actions.map(act => ({ id: act.id, value: act.name }))
                )
            }
        },
    ],

    createCustomSettingElement: (resourceRenderCtx: TpResourceRenderContext) => {
        const computeCtx = createComputeCtx(COMPUTATION_TYPES.OUTPUT_SCALAR);
        computeCtxAddResourceAttributes(computeCtx, resourceRenderCtx.resourceInfo);
        return getComputationHelpInWrapper(computeCtx, "Text can be entered as markdown. You can use expressions between curly braces.");
    }

}

