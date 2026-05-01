import { TpIssue } from "../../data/interfaces";
import { DT_CATEGORICAL, DT_VECTOR3D, TpColumnData } from "../../data/tables/interface";
import jsep from 'jsep';
import jsepAssignment from '@jsep-plugin/assignment';

import jsepObject, { ObjectExpression } from '@jsep-plugin/object';

import { createConfigError, createInternalError, createUserError, ERROR_CAUSES, reportException } from "../errors";
import {
    COMP_DATA_TYPES, COMP_TOKEN_TYPES, computeBinaryOperators, evalBinaryOperator,
    isComputeBinaryOperatorArithmetic, isComputeBinaryOperatorComparison, TpComputeBinaryOperator,
    TpComputeIdentifier, TpComputeFunction, TpComputeLiteralNumber, TpComputeOperator,
    TpComputeUnaryNeg,
    TpComputeCompound,
    TpComputeAssignment,
    TpComputeLiteralString,
    TpComputeConditional,
    TpComputeObject,
    TpComputeArray,
    evalConditionalExpressionColumn,
    TpComputeNot,
    TpComputeOutputType
} from "./computeOperators";
import { evalFunctionAsync, evalFunctionSync, getFunctionDef, getFunctionOverload, initFunctionDefs } from "./functions-defs/functionsDefs";
import { getSuggestionsSimilar } from "../levenshtein";
import { COMPUTATION_TYPES, TpComputeContext, TpTableComputationExpression } from "./interface";
import { findComputeSourceItem, formatType, getComputeSourceItem } from "./helpers";


jsep.plugins.register(jsepAssignment);
jsep.plugins.register(jsepObject);


export function initComputationEnvironment() {
    initFunctionDefs();
}


