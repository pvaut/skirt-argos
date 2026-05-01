import { isCategoricalDataType } from "../../data/tables/interface";
import { createConfigError, createInternalError } from "../errors";
import { TpFunctionDef, TpFunctionOverloadDef } from "./functions-defs/functionsDefs";
import { formatType } from "./helpers";


export enum COMP_TOKEN_TYPES {
    BINARY_OPERATOR = "BINARY_OPERATOR",
    UNARY_NEG = "UNARY_NEG",
    NOT = "NOT",
    LITERAL_NUMBER = "LITERAL_NUMBER",
    LITERAL_STRING = "LITERAL_STRING",
    IDENTIFIER = "IDENTIFIER",
    FUNCTION = "FUNCTION",
    COMPOUND = "COMPOUND",
    ASSIGNMENT = "ASSIGNMENT",
    CONDITIONAL = "CONDITIONAL",
    OBJECT = "OBJECT",
    ARRAY = "ARRAY",
    // MEMBER_EXPRESSION = "MEMBER_EXPRESSION",
}


export enum COMP_DATA_TYPES {
    VOID = "void",
    NUMBER = "number",
    BOOLEAN = "boolean",
    VECTOR3D = "vector",
    STRING = "string",
    CATEGORICAL = "categorical",
    OBJECT = "OBJECT",
    ARRAY = "ARRAY",
    ARRAY_BUFFER = "Blob",
}


export const computeBinaryOperators = ['||', '&&', '+', '-', '*', '/', '**', '>', '<', '>=', '<=', '==', '!='];


export function isComputeBinaryOperatorArithmetic(op: string): boolean {
    return ['+', '-', '*', '/', '**'].includes(op);
}


export function isComputeBinaryOperatorComparison(op: string): boolean {
    return ['>', '<', '>=', '<=', '==', '!='].includes(op);
}


export function isComputeBinaryOperatorLogical(op: string): boolean {
    return ['&&', '||'].includes(op);
}


function isNumericComputeDataType(dataType: TpComputeOutputType): boolean {
    return (dataType.dataType == COMP_DATA_TYPES.NUMBER);
}


function getMostPreciseNumericalDataType(dataType1: TpComputeOutputType, dataType2: TpComputeOutputType): TpComputeOutputType {
    return {
        isColumn: dataType1.isColumn || dataType2.isColumn,
        dataType: COMP_DATA_TYPES.NUMBER,
        isDoublePrecision: dataType1.isDoublePrecision || dataType2.isDoublePrecision,
    };
}


function createComputeDataArray(colLen: number, dataType: TpComputeOutputType): any {
    if (!dataType.isColumn) throw createInternalError(`Cannot make data array for something that is not a column`);
    if (dataType.dataType == COMP_DATA_TYPES.NUMBER) {
        if (dataType.isDoublePrecision) return new Float64Array(colLen);
        else return new Float32Array(colLen);
    }
    throw createInternalError(`Don't know how to create ${dataType.dataType}`);
}


export interface TpComputeOutputType {
    dataType: COMP_DATA_TYPES,
    isColumn: boolean; // true: output is a table column ;  false: output is a scalar
    isDoublePrecision: boolean | null;
}


export interface TpComputeBinaryOperator {
    type: COMP_TOKEN_TYPES.BINARY_OPERATOR,
    operator: string,
    left: TpComputeOperator,
    right: TpComputeOperator,
    outputType: TpComputeOutputType,
}


export interface TpComputeUnaryNeg {
    type: COMP_TOKEN_TYPES.UNARY_NEG,
    arg: TpComputeOperator,
    outputType: TpComputeOutputType,
}

export interface TpComputeNot {
    type: COMP_TOKEN_TYPES.NOT,
    arg: TpComputeOperator,
    outputType: TpComputeOutputType,
}

export interface TpComputeLiteralNumber {
    type: COMP_TOKEN_TYPES.LITERAL_NUMBER,
    literal: number,
    outputType: TpComputeOutputType,
}


export interface TpComputeLiteralString {
    type: COMP_TOKEN_TYPES.LITERAL_STRING,
    literal: string,
    outputType: TpComputeOutputType,
}


export interface TpComputeIdentifier {
    type: COMP_TOKEN_TYPES.IDENTIFIER,
    id: string,
    outputType: TpComputeOutputType,
}


export interface TpComputeFunction {
    type: COMP_TOKEN_TYPES.FUNCTION,
    functionDef: TpFunctionDef,
    overloadDef: TpFunctionOverloadDef,
    argumentList: TpComputeOperator[],
    outputType: TpComputeOutputType,
}


