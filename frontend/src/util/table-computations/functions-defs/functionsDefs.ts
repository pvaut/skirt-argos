import { createInternalError, createUserError } from "../../errors";
import { getSuggestionsSimilar } from "../../levenshtein";
import { COMP_DATA_TYPES, TpComputeFunction, TpComputeOutputType } from "../computeOperators";
import { TpComputeContext } from "../interface";
import { initFunctionDefs_Actions_Form } from "./functionsDefs_Actions_Form";
import { initFunctionDefs_Actions_Generic } from "./functionsDefs_Actions_Generic";
import { initFunctionDefs_Actions_Resources } from "./functionsDefs_Actions_Resources";
import { initFunctionDefs_Simple } from "./functionsDefs_Simple";
import { initFunctionDefs_Stats } from "./functionsDefs_Stats";
import { initFunctionDefs_Vector } from "./functionsDefs_Vector";


export const GROUP_ACTIONS_GENERAL = "GROUP_ACTIONS_GENERAL";
export const GROUP_ACTIONS_RESOURCES = "GROUP_ACTIONS_RESOURCES";
export const GROUP_ACTIONS_FORM = "GROUP_ACTIONS_FORM";


export interface TpFunctionOverloadDef {
    id: string;
    arguments: {
        name: string;
        inputType: TpComputeOutputType;
    }[];
    outputType: TpComputeOutputType;
    eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => any;
}


export interface TpFunctionDef {
    functionName: string;
    isVectorType: boolean;
    isAction?: boolean; // function is intended for "action" type code, not for expressions
    isAsync?: boolean;
    description?: string;
    group?: string;
    overloads: TpFunctionOverloadDef[];
}


export const functionDefs: TpFunctionDef[] = [];
const functionDefMap: { [functionName: string]: TpFunctionDef } = {};


export function addFunctionDef(functionDef: TpFunctionDef) {
    if (functionDefMap.hasOwnProperty(functionDef.functionName)) throw createInternalError(`Duplicate function name: ${functionDef.functionName}`);
    if (functionDef.overloads.length == 0) throw createInternalError(`Function should have at least one overload: ${functionDef.functionName}`);
    const overloadMap: { [id: string]: boolean } = {};
    for (const overload of functionDef.overloads) {
        if (overloadMap[overload.id]) throw createInternalError(`Function has multiple overloads with the same id: ${functionDef.functionName}`);
        overloadMap[overload.id] = true;
    }
    functionDefs.push(functionDef);
    functionDefMap[functionDef.functionName] = functionDef;
}


export function getFunctionDef(functionName: string): TpFunctionDef {
    if (!functionDefMap.hasOwnProperty(functionName)) {
        const similarList = getSuggestionsSimilar(functionDefs.map(func => func.functionName), functionName);
        throw createUserError(`Function not found: ${functionName} (did you mean ${similarList.map(simil => `"${simil}"`).join(" or ")} ?)`);
    }
    return functionDefMap[functionName];
}


function isDataTypeCompatible(type1: TpComputeOutputType, type2: TpComputeOutputType): boolean {
    if (type1.isColumn != type2.isColumn) return false;
    return (type1.dataType == type2.dataType);
}


export function getFunctionOverload(functionDef: TpFunctionDef, argumentTypes: TpComputeOutputType[]): TpFunctionOverloadDef {
    for (const overload of functionDef.overloads) {
        if (overload.arguments.length == argumentTypes.length) {
            let isMatch = true;
            for (let i = 0; i < argumentTypes.length; i++)
                if (!isDataTypeCompatible(argumentTypes[i], overload.arguments[i].inputType)) isMatch = false;
            if (isMatch) return overload;
        }
    }
    debugger;
    throw createUserError(`Incompatible arguments for function ${functionDef.functionName}`);
}


export const typeNumberColumn = { dataType: COMP_DATA_TYPES.NUMBER, isColumn: true, isDoublePrecision: null };
export const typeNumberScalar = { dataType: COMP_DATA_TYPES.NUMBER, isColumn: false, isDoublePrecision: null };
export const typeStringScalar = { dataType: COMP_DATA_TYPES.STRING, isColumn: false, isDoublePrecision: null };
export const typeStringColumn = { dataType: COMP_DATA_TYPES.STRING, isColumn: true, isDoublePrecision: null };
export const typeBooleanColumn = { dataType: COMP_DATA_TYPES.BOOLEAN, isColumn: true, isDoublePrecision: null };
export const typeBooleanScalar = { dataType: COMP_DATA_TYPES.BOOLEAN, isColumn: false, isDoublePrecision: null };
export const typeVectorColumn = { dataType: COMP_DATA_TYPES.VECTOR3D, isColumn: true, isDoublePrecision: null };
export const typeVectorScalar = { dataType: COMP_DATA_TYPES.VECTOR3D, isColumn: false, isDoublePrecision: null };
export const typeObject = { dataType: COMP_DATA_TYPES.OBJECT, isColumn: false, isDoublePrecision: null };
export const typeArray = { dataType: COMP_DATA_TYPES.ARRAY, isColumn: false, isDoublePrecision: null };
export const typeVoid = { dataType: COMP_DATA_TYPES.VOID, isColumn: false, isDoublePrecision: null };
export const typeArrayBuffer = { dataType: COMP_DATA_TYPES.ARRAY_BUFFER, isColumn: false, isDoublePrecision: null };


export function evalFunctionSync(computeCtx: TpComputeContext, func: TpComputeFunction, argumentList: any[]): any {
    if (func.functionDef.isAsync) throw createInternalError(`Expected sync func (found: ${func.functionDef.functionName})`);
    return func.overloadDef.eval(computeCtx, argumentList, func.outputType.isDoublePrecision);
}


export async function evalFunctionAsync(computeCtx: TpComputeContext, func: TpComputeFunction, argumentList: any[]): Promise<any> {
    if (!func.functionDef.isAsync) throw createInternalError(`Expected async func (found: ${func.functionDef.functionName})`);
    return await func.overloadDef.eval(computeCtx, argumentList, func.outputType.isDoublePrecision);
}


export function initFunctionDefs() {
    initFunctionDefs_Simple();
    initFunctionDefs_Stats();
    initFunctionDefs_Vector();
    initFunctionDefs_Actions_Generic();
    initFunctionDefs_Actions_Resources();
    initFunctionDefs_Actions_Form();
}