export function parseTableComputationExpression(computeCtx: TpComputeContext, expressionString: string, reportIssue: (issue: TpIssue) => void): TpTableComputationExpression {
    computeCtx.tempVariables = [];

    function createCompBinaryOperator(token: jsep.BinaryExpression, left: TpComputeOperator, right: TpComputeOperator): TpComputeBinaryOperator {
        let dataType = COMP_DATA_TYPES.VOID;
        if (isComputeBinaryOperatorArithmetic(token.operator)) {
            if ((left.outputType.dataType == COMP_DATA_TYPES.NUMBER) && (right.outputType.dataType == COMP_DATA_TYPES.NUMBER))
                dataType = COMP_DATA_TYPES.NUMBER;
            if ((left.outputType.dataType == COMP_DATA_TYPES.VECTOR3D) && (right.outputType.dataType == COMP_DATA_TYPES.VECTOR3D) && (['+', '-'].indexOf(token.operator) >= 0))
                dataType = COMP_DATA_TYPES.VECTOR3D;
            if ((left.outputType.dataType == COMP_DATA_TYPES.NUMBER) && (right.outputType.dataType == COMP_DATA_TYPES.VECTOR3D) && (token.operator == '*'))
                dataType = COMP_DATA_TYPES.VECTOR3D;
            if ((left.outputType.dataType == COMP_DATA_TYPES.VECTOR3D) && (!right.outputType.isColumn) && (right.outputType.dataType == COMP_DATA_TYPES.NUMBER) && (token.operator == '/'))
                dataType = COMP_DATA_TYPES.VECTOR3D;
            if ((left.outputType.dataType == COMP_DATA_TYPES.STRING) && (right.outputType.dataType == COMP_DATA_TYPES.STRING))
                dataType = COMP_DATA_TYPES.STRING;
            if (dataType == COMP_DATA_TYPES.VOID) {
                throw createUserError(`Invalid data type for operator "${token.operator}" (${formatType(left.outputType)}, ${formatType(right.outputType)})`);
            }
        }
        if (['||', '&&'].includes(token.operator)) {
            dataType = COMP_DATA_TYPES.BOOLEAN;
            if ((left.outputType.dataType != COMP_DATA_TYPES.BOOLEAN) || (right.outputType.dataType != COMP_DATA_TYPES.BOOLEAN))
                throw createUserError(`Boolean binary operators should take booleans (found: ${formatType(left.outputType)}, ${formatType(right.outputType)})`);
        }
        if (isComputeBinaryOperatorComparison(token.operator)) {
            dataType = COMP_DATA_TYPES.VOID;
            if ((left.outputType.dataType == COMP_DATA_TYPES.NUMBER) && (right.outputType.dataType == COMP_DATA_TYPES.NUMBER))
                dataType = COMP_DATA_TYPES.BOOLEAN;
            if ((left.outputType.dataType == COMP_DATA_TYPES.CATEGORICAL) && (right.outputType.dataType == COMP_DATA_TYPES.STRING))
                dataType = COMP_DATA_TYPES.BOOLEAN;
            if (dataType == COMP_DATA_TYPES.VOID)
                throw createUserError(`Invalid argument for binary operator "${token.operator}" (found: ${formatType(left.outputType)}, ${formatType(right.outputType)})`);
        }
        return {
            type: COMP_TOKEN_TYPES.BINARY_OPERATOR,
            operator: token.operator,
            left,
            right,
            outputType: {
                dataType,
                isColumn: left.outputType.isColumn || right.outputType.isColumn,
                isDoublePrecision: left.outputType.isDoublePrecision || right.outputType.isDoublePrecision,
            }
        }
    }

    function processToken(expr: jsep.Expression): TpComputeOperator {
        if (expr.type == 'BinaryExpression') {
            const token = expr as jsep.BinaryExpression;
            if (!computeBinaryOperators.includes(token.operator))
                throw createUserError(`Unsupported binary operator ${token.operator}`);
            return createCompBinaryOperator(token, processToken(token.left), processToken(token.right))
        }

        if (expr.type == 'Literal') {
            const token = expr as jsep.Literal;
            if (typeof token.value == 'number')
                return {
                    type: COMP_TOKEN_TYPES.LITERAL_NUMBER,
                    literal: token.value,
                    outputType: {
                        dataType: COMP_DATA_TYPES.NUMBER,
                        isColumn: false,
                        isDoublePrecision: false,
                    }
                }
            if (typeof token.value == 'string')
                return {
                    type: COMP_TOKEN_TYPES.LITERAL_STRING,
                    literal: token.value,
                    outputType: {
                        dataType: COMP_DATA_TYPES.STRING,
                        isColumn: false,
                        isDoublePrecision: false,
                    }
                }
            throw createUserError(`Invalid literal "${token.value}"`)
        }

        if (expr.type == 'Identifier') {
            const token = expr as jsep.Identifier;
            const tempVar = computeCtx.tempVariables.find(vr => vr.identifier == token.name);
            if (tempVar) {
                return {
                    type: COMP_TOKEN_TYPES.IDENTIFIER,
                    id: token.name,
                    outputType: tempVar.outputType,
                }
            }
            const sourceItem = findComputeSourceItem(computeCtx, token.name);
            if (!sourceItem) {
                debugger;
                const similarList = getSuggestionsSimilar(computeCtx.sourceItems.map(sourceItem => sourceItem.identifier), token.name);
                throw createUserError(`Invalid identifier "${token.name}" (did you mean ${similarList.map(simil => `"${simil}"`).join(" or ")} ?)`);
            }
            return {
                type: COMP_TOKEN_TYPES.IDENTIFIER,
                id: token.name,
                outputType: sourceItem.outputType
            }
        }

        if (expr.type == 'UnaryExpression') {
            const token = expr as jsep.UnaryExpression;
            const arg = processToken(token.argument);
            if (token.operator == '-') {
                if ((arg.outputType.dataType == COMP_DATA_TYPES.NUMBER) && (!arg.outputType.isColumn)) {
                    return {
                        type: COMP_TOKEN_TYPES.UNARY_NEG,
                        arg,
                        outputType: structuredClone(arg.outputType),
                    }
                }
            }
            if (token.operator == '!') {
                if ((arg.outputType.dataType == COMP_DATA_TYPES.BOOLEAN)) {
                    return {
                        type: COMP_TOKEN_TYPES.NOT,
                        arg,
                        outputType: structuredClone(arg.outputType),
                    }
                }
            }
            throw createConfigError(`Unsupported unary operator ${token.operator}`);
        }


        if (expr.type == 'ArrayExpression') {
            const token = expr as jsep.ArrayExpression;
            return {
                type: COMP_TOKEN_TYPES.ARRAY,
                elements: token.elements.filter(el => el != null).map(el => processToken(el)),
                outputType: {
                    dataType: COMP_DATA_TYPES.ARRAY,
                    isColumn: false,
                    isDoublePrecision: false,
                },
            }
        }

        if (expr.type == 'MemberExpression') {
            // const token = expr as jsep.MemberExpression;
            // debugger;
            // const leftPart = processToken(token.object);
            // if (leftPart.outputType.dataType == COMP_DATA_TYPES.OBJECT) {
            //     const leftObject = leftPart as TpComputeObject;
            //     if (token.property.type == 'Identifier') {
            //         const key = String(token.property.name) || "";
            //         const prop = leftObject.keyValues.find(prop => prop.key == key);
            //         if (!prop) throw createConfigError(`Invalid property ${key}`);
            //         return {
            //             type: COMP_TOKEN_TYPES.MEMBER_EXPRESSION,
            //             leftObject,
            //             key,
            //             outputType: structuredClone(prop.value.outputType),
            //         }
            //     }
            // }
            throw createUserError('Unsupported member operator');
        }

        if (expr.type == 'ConditionalExpression') {
            const token = expr as jsep.ConditionalExpression;
            const test = processToken(token.test);
            if (test.outputType.dataType != COMP_DATA_TYPES.BOOLEAN)
                throw createUserError(`Invalid argument for conditional expression: should be boolean`);
            const consequent = processToken(token.consequent);
            const alternate = processToken(token.alternate);
            if (consequent.outputType.isColumn)
                throw createUserError(`Outcome of a conditional expression cannot be a column (note that test can be a column)`);
            if (JSON.stringify(consequent.outputType) != JSON.stringify(alternate.outputType))
                throw createUserError(`Both outcomes of a conditional expression should be of the same type (found: ${JSON.stringify(consequent.outputType)}, ${JSON.stringify(alternate.outputType)})`);
            const outputType = structuredClone(consequent.outputType);
            if (test.outputType.isColumn) outputType.isColumn = true;
            return {
                type: COMP_TOKEN_TYPES.CONDITIONAL,
                test,
                consequent,
                alternate,
                outputType,
            }
        }

        if (expr.type == 'AssignmentExpression') {
            if (expr.operator != '=')
                throw createUserError('Only = assignments are allowed');
            if ((expr.left as any)?.type != 'Identifier')
                throw createUserError('Left part of an assignment should be an identifier');
            const value = processToken(expr.right as any);
            const identifier = (expr.left as any).name;
            const outputType = structuredClone(value.outputType);
            computeCtx.tempVariables.push({
                identifier,
                outputType,
                content: undefined,
            })
            return {
                type: COMP_TOKEN_TYPES.ASSIGNMENT,
                identifier,
                value,
                outputType,
            }
        }

        if (expr.type == 'Compound') {
            const token = expr as jsep.Compound;
            const items = token.body.map(item => processToken(item));
            if (items.length == 0)
                throw createUserError('Compound expression should contain at least one statement');
            return {
                type: COMP_TOKEN_TYPES.COMPOUND,
                items,
                outputType: structuredClone(items[items.length - 1].outputType),
            }
            // expr.body <== array with elements
        }

        if (expr.type == 'CallExpression') {
            const token = expr as jsep.CallExpression;
            const functionName = String(token.callee.name);
            if (functionName == 'compound') {
                const items = token.arguments.map((arg) => processToken(arg));
                if (items.length == 0) throw createUserError(`Compound should not be empty`);
                return {
                    type: COMP_TOKEN_TYPES.COMPOUND,
                    items,
                    outputType: structuredClone(items[items.length - 1].outputType),
                }
            }
            const functionDef = getFunctionDef(functionName);
            const argumentList = token.arguments.map((arg) => processToken(arg));
            const overloadDef = getFunctionOverload(functionDef, argumentList.map(arg => arg.outputType));
            let isDoublePrecision = null;
            if (overloadDef.outputType.dataType == COMP_DATA_TYPES.NUMBER) {
                isDoublePrecision = false;
                for (const arg of argumentList) {
                    if (arg.outputType.isDoublePrecision)
                        isDoublePrecision = true;
                }
            }
            return {
                type: COMP_TOKEN_TYPES.FUNCTION,
                functionDef,
                overloadDef,
                argumentList,
                outputType: {
                    dataType: overloadDef.outputType.dataType,
                    isColumn: overloadDef.outputType.isColumn,
                    isDoublePrecision,
                },
            }
        }

        if (expr.type == 'ObjectExpression') {
            const token = expr as ObjectExpression;
            const keyValues: { key: string, value: TpComputeOperator }[] = [];
            for (const prop of token.properties) {
                if (prop.key.type != 'Identifier') throw createConfigError(`Object keys should be identifiers`);
                if (prop.value) {
                    keyValues.push({
                        key: String(prop.key.name) || "",
                        value: processToken(prop.value),
                    })
                }
            }
            return {
                type: COMP_TOKEN_TYPES.OBJECT,
                keyValues,
                outputType: {
                    dataType: COMP_DATA_TYPES.OBJECT,
                    isColumn: false,
                    isDoublePrecision: false,
                },
            }
        }

        throw createUserError(`Unsupported token type "${expr.type}"`);
    }

    try {
        if (!expressionString.trim()) throw "Empty expression";
        const rootElement = processToken(jsep(expressionString));
        if ((computeCtx.computationType == COMPUTATION_TYPES.OUTPUT_COLUMN) && (!rootElement.outputType.isColumn)) throw createUserError(`Computation should return a column and not a scalar`);
        if ((computeCtx.computationType == COMPUTATION_TYPES.OUTPUT_SCALAR) && (rootElement.outputType.isColumn)) throw createUserError(`Computation should return a scalar and not a column`);
        return {
            rootElement,
        }
    } catch (error) {
        reportIssue({
            severity: 2,
            message: `${String(error)}`,
        })
        return {
            rootElement: null,
        };
    }
}


