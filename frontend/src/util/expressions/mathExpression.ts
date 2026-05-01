import jsep from 'jsep';
import { createConfigError, createInternalError } from '../errors';


const mathExprCache: { [expression: string]: { expression: jsep.Expression; error: string | null } } = {};


export type TpMathExprContext = {
    expression: string;
    variables: { [name: string]: any };
    functions?: { [name: string]: (args: any[]) => any };
};


export function evalMathExpr(ctx: TpMathExprContext): any {
    if (!mathExprCache[ctx.expression]) {
        try {
            mathExprCache[ctx.expression] = {
                expression: jsep(ctx.expression),
                error: null,
            };
        } catch (error) {
            mathExprCache[ctx.expression] = {
                expression: jsep('null'),
                error: `Unable to parse expression "${ctx.expression}": ${String(error)}`,
            };
        }
    }

    if (mathExprCache[ctx.expression].error) throw createConfigError(mathExprCache[ctx.expression].error!);

    function _eval(expr: jsep.Expression): any {
        if (expr.type == 'BinaryExpression') {
            const token = expr as jsep.BinaryExpression;
            const leftPart = _eval(token.left);
            const rightPart = _eval(token.right);
            if (token.operator == '||') return leftPart || rightPart;
            if (token.operator == '&&') return leftPart && rightPart;
            if (token.operator == '==') return leftPart == rightPart;
            if (token.operator == '!=') return leftPart != rightPart;
            if (token.operator == '+') return leftPart + rightPart;
            if (token.operator == '-') return leftPart - rightPart;
            if (token.operator == '*') return leftPart * rightPart;
            if (token.operator == '/') return leftPart / rightPart;
            if (token.operator == '>') return leftPart > rightPart;
            if (token.operator == '<') return leftPart < rightPart;
            if (token.operator == '>=') return leftPart >= rightPart;
            if (token.operator == '<=') return leftPart <= rightPart;
            throw createConfigError(`Unsupported binary operator ${token.operator} in expression: "${ctx.expression}"`);
        }

        if (expr.type == 'Literal') {
            const token = expr as jsep.Literal;
            return token.value;
        }

        if (expr.type == 'Identifier') {
            const token = expr as jsep.Identifier;
            if (!Object.keys(ctx.variables).includes(token.name))
                throw createConfigError(`Invalid variable "${token.name}" in expression: "${ctx.expression} (available: ${Object.keys(ctx.variables).join(', ')})"`);
            return ctx.variables[token.name];
        }

        if (expr.type == 'UnaryExpression') {
            const token = expr as jsep.UnaryExpression;
            const argument = _eval(token.argument);
            if (token.operator == '!') return !argument;
            throw createConfigError(`Unsupported unary operator ${token.operator} in expression: "${ctx.expression}"`);
        }

        if (expr.type == 'ConditionalExpression') {
            const token = expr as jsep.ConditionalExpression;
            if (_eval(token.test)) return _eval(token.consequent);
            else return _eval(token.alternate);
        }

        if (expr.type == 'CallExpression') {
            const token = expr as jsep.CallExpression;
            const calledFunction = String(token.callee.name);
            if (!ctx.functions || !ctx.functions![calledFunction])
                throw createConfigError(`Invalid function "${calledFunction}" in expression: "${ctx.expression}"`);
            const args = token.arguments.map((arg) => _eval(arg));
            try {
                return ctx.functions![calledFunction](args);
            } catch (e) {
                throw createConfigError(`Error while evaluating "${calledFunction}" in "${ctx.expression}: ${e}"`);
            }
        }

        throw createConfigError(`Unsupported token ${expr.type} in expression: "${ctx.expression}"`);
    }

    return _eval(mathExprCache[ctx.expression].expression);
}

