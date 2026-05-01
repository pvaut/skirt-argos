import { createConfigError } from "../../errors";
import { getPointsInsidePolygon } from "../../geometry/point2D";
import { createNumericArray, TpComputeContext, TpComputeDataVectorColumn, TpNumericArray } from "../interface";
import { addFunctionDef, typeArray, typeBooleanColumn, typeNumberColumn, typeNumberScalar, typeVectorColumn } from "./functionsDefs";


export function evalArithmeticMean(arg: TpNumericArray): number {
    const colLen = arg.length;
    if (colLen == 0) return NaN;
    let sum = 0;
    for (let i = 0; i < colLen; i++) sum += arg[i];
    return sum / colLen;
}


export function evalArithmeticMeanMasked(arg: TpNumericArray, mask: Uint8Array): number {
    const colLen = arg.length;
    let count = 0;
    let sum = 0;
    for (let i = 0; i < colLen; i++)
        if (mask[i]) {
            count++;
            sum += arg[i];
        }
    if (count == 0) return NaN;
    return sum / count;
}


function evalArithmeticMin(arg: TpNumericArray): number {
    const colLen = arg.length;
    if (colLen == 0) return NaN;
    let val = Number.MAX_VALUE;
    for (let i = 0; i < colLen; i++)
        if (arg[i] < val) val = arg[i];
    return val;
}


function evalArithmeticMinMasked(arg: TpNumericArray, mask: Uint8Array): number {
    const colLen = arg.length;
    if (colLen == 0) return NaN;
    let val = Number.MAX_VALUE;
    for (let i = 0; i < colLen; i++)
        if (mask[i])
            if (arg[i] < val) val = arg[i];
    return val;
}


function evalArithmeticMax(arg: TpNumericArray): number {
    const colLen = arg.length;
    if (colLen == 0) return NaN;
    let val = -Number.MAX_VALUE;
    for (let i = 0; i < colLen; i++)
        if (arg[i] > val) val = arg[i];
    return val;
}


function evalArithmeticMaxMasked(arg: TpNumericArray, mask: Uint8Array): number {
    const colLen = arg.length;
    if (colLen == 0) return NaN;
    let val = -Number.MAX_VALUE;
    for (let i = 0; i < colLen; i++)
        if (mask[i])
            if (arg[i] > val) val = arg[i];
    return val;
}


function evalCountTrue(arg: Uint8Array): number {
    let count = 0;
    const colLen = arg.length;
    if (colLen == 0) return 0;
    for (let i = 0; i < colLen; i++)
        if (arg[i]) count++;
    return count;
}


function evalPoints2DInPolygon(x: TpNumericArray, y: TpNumericArray, polygonArray: number[]): Uint8Array {
    const polygonPoints: { x: number, y: number }[] = [];
    for (let i = 0; i < polygonArray.length; i += 2)
        polygonPoints.push({ x: polygonArray[i], y: polygonArray[i + 1] })
    return getPointsInsidePolygon(polygonPoints, x, y);
}

function evalPoints3DInPolygon(position: TpComputeDataVectorColumn, fx0: number, fxx: number, fxy: number, fxz: number, fy0: number, fyx: number, fyy: number, fyz: number, polygonArray: number[]): Uint8Array {
    const polygonPoints: { x: number, y: number }[] = [];
    for (let i = 0; i < polygonArray.length; i += 2)
        polygonPoints.push({ x: polygonArray[i], y: polygonArray[i + 1] })

    const values3DX = position.x;
    const values3DY = position.y;
    const values3DZ = position.z;
    const values2DX: number[] = [];
    const values2DY: number[] = [];
    for (let i = 0; i < values3DX.length; i++) {
        const x = values3DX[i], y = values3DY[i], z = values3DZ[i];
        values2DX.push(fx0 + fxx * x + fxy * y + fxz * z);
        values2DY.push(fy0 + fyx * x + fyy * y + fyz * z);
    }

    return getPointsInsidePolygon(polygonPoints, values2DX, values2DY);
}


function filterColNumeric(arg: TpNumericArray, mask: Uint8Array, useDoublePrecision: boolean | null): TpNumericArray {
    if (arg.length != mask.length) throw createConfigError("Incompatible lengths");
    const colLenOrig = arg.length;
    let output = createNumericArray(colLenOrig, useDoublePrecision);
    let i2 = 0;
    for (let i = 0; i < colLenOrig; i++) {
        output[i2] = arg[2];
        i2++;
    }
    return output.slice(0, i2);
}