function _getVariableValue(computeCtx: TpComputeContext, tokenSourceId: TpComputeIdentifier): any {

    const tempVar = computeCtx.tempVariables.find(vr => vr.identifier == tokenSourceId.id);
    if (tempVar) return tempVar.content

    const sourceItem = getComputeSourceItem(computeCtx, tokenSourceId.id);
    if (sourceItem.identifier.endsWith('_currentSelection')) {
        return sourceItem.sourceValueColumnData;
    }
    if (sourceItem.sourceColumn) {
        if (sourceItem.onSingleRow) {
            if (!computeCtx.usingTableRowIndex) throw createInternalError(`Impossible`);
            if (computeCtx.usingTableRowIndex.tableId != sourceItem.sourceTableId) throw createInternalError(`Impossible`);
            return sourceItem.sourceColumn.values[computeCtx.usingTableRowIndex!.rowIndex];
        }
        if (sourceItem.sourceColumn.dataType == DT_VECTOR3D) {
            return {
                x: sourceItem.sourceColumn.subComponents[0].values,
                y: sourceItem.sourceColumn.subComponents[1].values,
                z: sourceItem.sourceColumn.subComponents[2].values,
            }
        } else if (sourceItem.sourceColumn.dataType == DT_CATEGORICAL) { // we need to map index numbers to actual state strings
            const categoricalStatesList = sourceItem.sourceColumn!.categoricalStatesList!;
            const strings: string[] = [];
            for (const idx of sourceItem.sourceColumn.values) strings.push(categoricalStatesList[idx]);
            return strings;
        } else
            return sourceItem.sourceColumn.values;
    } else {
        return sourceItem.sourceValue;
    }
}


