import { createNumericArray, TpComputeContext, TpNumericArray } from "../interface";
import { addFunctionDef, typeNumberColumn, typeNumberScalar, typeStringScalar } from "./functionsDefs";



function evalColumnLog10(arg: TpNumericArray, useDoublePrecision: boolean | null): TpNumericArray {
    const colLen = arg.length;
    const output = createNumericArray(colLen, useDoublePrecision);
    for (let i = 0; i < colLen; i++) output[i] = Math.log10(arg[i]);
    return output;
}


function evalColColMin(arg1: TpNumericArray, arg2: TpNumericArray, useDoublePrecision: boolean | null): TpNumericArray {
    const colLen = arg1.length;
    const output = createNumericArray(colLen, useDoublePrecision);
    for (let i = 0; i < colLen; i++) output[i] = Math.min(arg1[i], arg2[i]);
    return output;
}


function evalColScalarMin(arg1: TpNumericArray, arg2: number, useDoublePrecision: boolean | null): TpNumericArray {
    const colLen = arg1.length;
    const output = createNumericArray(colLen, useDoublePrecision);
    for (let i = 0; i < colLen; i++) output[i] = Math.min(arg1[i], arg2);
    return output;
}


function evalColColMax(arg1: TpNumericArray, arg2: TpNumericArray, useDoublePrecision: boolean | null): TpNumericArray {
    const colLen = arg1.length;
    const output = createNumericArray(colLen, useDoublePrecision);
    for (let i = 0; i < colLen; i++) output[i] = Math.max(arg1[i], arg2[i]);
    return output;
}


function evalColScalarMax(arg1: TpNumericArray, arg2: number, useDoublePrecision: boolean | null): TpNumericArray {
    const colLen = arg1.length;
    const output = createNumericArray(colLen, useDoublePrecision);
    for (let i = 0; i < colLen; i++) output[i] = Math.max(arg1[i], arg2);
    return output;
}


function evalClipRange(col: TpNumericArray, minVal: number, maxVal: number, useDoublePrecision: boolean | null): TpNumericArray {
    const colLen = col.length;
    const output = createNumericArray(colLen, useDoublePrecision);
    for (let i = 0; i < colLen; i++) output[i] = Math.max(minVal, Math.min(maxVal, col[i]));
    return output;
}

function evalTrimRange(col: TpNumericArray, minVal: number, maxVal: number, useDoublePrecision: boolean | null): TpNumericArray {
    const colLen = col.length;
    const output = createNumericArray(colLen, useDoublePrecision);
    for (let i = 0; i < colLen; i++)
        output[i] = (col[i] >= minVal) && (col[i] <= maxVal) ? col[i] : NaN;
    return output;
}


export function initFunctionDefs_Simple() {

    addFunctionDef({
        functionName: 'log10',
        description: "Logarithm with base 10",
        isVectorType: false,

        overloads: [
            {
                id: 'column',
                arguments: [{
                    name: 'arg',
                    inputType: typeNumberColumn,
                }],
                outputType: typeNumberColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalColumnLog10(argList[0], useDoublePrecision),
            },
            {
                id: 'scalar',
                arguments: [
                    { name: 'arg', inputType: typeNumberScalar }
                ],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: number[], useDoublePrecision: boolean | null) => Math.log10(argList[0]),
            },
        ],
    });

    addFunctionDef({
        functionName: 'min',
        description: "Minimum of two values",
        isVectorType: false,

        overloads: [
            {
                id: 'col_col',
                arguments: [
                    { name: 'arg1', inputType: typeNumberColumn },
                    { name: 'arg2', inputType: typeNumberColumn },
                ],
                outputType: typeNumberColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalColColMin(argList[0], argList[1], useDoublePrecision),
            },
            {
                id: 'col_scalar',
                arguments: [
                    { name: 'arg1', inputType: typeNumberColumn },
                    { name: 'arg2', inputType: typeNumberScalar },
                ],
                outputType: typeNumberColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalColScalarMin(argList[0], argList[1], useDoublePrecision),
            },
            {
                id: 'scalar_col',
                arguments: [
                    { name: 'arg1', inputType: typeNumberScalar },
                    { name: 'arg2', inputType: typeNumberColumn },
                ],
                outputType: typeNumberColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalColScalarMin(argList[1], argList[0], useDoublePrecision),
            },
            {
                id: 'scalar_scalar',
                arguments: [
                    { name: 'arg1', inputType: typeNumberScalar },
                    { name: 'arg2', inputType: typeNumberScalar },
                ],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: any[]) => Math.min(argList[0], argList[1]),
            },
        ],
    });

    addFunctionDef({
        functionName: 'max',
        description: "Maximum of two values",
        isVectorType: false,

        overloads: [
            {
                id: 'col_col',
                arguments: [
                    { name: 'arg1', inputType: typeNumberColumn },
                    { name: 'arg2', inputType: typeNumberColumn },
                ],
                outputType: typeNumberColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalColColMax(argList[0], argList[1], useDoublePrecision),
            },
            {
                id: 'col_scalar',
                arguments: [
                    { name: 'arg1', inputType: typeNumberColumn },
                    { name: 'arg2', inputType: typeNumberScalar },
                ],
                outputType: typeNumberColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalColScalarMax(argList[0], argList[1], useDoublePrecision),
            },
            {
                id: 'scalar_col',
                arguments: [
                    { name: 'arg1', inputType: typeNumberScalar },
                    { name: 'arg2', inputType: typeNumberColumn },
                ],
                outputType: typeNumberColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalColScalarMax(argList[1], argList[0], useDoublePrecision),
            },
            {
                id: 'scalar_scalar',
                arguments: [
                    { name: 'arg1', inputType: typeNumberScalar },
                    { name: 'arg2', inputType: typeNumberScalar },
                ],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: any[]) => Math.max(argList[0], argList[1]),
            },
        ],
    });

    addFunctionDef({
        functionName: 'clipRange',
        description: "Caps the value of a numerical column to a specified minimum and maximum value",
        isVectorType: false,

        overloads: [
            {
                id: 'col',
                arguments: [
                    { name: 'column', inputType: typeNumberColumn },
                    { name: 'minVal', inputType: typeNumberScalar },
                    { name: 'maxVal', inputType: typeNumberScalar },
                ],
                outputType: typeNumberColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalClipRange(argList[0], argList[1], argList[2], useDoublePrecision),
            },
        ],
    });

    addFunctionDef({
        functionName: 'trimRange',
        description: "Removes values from a numerical column that are outside a specified minimum and maximum value",
        isVectorType: false,

        overloads: [
            {
                id: 'col',
                arguments: [
                    { name: 'column', inputType: typeNumberColumn },
                    { name: 'minVal', inputType: typeNumberScalar },
                    { name: 'maxVal', inputType: typeNumberScalar },
                ],
                outputType: typeNumberColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalTrimRange(argList[0], argList[1], argList[2], useDoublePrecision),
            },
        ],
    });


    addFunctionDef({
        functionName: 'toString',
        description: "Converts a value to a string",
        isVectorType: false,

        overloads: [
            {
                id: 'number',
                arguments: [{
                    name: 'arg',
                    inputType: typeNumberScalar,
                }],
                outputType: typeStringScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => String(argList[0]),
            },
        ],
    });

    addFunctionDef({
        functionName: 'random',
        description: "Returns a random value between 0 and 1",
        isVectorType: false,

        overloads: [
            {
                id: 'default',
                arguments: [],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => Math.random(),
            },
        ],
    });


}