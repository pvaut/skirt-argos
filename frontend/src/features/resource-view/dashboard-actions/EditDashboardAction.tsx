import { useEffect, useState } from "react";
import { TpDashboardAction, TpIssue, TpResourceInfo } from "../../../data/interfaces";
import ReactCodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { ComputationHelp } from "../../../util/table-computations/computation-help/ComputationHelp";
import { computeCtxAddAllDataTables, computeCtxAddDataTable, computeCtxAddResourceAttributes, createComputeCtx, formatType } from "../../../util/table-computations/helpers";
import { parseTableComputationExpression } from "../../../util/table-computations/tableComputationExpression";

import styles from './DashboardActions.module.scss';
import { COMPUTATION_TYPES, TARGET_DASHBOARD } from "../../../util/table-computations/interface";
import { TpTableStorage } from "../../../data/usage/useTablesStorage";
import { getTableUri } from "../../../data/helpers";

interface TpProps {
    tablesStorage: TpTableStorage,
    resourceInfo: TpResourceInfo,
    action: TpDashboardAction,
    onOK: (newAction: TpDashboardAction) => void;
    onCancel: () => void;
    onDelete: () => void;
}

export function EditDashboardAction({ tablesStorage, resourceInfo, action, onOK, onCancel, onDelete }: TpProps) {
    const [editingAction, setEditingAction] = useState<TpDashboardAction | null>(null);
    const [verified, setVerified] = useState(false);
    const [variablesInfo, setVariablesInfo] = useState("");
    const [issues, setIssues] = useState<string[]>([]);

    useEffect(() => { setEditingAction(structuredClone(action)) }, [action]);

    if (!editingAction) return null;

    const computeCtx = createComputeCtx(COMPUTATION_TYPES.NO_OUTPUT);
    computeCtxAddResourceAttributes(computeCtx, resourceInfo);

    if (action.targetTableId && (action.targetTableId != TARGET_DASHBOARD)) {
        const tableUri = getTableUri(resourceInfo.uri, action.targetTableId)
        computeCtxAddDataTable(computeCtx, tablesStorage.getTableData(tableUri), false, true);
    } else {
        computeCtxAddAllDataTables(computeCtx, resourceInfo, tablesStorage);
    }


    function updateEditingAction() {
        setEditingAction(structuredClone(editingAction));
    }

    function verify() {
        const issues: string[] = [];

        const computation = parseTableComputationExpression(computeCtx,
            editingAction!.actionDef,
            (issue: TpIssue) => { issues.push(issue.message) }
        );
        setIssues(issues);
        setVerified(issues.length == 0);
        setVariablesInfo(computeCtx.tempVariables.map(variab => `${variab.identifier}: ${formatType(variab.outputType)}`).join('; '));
    }

    return (
        <div>
            <div style={{ paddingBottom: '20px' }}>
                Action name:&nbsp;
                <input value={editingAction.name}
                    onChange={(ev) => {
                        editingAction.name = ev.target.value;
                        updateEditingAction();
                    }} />
            </div>
            <div>
                <div style={{ paddingBottom: '10px' }}>Action code:</div>
                <ReactCodeMirror
                    value={editingAction.actionDef}
                    width="100%"
                    minHeight="200px"
                    // height="300px"
                    extensions={[javascript({ jsx: true })]}
                    theme={'dark'}
                    editable={true}
                    // autoFocus={true}
                    basicSetup={{
                        lineNumbers: true
                    }}
                    onChange={(val: string, viewUpdate: any) => { editingAction.actionDef = val; updateEditingAction(); setVerified(false) }}
                />
            </div>

            {variablesInfo && <div style={{padding: "20px 0 10px 0", fontSize: '80%', opacity: 0.7}}>{variablesInfo}</div>}

            {(issues.length > 0) && <div className={styles.issues}>{issues.join('; ')}</div>}

            <div>
                <button
                    onClick={() => { verify() }}
                >
                    {verified ? <span>✓ Verified</span> : <span>Verify</span>}
                </button>
                <button
                    onClick={() => onOK(editingAction)}
                >
                    OK
                </button>
                <button
                    onClick={() => onCancel()}
                >
                    Cancel
                </button>
                <button
                    onClick={() => onDelete()}
                >
                    Delete...
                </button>
            </div>

            <ComputationHelp computeCtx={computeCtx} />

        </div>
    );
}