function _setTempVariable(computeCtx: TpComputeContext, identifier: string, content: any) {
    const theVar = computeCtx.tempVariables.find(vr => vr.identifier == identifier);
    if (!theVar) throw createInternalError(`Expected temp var not found: ${identifier}`);
    theVar.content = content;
}


function applyNot(outputType: TpComputeOutputType, arg: any) {
    if (!outputType.isColumn) return !arg;
    const output = new Uint8Array(arg.length);
    for (let i=0; i< arg.length; i++) output[i] = arg[i] ? 0 : 1;
    return output
}

function _evalSync(computeCtx: TpComputeContext, token: TpComputeOperator): any {

    if (token.type == COMP_TOKEN_TYPES.COMPOUND) {
        const tokenCompound = token as TpComputeCompound;
        let output;
        for (const statement of tokenCompound.items) output = _evalSync(computeCtx, statement);
        return output;
    }

    if (token.type == COMP_TOKEN_TYPES.ASSIGNMENT) {
        const tokenAssign = token as TpComputeAssignment;
        const value = _evalSync(computeCtx, tokenAssign.value);
        _setTempVariable(computeCtx, tokenAssign.identifier, value);
        return value;
    }

    if (token.type == COMP_TOKEN_TYPES.BINARY_OPERATOR) {
        const tokenBinOp = token as TpComputeBinaryOperator;
        return evalBinaryOperator(tokenBinOp, _evalSync(computeCtx, tokenBinOp.left), _evalSync(computeCtx, tokenBinOp.right));
    }

    if (token.type == COMP_TOKEN_TYPES.UNARY_NEG) {
        const tokenUnNeg = token as TpComputeUnaryNeg;
        return - _evalSync(computeCtx, tokenUnNeg.arg);
    }

    if (token.type == COMP_TOKEN_TYPES.NOT) {
        const tokenNot = token as TpComputeNot;
        return applyNot(tokenNot.outputType, _evalSync(computeCtx, tokenNot.arg));
    }

    if (token.type == COMP_TOKEN_TYPES.IDENTIFIER) {
        const tokenSourceId = token as TpComputeIdentifier;
        return _getVariableValue(computeCtx, tokenSourceId);
    }

    if (token.type == COMP_TOKEN_TYPES.LITERAL_NUMBER) {
        const tokenLitNum = token as TpComputeLiteralNumber;
        return tokenLitNum.literal;
    }

    if (token.type == COMP_TOKEN_TYPES.LITERAL_STRING) {
        const tokenLitString = token as TpComputeLiteralString;
        return tokenLitString.literal;
    }

    if (token.type == COMP_TOKEN_TYPES.CONDITIONAL) {
        const tokenConditional = token as TpComputeConditional;
        if (!tokenConditional.test.outputType.isColumn) {
            if (_evalSync(computeCtx, tokenConditional.test))
                return _evalSync(computeCtx, tokenConditional.consequent);
            else
                return _evalSync(computeCtx, tokenConditional.alternate);
        } else
            return evalConditionalExpressionColumn(
                _evalSync(computeCtx, tokenConditional.test),
                _evalSync(computeCtx, tokenConditional.consequent),
                _evalSync(computeCtx, tokenConditional.alternate),
                tokenConditional.outputType,
            );
    }

    if (token.type == COMP_TOKEN_TYPES.FUNCTION) {
        const tokenFunction = token as TpComputeFunction;
        if (tokenFunction.functionDef.isAsync)
            throw createConfigError(`The function "${tokenFunction.functionDef.functionName}" is asynchronous and cannot be used in this context`)
        const argumentList = tokenFunction.argumentList.map(arg => _evalSync(computeCtx, arg));
        return evalFunctionSync(computeCtx, tokenFunction, argumentList);
    }

    if (token.type == COMP_TOKEN_TYPES.OBJECT) {
        const tokenObject = token as TpComputeObject;
        const object: any = {};
        for (const prop of tokenObject.keyValues) {
            object[prop.key] = _evalSync(computeCtx, prop.value)
        }
        return object;
    }

    if (token.type == COMP_TOKEN_TYPES.ARRAY) {
        const tokenArray = token as TpComputeArray;
        return tokenArray.elements.map(el => _evalSync(computeCtx, el));
    }


    throw createInternalError(`Unrecognised token ${(token as any).type}`);
}