export interface TpComputeCompound {
    type: COMP_TOKEN_TYPES.COMPOUND,
    items: TpComputeOperator[],
    outputType: TpComputeOutputType,
}


export interface TpComputeAssignment {
    type: COMP_TOKEN_TYPES.ASSIGNMENT,
    identifier: string;
    value: TpComputeOperator,
    outputType: TpComputeOutputType,
}


export interface TpComputeConditional {
    type: COMP_TOKEN_TYPES.CONDITIONAL,
    test: TpComputeOperator,
    consequent: TpComputeOperator,
    alternate: TpComputeOperator,
    outputType: TpComputeOutputType,
}


export interface TpComputeObject {
    type: COMP_TOKEN_TYPES.OBJECT,
    keyValues: {
        key: string,
        value: TpComputeOperator,
    }[],
    outputType: TpComputeOutputType,
}


export interface TpComputeArray {
    type: COMP_TOKEN_TYPES.ARRAY,
    elements: TpComputeOperator[],
    outputType: TpComputeOutputType,
}


// export interface TpComputeMemberExpression {
//     type: COMP_TOKEN_TYPES.MEMBER_EXPRESSION,
//     leftObject: TpComputeOperator,
//     key: string;
//     outputType: TpComputeOutputType,
// }


export type TpComputeOperator = TpComputeBinaryOperator | TpComputeUnaryNeg | TpComputeNot | TpComputeLiteralNumber | TpComputeLiteralString | TpComputeIdentifier | TpComputeFunction | TpComputeCompound | TpComputeAssignment | TpComputeConditional | TpComputeObject | TpComputeArray;


