import { TpIssue } from "../../../../data/interfaces";
import { computeCtxAddAllDataTables, computeCtxAddResourceAttributes, createComputeCtx } from "../../../../util/table-computations/helpers";
import { COMPUTATION_TYPES, TARGET_DASHBOARD } from "../../../../util/table-computations/interface";
import { evalTableComputationExpressionAsync, evalTableComputationExpressionSync, parseTableComputationExpression } from "../../../../util/table-computations/tableComputationExpression";
import { BasicElement } from "../../basic-element/BasicElement";
import { TpElemProps } from "../interface";

import stylesButton from '../../../../util/components/buttons/styled-button/StyledButton.module.scss';
import { useNavigate } from "react-router-dom";
import { createUserError, reportException } from "../../../../util/errors";
import { useTablesStorage } from "../../../../data/usage/useTablesStorage";



export function ActionButton(props: TpElemProps) {
    const { resourceRenderCtx, elemDef } = props;
    const navigate = useNavigate();
    const tablesStorage = useTablesStorage();

    const actionId = elemDef.settings?.action || "";
    const action = resourceRenderCtx.resourceInfo.renderTemplate!.actions?.find(act => (act.targetTableId == TARGET_DASHBOARD) && (act.id == actionId))
    const actionName = action ? action.name : "Unknown action";

    function performAction() {
        if (!action) return;
        const computeCtx = createComputeCtx(COMPUTATION_TYPES.NO_OUTPUT);
        computeCtx.env = {
            resourceInfo: resourceRenderCtx.resourceInfo,
            navigate,
        };
        computeCtxAddResourceAttributes(computeCtx, resourceRenderCtx.resourceInfo);
        computeCtxAddAllDataTables(computeCtx, resourceRenderCtx.resourceInfo, tablesStorage);

        console.log(`==> Starting dashboard action id=${action.id} name=${action.name}`);
        try {
            const expr = parseTableComputationExpression(computeCtx, action.actionDef, (issue: TpIssue) => { throw createUserError(issue.message) })
            evalTableComputationExpressionAsync(computeCtx, expr);
        } catch (e) {
            reportException(e);
        }
    }

    return (
        <BasicElement {...props}>
            <div style={{ padding: 'var(--dashboard-hmargin)' }}>
                <button
                    className={stylesButton.button}
                    style={{ width: "100%" }}
                    onClick={performAction}
                >{actionName}
                </button>
            </div>
        </BasicElement>)
}