async function _evalAsync(computeCtx: TpComputeContext, token: TpComputeOperator): Promise<any> {

    if (token.type == COMP_TOKEN_TYPES.COMPOUND) {
        const tokenCompound = token as TpComputeCompound;
        let output;
        for (const statement of tokenCompound.items) output = await _evalAsync(computeCtx, statement);
        return output;
    }

    if (token.type == COMP_TOKEN_TYPES.ASSIGNMENT) {
        const tokenAssign = token as TpComputeAssignment;
        const value = await _evalAsync(computeCtx, tokenAssign.value);
        _setTempVariable(computeCtx, tokenAssign.identifier, value);
        return value;
    }

    if (token.type == COMP_TOKEN_TYPES.BINARY_OPERATOR) {
        const tokenBinOp = token as TpComputeBinaryOperator;
        return evalBinaryOperator(tokenBinOp, await _evalAsync(computeCtx, tokenBinOp.left), await _evalAsync(computeCtx, tokenBinOp.right));
    }

    if (token.type == COMP_TOKEN_TYPES.UNARY_NEG) {
        const tokenUnNeg = token as TpComputeUnaryNeg;
        return - await _evalAsync(computeCtx, tokenUnNeg.arg);
    }

    if (token.type == COMP_TOKEN_TYPES.NOT) {
        const tokenNot = token as TpComputeNot;
        return applyNot(tokenNot.outputType, await _evalAsync(computeCtx, tokenNot.arg));
    }

    if (token.type == COMP_TOKEN_TYPES.IDENTIFIER) {
        const tokenSourceId = token as TpComputeIdentifier;
        return _getVariableValue(computeCtx, tokenSourceId);
    }

    if (token.type == COMP_TOKEN_TYPES.LITERAL_NUMBER) {
        const tokenLitNum = token as TpComputeLiteralNumber;
        return tokenLitNum.literal;
    }

    if (token.type == COMP_TOKEN_TYPES.LITERAL_STRING) {
        const tokenLitString = token as TpComputeLiteralString;
        return tokenLitString.literal;
    }

    if (token.type == COMP_TOKEN_TYPES.CONDITIONAL) {
        const tokenConditional = token as TpComputeConditional;
        if (!tokenConditional.test.outputType.isColumn) {
            if (await _evalAsync(computeCtx, tokenConditional.test))
                return await _evalAsync(computeCtx, tokenConditional.consequent);
            else
                return await _evalAsync(computeCtx, tokenConditional.alternate);
        } else
            return evalConditionalExpressionColumn(
                await _evalAsync(computeCtx, tokenConditional.test),
                await _evalAsync(computeCtx, tokenConditional.consequent),
                await _evalAsync(computeCtx, tokenConditional.alternate),
                tokenConditional.outputType,
            );
    }

    if (token.type == COMP_TOKEN_TYPES.FUNCTION) {
        const tokenFunction = token as TpComputeFunction;
        const argumentList = [];
        for (const arg of tokenFunction.argumentList) {
            argumentList.push(await _evalAsync(computeCtx, arg));
        }
        if (tokenFunction.functionDef.isAsync)
            return await evalFunctionAsync(computeCtx, tokenFunction, argumentList);
        else return evalFunctionSync(computeCtx, tokenFunction, argumentList);
    }

    if (token.type == COMP_TOKEN_TYPES.OBJECT) {
        const tokenObject = token as TpComputeObject;
        const object: any = {};
        for (const prop of tokenObject.keyValues) {
            object[prop.key] = await _evalAsync(computeCtx, prop.value)
        }
        return object;
    }

    if (token.type == COMP_TOKEN_TYPES.ARRAY) {
        const tokenArray = token as TpComputeArray;
        const rs: any = [];
        for (const el of tokenArray.elements)
            rs.push(await _evalAsync(computeCtx, el));
        return rs;
    }


    throw createInternalError(`Unrecognised token ${(token as any).type}`);
}



