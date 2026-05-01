
import { createNumericArray, TpComputeContext, TpComputeDataNumberColumn, TpComputeDataVectorColumn, TpComputeDataVectorScalar } from "../interface";
import { addFunctionDef, typeBooleanColumn, typeNumberColumn, typeNumberScalar, typeVectorColumn, typeVectorScalar } from "./functionsDefs";
import { evalArithmeticMean, evalArithmeticMeanMasked } from "./functionsDefs_Stats";


function createVectorColumn(len: number, useDoublePrecision: boolean | null): TpComputeDataVectorColumn {
    return {
        x: createNumericArray(len, useDoublePrecision),
        y: createNumericArray(len, useDoublePrecision),
        z: createNumericArray(len, useDoublePrecision),
    }
}


function vecColumnLength(col: TpComputeDataVectorColumn): number {
    return col.x.length;
}


function vecScalar2Column(value: TpComputeDataVectorScalar, len: number, useDoublePrecision: boolean | null): TpComputeDataVectorColumn {
    const output = createVectorColumn(len, useDoublePrecision);
    for (let i = 0; i < len; i++) {
        output.x[i] = value.x;
        output.y[i] = value.y;
        output.z[i] = value.z;
    }
    return output;
}


function computeDotProd(arg1: TpComputeDataVectorColumn, arg2: TpComputeDataVectorColumn, useDoublePrecision: boolean | null): TpComputeDataNumberColumn {
    const len = arg1.x.length;
    const output = createNumericArray(len, useDoublePrecision);
    for (let i = 0; i < len; i++)
        output[i] = arg1.x[i] * arg2.x[i] + arg1.y[i] * arg2.y[i] + arg1.z[i] * arg2.z[i];
    return output;
}