export function initFunctionDefs_Stats() {

    addFunctionDef({
        functionName: 'columnMean',
        description: "Arithmetic mean of all values in a column. The optional mask defines on what rows to apply the statistic on.",
        isVectorType: false,

        overloads: [
            {
                id: 'basic',
                arguments: [
                    { name: 'arg', inputType: typeNumberColumn }
                ],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalArithmeticMean(argList[0]),
            },
            {
                id: 'with_mask',
                arguments: [
                    { name: 'arg', inputType: typeNumberColumn },
                    { name: 'mask', inputType: typeBooleanColumn },
                ],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalArithmeticMeanMasked(argList[0], argList[1]),
            },
        ],
    });

    addFunctionDef({
        functionName: 'columnMin',
        description: "Minimum of all values in a column. The optional mask defines on what rows to apply the statistic on.",
        isVectorType: false,

        overloads: [
            {
                id: 'basic',
                arguments: [
                    { name: 'arg', inputType: typeNumberColumn }
                ],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalArithmeticMin(argList[0]),
            },
            {
                id: 'with_mask',
                arguments: [
                    { name: 'arg', inputType: typeNumberColumn },
                    { name: 'mask', inputType: typeBooleanColumn },
                ],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalArithmeticMinMasked(argList[0], argList[1]),
            },
        ],
    });

    addFunctionDef({
        functionName: 'columnMax',
        description: "Maximum of all values in a column. The optional mask defines on what rows to apply the statistic on.",
        isVectorType: false,

        overloads: [
            {
                id: 'basic',
                arguments: [
                    { name: 'arg', inputType: typeNumberColumn }
                ],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalArithmeticMax(argList[0]),
            },
            {
                id: 'with_mask',
                arguments: [
                    { name: 'arg', inputType: typeNumberColumn },
                    { name: 'mask', inputType: typeBooleanColumn },
                ],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalArithmeticMaxMasked(argList[0], argList[1]),
            },
        ],
    });

    addFunctionDef({
        functionName: 'columnFilter',
        description: "Filters a column using a boolean mask.",
        isVectorType: false,

        overloads: [
            {
                id: 'number',
                arguments: [
                    { name: 'arg', inputType: typeNumberColumn },
                    { name: 'mask', inputType: typeBooleanColumn },
                ],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => filterColNumeric(argList[0], argList[1], useDoublePrecision),
            },
        ],
    });

    addFunctionDef({
        functionName: 'columnTrueCount',
        description: "Number of true values in a column.",
        isVectorType: false,

        overloads: [
            {
                id: 'basic',
                arguments: [
                    { name: 'arg', inputType: typeBooleanColumn }
                ],
                outputType: typeNumberScalar,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalCountTrue(argList[0]),
            },
        ],
    });

    addFunctionDef({
        functionName: 'points2DInPolygon',
        description: "Returns a boolean column that determines which 2D points are inside a polygon.",
        isVectorType: false,

        overloads: [
            {
                id: 'basic',
                arguments: [
                    { name: 'x', inputType: typeNumberColumn },
                    { name: 'y', inputType: typeNumberColumn },
                    { name: 'polygon', inputType: typeArray }
                ],
                outputType: typeBooleanColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalPoints2DInPolygon(argList[0], argList[1], argList[2]),
            },
        ],
    });

    addFunctionDef({
        functionName: 'points3DInPolygon',
        description: "Returns a boolean column that determines which 3D points are inside a polygon.",
        isVectorType: false,

        overloads: [
            {
                id: 'basic',
                arguments: [
                    { name: 'position', inputType: typeVectorColumn },
                    { name: 'fx0', inputType: typeNumberScalar },
                    { name: 'fxx', inputType: typeNumberScalar },
                    { name: 'fxy', inputType: typeNumberScalar },
                    { name: 'fxz', inputType: typeNumberScalar },
                    { name: 'fy0', inputType: typeNumberScalar },
                    { name: 'fyx', inputType: typeNumberScalar },
                    { name: 'fyy', inputType: typeNumberScalar },
                    { name: 'fyz', inputType: typeNumberScalar },
                    { name: 'polygon', inputType: typeArray }
                ],
                outputType: typeBooleanColumn,
                eval: (computeCtx: TpComputeContext, argList: any[], useDoublePrecision: boolean | null) => evalPoints3DInPolygon(
                    argList[0], argList[1], argList[2], argList[3], argList[4], argList[5], argList[6], argList[7], argList[8], argList[9]),
            },
        ],
    });

}