export function evalTableComputationExpressionSync(computeCtx: TpComputeContext, computation: TpTableComputationExpression): any {
    const outputValue = _evalSync(computeCtx, computation.rootElement!);
    const outputType = computation.rootElement!.outputType;
    if (outputType.isColumn) {
        if (outputType.dataType == COMP_DATA_TYPES.NUMBER) {
            for (let i=0; i< outputValue.length; i++)
                if (!isFinite(outputValue[i])) outputValue[i] = NaN;
        }
    }
    return outputValue;
}


export async function evalTableComputationExpressionAsync(computeCtx: TpComputeContext, computation: TpTableComputationExpression): Promise<any> {
    try {
        return await _evalAsync(computeCtx, computation.rootElement!);
    } catch (error) {
        if ((error as any).cause != ERROR_CAUSES.EXEXUTION_STOP) reportException(error);
    }

}


export function getTableComputationExpressionDependencies(computeCtx: TpComputeContext, computation: TpTableComputationExpression): TpColumnData[] {
    const columns: TpColumnData[] = [];
    const presentMap: { [colId: string]: boolean } = {};
    if (!computation.rootElement) return columns;

    function _collect(token: TpComputeOperator): any {
        let processed = false;

        if (token.type == COMP_TOKEN_TYPES.BINARY_OPERATOR) {
            const tokenBinOp = token as TpComputeBinaryOperator;
            _collect(tokenBinOp.left);
            _collect(tokenBinOp.right);
            processed = true;
        }

        if (token.type == COMP_TOKEN_TYPES.UNARY_NEG) {
            const tokenUnNeg = token as TpComputeUnaryNeg;
            _collect(tokenUnNeg.arg);
            processed = true;
        }

        if (token.type == COMP_TOKEN_TYPES.NOT) {
            const tokenNot = token as TpComputeNot;
            _collect(tokenNot.arg);
            processed = true;
        }

        if (token.type == COMP_TOKEN_TYPES.ASSIGNMENT) {
            processed = true;
        }

        if (token.type == COMP_TOKEN_TYPES.IDENTIFIER) {
            const tokenSourceId = token as TpComputeIdentifier;
            const tempVar = computeCtx.tempVariables.find(vr => vr.identifier == tokenSourceId.id);
            if (!tempVar) {
                if (!presentMap[tokenSourceId.id]) {
                    const sourceItem = findComputeSourceItem(computeCtx, tokenSourceId.id);
                    if (sourceItem) {
                        if (sourceItem.sourceColumn)
                            columns.push(sourceItem.sourceColumn!);
                        presentMap[tokenSourceId.id] = true;
                    }
                }
            }
            processed = true;
        }

        if (token.type == COMP_TOKEN_TYPES.LITERAL_NUMBER) {
            processed = true;
        }
        if (token.type == COMP_TOKEN_TYPES.LITERAL_STRING) {
            processed = true;
        }

        if (token.type == COMP_TOKEN_TYPES.FUNCTION) {
            const tokenFunction = token as TpComputeFunction;
            for (const arg of tokenFunction.argumentList)
                _collect(arg);
            processed = true;
        }
        
        if (token.type == COMP_TOKEN_TYPES.CONDITIONAL) {
            const tokenConditional = token as TpComputeConditional;
            _collect(tokenConditional.test);
            _collect(tokenConditional.consequent);
            _collect(tokenConditional.alternate);
            processed = true;
        }

        if (token.type == COMP_TOKEN_TYPES.COMPOUND) {
            const tokenCompound = token as TpComputeCompound;
            for (const x of tokenCompound.items) _collect(x);
            processed = true;
        }

        if (token.type == COMP_TOKEN_TYPES.ARRAY) {
            const tokenArray = token as TpComputeArray;
            for (const x of tokenArray.elements) _collect(x);
            processed = true;
        }

        if (!processed)
            throw createInternalError(`Unrecognised token ${(token as any).type}`);
    }

    _collect(computation.rootElement!);

    return columns;
}