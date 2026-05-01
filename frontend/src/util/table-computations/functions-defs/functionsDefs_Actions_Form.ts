import { _addActiveResource } from "../../../data/store/activeResourcesSlice";
import { _addLocalResource } from "../../../data/store/localResourcesSlice";
import { executeForm, TpForm } from "../../components/form/Form";
import { FORM_FIELD_TYPES } from "../../components/form/formFieldTypes";
import { createConfigError } from "../../errors";
import { TpComputeContext } from "../interface";
import { addFunctionDef, GROUP_ACTIONS_FORM, typeArray, typeNumberScalar, typeObject, typeStringScalar } from "./functionsDefs";



async function scriptPromptForm(formTitle: string, formDef: any) {
    const theForm: TpForm = {
        name: formTitle,
        fields: [],
        buttons: [],
    };
    const validFieldTypes = [FORM_FIELD_TYPES.NUMBER];
    for (const formEl of formDef) {
        if (!formEl.hasOwnProperty('type')) throw createConfigError(`Form definition element misses property "type"`);
        if (!formEl.hasOwnProperty('identifier')) throw createConfigError(`Form definition element misses property "identifier"`);
        if (!formEl.hasOwnProperty('name')) throw createConfigError(`Form definition element misses property "name"`);
        if (!formEl.hasOwnProperty('default')) throw createConfigError(`Form definition element misses property "default"`);
        if (validFieldTypes.indexOf(formEl.type) < 0) throw createConfigError(`Invalid form definition element type "${formEl.type}" (expected ${validFieldTypes.join(', ')})`);
        if (formEl.type == FORM_FIELD_TYPES.NUMBER) {
            theForm.fields.push({
                id: formEl.identifier,
                name: formEl.name,
                fieldType: FORM_FIELD_TYPES.NUMBER,
                defaultValue: formEl.default,
                specifics: {}
            });
        }
    }
    const rs = await executeForm(theForm);
    return (rs as any).data;
}


export function initFunctionDefs_Actions_Form() {

    addFunctionDef({
        functionName: 'promptForm',
        description: "Prompts the user with a form.",
        isVectorType: false,
        isAction: true,
        isAsync: true,
        group: GROUP_ACTIONS_FORM,

        overloads: [
            {
                id: 'default',
                arguments: [
                    { name: 'formTitle', inputType: typeStringScalar },
                    { name: 'formDefinition', inputType: typeArray },
                ],
                outputType: typeObject,
                eval: async (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    return await scriptPromptForm(argList[0], argList[1]);
                },
            },
        ],
    });

    addFunctionDef({
        functionName: 'getFormNumber',
        description: "Extracts a numerical property from a form result.",
        isVectorType: false,
        isAction: true,
        isAsync: false,
        group: GROUP_ACTIONS_FORM,

        overloads: [
            {
                id: 'default',
                arguments: [
                    { name: 'formResult', inputType: typeObject },
                    { name: 'identifier', inputType: typeStringScalar },
                ],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    const key = argList[1];
                    const theValue = argList[0][key];
                    return theValue;
                },
            },
        ],
    });

}