export function evalBinaryOperator(op: TpComputeBinaryOperator, inputLeft: any, inputRight: any): any {

    function isBasicType(dataType: string) {
        return (dataType == COMP_DATA_TYPES.NUMBER) || (dataType == COMP_DATA_TYPES.BOOLEAN)  || (dataType == COMP_DATA_TYPES.CATEGORICAL);
    }

    // NOTE: this implementation is very elaborate from a code perspective, in order to have super efficient inner loops in case expressions must be applied on large amounts of data

    let colLenBasicType: number | null = null;
    const leftIsColumn = op.left.outputType.isColumn;
    const rightIsColumn = op.right.outputType.isColumn;
    if (leftIsColumn)
        if (isBasicType(op.left.outputType.dataType))
            colLenBasicType = inputLeft.length;
    if (rightIsColumn) {
        if (isBasicType(op.right.outputType.dataType)) {
            if (colLenBasicType == null)
                colLenBasicType = inputRight.length;
            else if (colLenBasicType != inputRight.length) throw createInternalError(`Incompatible column lengths (${colLenBasicType}, ${inputRight.length})`);
        }
    }

    if (isComputeBinaryOperatorArithmetic(op.operator) && isNumericComputeDataType(op.left.outputType) && isNumericComputeDataType(op.right.outputType)) {
        let output: any = null;
        if (colLenBasicType != null) {
            output = createComputeDataArray(colLenBasicType, getMostPreciseNumericalDataType(op.left.outputType, op.right.outputType));
        }

        if (op.operator == '+') {
            // handle number + number
            if (leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] + inputRight[i];
            if (leftIsColumn && !rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] + inputRight;
            if (!leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft + inputRight[i];
            if (!leftIsColumn && !rightIsColumn)
                output = inputLeft + inputRight;
            return output;
        }

        if (op.operator == '-') {
            // handle number - number
            if (leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] - inputRight[i];
            if (leftIsColumn && !rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] - inputRight;
            if (!leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft - inputRight[i];
            if (!leftIsColumn && !rightIsColumn)
                output = inputLeft - inputRight;
            return output;
        }

        if (op.operator == '*') {
            // handle number * number
            if (leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] * inputRight[i];
            if (leftIsColumn && !rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] * inputRight;
            if (!leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft * inputRight[i];
            if (!leftIsColumn && !rightIsColumn)
                output = inputLeft * inputRight;
            return output;
        }

        if (op.operator == '/') { //@todo: contingency for division by zero?
            // handle number / number
            if (leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] / inputRight[i];
            if (leftIsColumn && !rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] / inputRight;
            if (!leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft / inputRight[i];
            if (!leftIsColumn && !rightIsColumn)
                output = inputLeft / inputRight;
            return output;
        }

        if (op.operator == '**') {
            // handle number ** number (power function)
            if (leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] ** inputRight[i];
            if (leftIsColumn && !rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] ** inputRight;
            if (!leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft ** inputRight[i];
            if (!leftIsColumn && !rightIsColumn)
                output = inputLeft ** inputRight;
            return output;
        }

    }

    if (isComputeBinaryOperatorComparison(op.operator) && isNumericComputeDataType(op.left.outputType) && isNumericComputeDataType(op.right.outputType)) {
        let output: any = null;
        if (colLenBasicType != null) {
            output = new Uint8Array(colLenBasicType);
        }

        if (op.operator == '<') {
            // handle number < number
            if (leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] < inputRight[i];
            if (leftIsColumn && !rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] < inputRight;
            if (!leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft < inputRight[i];
            if (!leftIsColumn && !rightIsColumn)
                output = inputLeft < inputRight;
            return output;
        }

        if (op.operator == '<=') {
            // handle number <= number
            if (leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] <= inputRight[i];
            if (leftIsColumn && !rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] <= inputRight;
            if (!leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft <= inputRight[i];
            if (!leftIsColumn && !rightIsColumn)
                output = inputLeft <= inputRight;
            return output;
        }

        if (op.operator == '>') {
            // handle number > number
            if (leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] > inputRight[i];
            if (leftIsColumn && !rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] > inputRight;
            if (!leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft > inputRight[i];
            if (!leftIsColumn && !rightIsColumn)
                output = inputLeft > inputRight;
            return output;
        }

        if (op.operator == '>=') {
            // handle number >= number
            if (leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] >= inputRight[i];
            if (leftIsColumn && !rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] >= inputRight;
            if (!leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft >= inputRight[i];
            if (!leftIsColumn && !rightIsColumn)
                output = inputLeft >= inputRight;
            return output;
        }

        if (op.operator == '==') {
            // handle number == number
            if (leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] == inputRight[i];
            if (leftIsColumn && !rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] == inputRight;
            if (!leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft == inputRight[i];
            if (!leftIsColumn && !rightIsColumn)
                output = inputLeft == inputRight;
            return output;
        }

        if (op.operator == '!=') {
            // handle number != number
            if (leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] != inputRight[i];
            if (leftIsColumn && !rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] != inputRight;
            if (!leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft != inputRight[i];
            if (!leftIsColumn && !rightIsColumn)
                output = inputLeft != inputRight;
            return output;
        }

    }

    if (isComputeBinaryOperatorComparison(op.operator) && (op.left.outputType.dataType == COMP_DATA_TYPES.CATEGORICAL) && (op.right.outputType.dataType == COMP_DATA_TYPES.STRING)) {
        if (op.operator == '==' && leftIsColumn && !rightIsColumn) {
            // handle categorical[] == string, as this is a construct expected to be used
            let output = new Uint8Array(colLenBasicType!) as any;
            for (let i = 0; i < colLenBasicType!; i++) output[i] = (inputLeft[i] == inputRight);
            return output;
        }
    }

    if (isComputeBinaryOperatorLogical(op.operator) && (op.left.outputType.dataType == COMP_DATA_TYPES.BOOLEAN) && (op.right.outputType.dataType == COMP_DATA_TYPES.BOOLEAN)) {
        let output: any = null;
        if (colLenBasicType != null) {
            output = new Uint8Array(colLenBasicType);
        }

        if (op.operator == '&&') {
            // handle boolean && boolean
            if (leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] && inputRight[i];
            if (leftIsColumn && !rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] && inputRight;
            if (!leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft && inputRight[i];
            if (!leftIsColumn && !rightIsColumn)
                output == inputLeft && inputRight;
            return output;
        }

        if (op.operator == '||') {
            // handle boolean || boolean
            if (leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] || inputRight[i];
            if (leftIsColumn && !rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft[i] || inputRight;
            if (!leftIsColumn && rightIsColumn)
                for (let i = 0; i < colLenBasicType!; i++) output[i] = inputLeft || inputRight[i];
            if (!leftIsColumn && !rightIsColumn)
                output == inputLeft || inputRight;
            return output;
        }
    }

    if ((op.operator == '+') && (op.left.outputType.dataType == COMP_DATA_TYPES.VECTOR3D) && (op.right.outputType.dataType == COMP_DATA_TYPES.VECTOR3D)) {
        // handle vector + vector
        if (leftIsColumn && rightIsColumn) {
            // when both arguments are columns
            const inputLeftX = inputLeft.x;
            const inputLeftY = inputLeft.y;
            const inputLeftZ = inputLeft.z;
            const inputRightX = inputRight.x;
            const inputRightY = inputRight.y;
            const inputRightZ = inputRight.z;
            const colLenVec = inputRightX.length;
            const outputX = new Float32Array(colLenVec);
            const outputY = new Float32Array(colLenVec);
            const outputZ = new Float32Array(colLenVec);
            for (let i = 0; i < colLenVec; i++) {
                outputX[i] = inputLeftX[i] + inputRightX[i];
                outputY[i] = inputLeftY[i] + inputRightY[i];
                outputZ[i] = inputLeftZ[i] + inputRightZ[i];
            }
            return { x: outputX, y: outputY, z: outputZ };
        }
        if (leftIsColumn && !rightIsColumn) {
            // when only left argument is column
            const inputLeftX = inputLeft.x;
            const inputLeftY = inputLeft.y;
            const inputLeftZ = inputLeft.z;
            const colLenVec = inputLeftX.length;
            const outputX = new Float32Array(colLenVec);
            const outputY = new Float32Array(colLenVec);
            const outputZ = new Float32Array(colLenVec);
            for (let i = 0; i < colLenVec; i++) {
                outputX[i] = inputLeftX[i] + inputRight.x;
                outputY[i] = inputLeftY[i] + inputRight.y;
                outputZ[i] = inputLeftZ[i] + inputRight.z;
            }
            return { x: outputX, y: outputY, z: outputZ };
        }
        if (!leftIsColumn && rightIsColumn) {
            // when only right argument is column
            const inputRightX = inputRight.x;
            const inputRightY = inputRight.y;
            const inputRightZ = inputRight.z;
            const colLenVec = inputRightX.length;
            const outputX = new Float32Array(colLenVec);
            const outputY = new Float32Array(colLenVec);
            const outputZ = new Float32Array(colLenVec);
            for (let i = 0; i < colLenVec; i++) {
                outputX[i] = inputLeft.x + inputRightX[i];
                outputY[i] = inputLeft.y + inputRightY[i];
                outputZ[i] = inputLeft.z + inputRightZ[i];
            }
            return { x: outputX, y: outputY, z: outputZ };
        }
        if (!leftIsColumn && !rightIsColumn) {
            // when both arguments are single values
            return {
                x: inputLeft.x + inputRight.x,
                y: inputLeft.y + inputRight.y,
                z: inputLeft.z + inputRight.z
            };
        }
    }

    if ((op.operator == '-') && (op.left.outputType.dataType == COMP_DATA_TYPES.VECTOR3D) && (op.right.outputType.dataType == COMP_DATA_TYPES.VECTOR3D)) {
        // handle vector - vector
        if (leftIsColumn && rightIsColumn) {
            // when both arguments are columns
            const inputLeftX = inputLeft.x;
            const inputLeftY = inputLeft.y;
            const inputLeftZ = inputLeft.z;
            const inputRightX = inputRight.x;
            const inputRightY = inputRight.y;
            const inputRightZ = inputRight.z;
            const colLenVec = inputRightX.length;
            const outputX = new Float32Array(colLenVec);
            const outputY = new Float32Array(colLenVec);
            const outputZ = new Float32Array(colLenVec);
            for (let i = 0; i < colLenVec; i++) {
                outputX[i] = inputLeftX[i] - inputRightX[i];
                outputY[i] = inputLeftY[i] - inputRightY[i];
                outputZ[i] = inputLeftZ[i] - inputRightZ[i];
            }
            return { x: outputX, y: outputY, z: outputZ };
        }
        if (leftIsColumn && !rightIsColumn) {
            // when only left argument is column
            const inputLeftX = inputLeft.x;
            const inputLeftY = inputLeft.y;
            const inputLeftZ = inputLeft.z;
            const colLenVec = inputLeftX.length;
            const outputX = new Float32Array(colLenVec);
            const outputY = new Float32Array(colLenVec);
            const outputZ = new Float32Array(colLenVec);
            for (let i = 0; i < colLenVec; i++) {
                outputX[i] = inputLeftX[i] - inputRight.x;
                outputY[i] = inputLeftY[i] - inputRight.y;
                outputZ[i] = inputLeftZ[i] - inputRight.z;
            }
            return { x: outputX, y: outputY, z: outputZ };
        }
        if (!leftIsColumn && rightIsColumn) {
            // when only right argument is column
            const inputRightX = inputRight.x;
            const inputRightY = inputRight.y;
            const inputRightZ = inputRight.z;
            const colLenVec = inputRightX.length;
            const outputX = new Float32Array(colLenVec);
            const outputY = new Float32Array(colLenVec);
            const outputZ = new Float32Array(colLenVec);
            for (let i = 0; i < colLenVec; i++) {
                outputX[i] = inputLeft.x - inputRightX[i];
                outputY[i] = inputLeft.y - inputRightY[i];
                outputZ[i] = inputLeft.z - inputRightZ[i];
            }
            return { x: outputX, y: outputY, z: outputZ };
        }
        if (!leftIsColumn && !rightIsColumn) {
            // when both arguments are single values
            return {
                x: inputLeft.x - inputRight.x,
                y: inputLeft.y - inputRight.y,
                z: inputLeft.z - inputRight.z
            };
        }
    }

    if ((op.operator == '*') && (op.left.outputType.dataType == COMP_DATA_TYPES.NUMBER) && (op.right.outputType.dataType == COMP_DATA_TYPES.VECTOR3D)) {
        // handle number * vector
        if (leftIsColumn && rightIsColumn) {
            // column * column
            const inputRightX = inputRight.x;
            const inputRightY = inputRight.y;
            const inputRightZ = inputRight.z;
            const colLenVec = inputRightX.length;
            const outputX = new Float32Array(colLenVec);
            const outputY = new Float32Array(colLenVec);
            const outputZ = new Float32Array(colLenVec);
            for (let i = 0; i < colLenVec; i++) {
                outputX[i] = inputLeft[i] * inputRightX[i];
                outputY[i] = inputLeft[i] * inputRightY[i];
                outputZ[i] = inputLeft[i] * inputRightZ[i];
            }
            return { x: outputX, y: outputY, z: outputZ };
        }
        if (!leftIsColumn && rightIsColumn) {
            // single value * column
            const inputRightX = inputRight.x;
            const inputRightY = inputRight.y;
            const inputRightZ = inputRight.z;
            const colLenVec = inputRightX.length;
            const outputX = new Float32Array(colLenVec);
            const outputY = new Float32Array(colLenVec);
            const outputZ = new Float32Array(colLenVec);
            for (let i = 0; i < colLenVec; i++) {
                outputX[i] = inputLeft * inputRightX[i];
                outputY[i] = inputLeft * inputRightY[i];
                outputZ[i] = inputLeft * inputRightZ[i];
            }
            return { x: outputX, y: outputY, z: outputZ };
        }
        if (!leftIsColumn && !rightIsColumn) {
            // single value * single value
            return {
                x: inputLeft * inputRight.x,
                y: inputLeft * inputRight.y,
                z: inputLeft * inputRight.z
            };
        }
    }

    if ((op.operator == '/') && (op.left.outputType.dataType == COMP_DATA_TYPES.VECTOR3D) && (op.right.outputType.dataType == COMP_DATA_TYPES.NUMBER)) {
        // handle vector / number
        if (leftIsColumn) {
            // when vector is a column
            const inputLeftX = inputLeft.x;
            const inputLeftY = inputLeft.y;
            const inputLeftZ = inputLeft.z;
            const colLenVec = inputLeftX.length;
            const outputX = new Float32Array(colLenVec);
            const outputY = new Float32Array(colLenVec);
            const outputZ = new Float32Array(colLenVec);
            for (let i = 0; i < colLenVec; i++) {
                outputX[i] = inputLeftX[i] / inputRight;
                outputY[i] = inputLeftY[i] / inputRight;
                outputZ[i] = inputLeftZ[i] / inputRight;
            }
            return { x: outputX, y: outputY, z: outputZ };
        } else {
            // when vector is a single value
            return {
                x: inputLeft.x / inputRight,
                y: inputLeft.y / inputRight,
                z: inputLeft.z / inputRight
            };
        }
    }

    if ((op.operator == '+') && (op.left.outputType.dataType == COMP_DATA_TYPES.STRING) && (op.right.outputType.dataType == COMP_DATA_TYPES.STRING)) {
        if (!leftIsColumn && !rightIsColumn) {
            return inputLeft + inputRight;
        }
    }


    throw createConfigError(`Unable to process operator ${op.operator} on ${op.left.outputType.dataType}, ${op.right.outputType.dataType}`);
}


export function evalConditionalExpressionColumn(inputTest: any, inputConsequent: any, inputAlternate: any, outputDataType: TpComputeOutputType) {
    if (outputDataType.dataType == COMP_DATA_TYPES.STRING) {
        const result: string[] = [];
        for (const el of inputTest)
            if (el) result.push(inputConsequent)
            else result.push(inputAlternate);
        return result;
    }
    throw createConfigError(`Don't know how to process output type ${formatType(outputDataType)} for a column-oriented conditional expression`);
}