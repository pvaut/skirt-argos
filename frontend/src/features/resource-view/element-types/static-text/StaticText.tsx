import { TpIssue } from "../../../../data/interfaces";
import { smart2String } from "../../../../util/misc";
import { computeCtxAddResourceAttributes, createComputeCtx } from "../../../../util/table-computations/helpers";
import { COMPUTATION_TYPES } from "../../../../util/table-computations/interface";
import { evalTableComputationExpressionSync, parseTableComputationExpression } from "../../../../util/table-computations/tableComputationExpression";
import { BasicElement } from "../../basic-element/BasicElement";
import { TpElemProps } from "../interface";

import ReactMarkdown from "react-markdown";


function evaluateExpressionTokens(input: string, evaluator: (expression: string) => string): string {
    const output: string[] = [];
    let i = 0;

    while (i < input.length) {
        if (input[i] === '{') {
            let braceCount = 1;
            let j = i + 1;
            while (j < input.length && braceCount > 0) {
                // Note: this implementation ignores the rare case that unmatched {} braces occur in a string in an expression
                if (input[j] === '{') braceCount++;
                else if (input[j] === '}') braceCount--;
                j++;
            }
            if (braceCount === 0) { // We have an expression to evaluate
                const expr = input.slice(i + 1, j - 1);
                const result = evaluator(expr);
                output.push(String(result));
                i = j;
            } else { // Unmatched brace, treat as literal
                output.push(input[i]);
                i++;
            }
        } else {
            output.push(input[i]);
            i++;
        }
    }
    return output.join('');
}





export function StaticText(props: TpElemProps) {
    const { resourceRenderCtx, elemDef } = props;

    let content = elemDef.settings?.content || "-No content-";

    const computeCtx = createComputeCtx(COMPUTATION_TYPES.OUTPUT_SCALAR);
    computeCtxAddResourceAttributes(computeCtx, resourceRenderCtx.resourceInfo);

    function errorMarkdown(content: string): string {
        return ` **{${content}}** `;
    }

    content = evaluateExpressionTokens(content, (expr: string) => {
        try {
            const issues: TpIssue[] = [];
            const computation = parseTableComputationExpression(
                computeCtx,
                expr,
                (issue: TpIssue) => { issues.push(issue) }
            );
            if (issues.length > 0)
                return errorMarkdown(issues.map(issue => issue.message).join('; '));
            const computedValues = evalTableComputationExpressionSync(computeCtx, computation);
            return smart2String(computedValues);
        } catch (error) {
            return errorMarkdown(String(error));
        }
    })

    return (<BasicElement {...props}>
        <div style={{ boxSizing: 'border-box', padding: 'var(--dashboard-hmargin)' }}>
            <ReactMarkdown>
                {content}
            </ReactMarkdown>
        </div>
    </BasicElement>)
}