export function initFunctionDefs_Vector() {

    addFunctionDef({
        functionName: 'vector',
        description: "Returns a vector, provided the x, y and z components.",
        isVectorType: true,

        overloads: [
            {
                id: 'scalar',
                arguments: [
                    { name: 'x', inputType: typeNumberScalar },
                    { name: 'y', inputType: typeNumberScalar },
                    { name: 'z', inputType: typeNumberScalar },
                ],
                outputType: typeVectorScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => ({ x: argList[0], y: argList[1], z: argList[2] }),
            },
            {
                id: 'column',
                arguments: [
                    { name: 'x', inputType: typeNumberColumn },
                    { name: 'y', inputType: typeNumberColumn },
                    { name: 'z', inputType: typeNumberColumn },
                ],
                outputType: typeVectorColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    return {
                        x: argList[0].slice(0),
                        y: argList[1].slice(0),
                        z: argList[2].slice(0),
                    }
                },
            },
        ],
    });

    addFunctionDef({
        functionName: 'vecX',
        description: "Returns the X component of a vector.",
        isVectorType: true,

        overloads: [
            {
                id: 'scalar',
                arguments: [
                    { name: 'arg', inputType: typeVectorScalar },
                ],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => (argList[0].x),
            },
            {
                id: 'column',
                arguments: [
                    { name: 'arg', inputType: typeVectorColumn },
                ],
                outputType: typeNumberColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => (argList[0].x.slice(0)),
            },
        ],
    });

    addFunctionDef({
        functionName: 'vecY',
        description: "Returns the Y component of a vector.",
        isVectorType: true,

        overloads: [
            {
                id: 'scalar',
                arguments: [
                    { name: 'arg', inputType: typeVectorScalar },
                ],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => (argList[0].y),
            },
            {
                id: 'column',
                arguments: [
                    { name: 'arg', inputType: typeVectorColumn },
                ],
                outputType: typeNumberColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => (argList[0].y.slice(0)),
            },
        ],
    });

    addFunctionDef({
        functionName: 'vecZ',
        description: "Returns the Z component of a vector.",
        isVectorType: true,

        overloads: [
            {
                id: 'scalar',
                arguments: [
                    { name: 'arg', inputType: typeVectorScalar },
                ],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => (argList[0].z),
            },
            {
                id: 'column',
                arguments: [
                    { name: 'arg', inputType: typeVectorColumn },
                ],
                outputType: typeNumberColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => (argList[0].z.slice(0)),
            },
        ],
    });

    addFunctionDef({
        functionName: 'vecSize',
        description: "Returns the size a vector.",
        isVectorType: true,

        overloads: [
            {
                id: 'scalar',
                arguments: [
                    { name: 'arg', inputType: typeVectorScalar },
                ],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: any[]) => (Math.sqrt(argList[0].x ** 2 + argList[0].y ** 2 + argList[0].z ** 2)),
            },
            {
                id: 'column',
                arguments: [
                    { name: 'arg', inputType: typeVectorColumn },
                ],
                outputType: typeNumberColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    const inputX = argList[0].x;
                    const inputY = argList[0].y;
                    const inputZ = argList[0].z;
                    const len = inputX.length;
                    //const outputVectorColumn = createVectorColumn(len);
                    const outputColumn = createNumericArray(len, useDoublePrecision);
                    for (let i = 0; i < len; i++)
                        outputColumn[i] = Math.sqrt(inputX[i] ** 2 + inputY[i] ** 2 + inputZ[i] ** 2);
                    return outputColumn;
                },
            },
        ],
    });

    addFunctionDef({
        functionName: 'vecNorm',
        description: "Returns a vector normalized to unit length.",
        isVectorType: true,

        overloads: [
            {
                id: 'scalar',
                arguments: [
                    { name: 'arg', inputType: typeVectorScalar },
                ],
                outputType: typeVectorScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    const size = Math.sqrt(argList[0].x ** 2 + argList[0].y ** 2 + argList[0].z ** 2);
                    return {
                        x: argList[0].x / size,
                        y: argList[0].y / size,
                        z: argList[0].z / size,
                    }
                },
            },
            {
                id: 'column',
                arguments: [
                    { name: 'arg', inputType: typeVectorColumn },
                ],
                outputType: typeVectorColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    const inputX = argList[0].x;
                    const inputY = argList[0].y;
                    const inputZ = argList[0].z;
                    const len = inputX.length;
                    const outputVectorColumn = createVectorColumn(len, useDoublePrecision);
                    for (let i = 0; i < len; i++) {
                        const size = Math.sqrt(inputX[i] ** 2 + inputY[i] ** 2 + inputZ[i] ** 2);
                        outputVectorColumn.x[i] = inputX[i] / size;
                        outputVectorColumn.y[i] = inputY[i] / size;
                        outputVectorColumn.z[i] = inputZ[i] / size;
                    }
                    return outputVectorColumn;
                },
            },
        ],
    });

    addFunctionDef({
        functionName: 'vecDot',
        description: "Returns the dot product of two vectors.",
        isVectorType: true,

        overloads: [
            {
                id: 'scalar_scalar',
                arguments: [
                    { name: 'arg1', inputType: typeVectorScalar },
                    { name: 'arg2', inputType: typeVectorScalar },
                ],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => (argList[0].x * argList[1].x + argList[0].y * argList[1].y + argList[0].z * argList[1].z),
            },
            {
                id: 'column_column',
                arguments: [
                    { name: 'arg1', inputType: typeVectorColumn },
                    { name: 'arg2', inputType: typeVectorColumn },
                ],
                outputType: typeNumberColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    return computeDotProd(argList[0], argList[1], useDoublePrecision);
                },
            },
            {
                id: 'scalar_column',
                arguments: [
                    { name: 'arg1', inputType: typeVectorScalar },
                    { name: 'arg2', inputType: typeVectorColumn },
                ],
                outputType: typeNumberColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    return computeDotProd(vecScalar2Column(argList[0], vecColumnLength(argList[1]), useDoublePrecision), argList[1], useDoublePrecision);
                },
            },
            {
                id: 'column_scalar',
                arguments: [
                    { name: 'arg1', inputType: typeVectorColumn },
                    { name: 'arg2', inputType: typeVectorScalar },
                ],
                outputType: typeNumberColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    return computeDotProd(argList[0], vecScalar2Column(argList[1], vecColumnLength(argList[0]), useDoublePrecision), useDoublePrecision);
                },
            },
        ],
    });

    addFunctionDef({
        functionName: 'vecColumnMean',
        description: "Returns the mean of all vectors in a column. The optional mask defines on what rows to apply the statistic on.",
        isVectorType: true,

        overloads: [
            {
                id: 'basic',
                arguments: [
                    { name: 'arg', inputType: typeVectorColumn },
                ],
                outputType: typeVectorScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    return {
                        x: evalArithmeticMean(argList[0].x),
                        y: evalArithmeticMean(argList[0].y),
                        z: evalArithmeticMean(argList[0].z),
                    };
                },
            },
            {
                id: 'with_mask',
                arguments: [
                    { name: 'arg', inputType: typeVectorColumn },
                    { name: 'mask', inputType: typeBooleanColumn },
                ],
                outputType: typeVectorScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => {
                    return {
                        x: evalArithmeticMeanMasked(argList[0].x, argList[1]),
                        y: evalArithmeticMeanMasked(argList[0].y, argList[1]),
                        z: evalArithmeticMeanMasked(argList[0].z, argList[1]),
                    };
                },
            },
        ],
    });



}