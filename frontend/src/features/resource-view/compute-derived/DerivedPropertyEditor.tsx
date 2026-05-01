import { useRef, useState } from "react";

import styles from './PromptComputeDerivedProperties.module.scss';
import ReactCodeMirror from "@uiw/react-codemirror";
import { javascript } from '@codemirror/lang-javascript';
import { ComputationHelp } from "../../../util/table-computations/computation-help/ComputationHelp";
import { TpTableData } from "../../../data/tables/interface";
import { parseTableComputationExpression } from "../../../util/table-computations/tableComputationExpression";
import { TpIssue, TpResourceInfo } from "../../../data/interfaces";
import { computeCtxAddDataTable, computeCtxAddResourceAttributes, createComputeCtx } from "../../../util/table-computations/helpers";
import { COMPUTATION_TYPES } from "../../../util/table-computations/interface";



interface TpProps {
    resourceInfo: TpResourceInfo,
    dataTable: TpTableData;
    initialName?: string;
    initialExpression?: string;
    initialDescription?:string;
    initialUnitName?: string;
    initialDecimalDigits: number | null;
    onOK: (name: string, expression: string, description: string, unitName:string, decimalDigits: number | null) => void
}

export function DerivedPropertyEditor(props: TpProps) {
    const { onOK } = props;
    const [name, setName] = useState(props.initialName || "");
    const [expression, setExpression] = useState(props.initialExpression || "");
    const [description, setDescription] = useState(props.initialDescription || "");
    const [unitName, setUnitName] = useState(props.initialUnitName || "");
    const [decimalDigits, setDecimalDigits] = useState((typeof props.initialDecimalDigits == 'number') ? String(props.initialDecimalDigits): "");
    const [issues, setIssues] = useState<string[]>([]);
    const [verified, setVerified] = useState(false);

    const editor = useRef<any>(null);

    const currentExpression = useRef<string>("");
    currentExpression.current = expression;

    const computeCtx = createComputeCtx(COMPUTATION_TYPES.OUTPUT_COLUMN);
    computeCtxAddDataTable(computeCtx, props.dataTable, false, false);
    computeCtxAddResourceAttributes(computeCtx, props.resourceInfo);

    function verify() {
        const issues: string[] = [];

        const computation = parseTableComputationExpression(
            computeCtx,
            expression,
            (issue: TpIssue) => { issues.push(issue.message) }
        );
        setIssues(issues);
        setVerified(issues.length == 0);
    }

    return (
        <div className={styles.computeItemEditorWrapper}>
            <div style={{ padding: 0 }}>
                <div style={{ padding: "5px 0" }}>
                    Name:
                </div>
                <input
                    value={name}
                    onChange={(ev) => {
                        setName(ev.target.value);
                    }}
                />
            </div>

            <div style={{ padding: 0 }}>
                <div style={{ padding: "5px 0" }}>
                    Description:
                </div>
                <input
                    value={description}
                    onChange={(ev) => {
                        setDescription(ev.target.value);
                    }}
                />
            </div>

            <div style={{ padding: 0 }}>
                <div style={{ padding: "5px 0" }}>
                    Units:
                </div>
                <input
                    value={unitName}
                    onChange={(ev) => {
                        setUnitName(ev.target.value);
                    }}
                />
            </div>

            <div style={{ padding: 0 }}>
                <div style={{ padding: "5px 0" }}>
                    Decimal digits:
                </div>
                <input
                    value={decimalDigits}
                    onChange={(ev) => {
                        setDecimalDigits(ev.target.value);
                    }}
                />
            </div>

            <div style={{ padding: "5px 0" }}>
                <div style={{ padding: "5px 0" }}>
                    Expression:
                </div>
                <div className={styles.expressionEditorWrapper}>
                    <ReactCodeMirror
                        value={expression}
                        width="100%"
                        height="100px"
                        extensions={[
                            javascript({ jsx: false }),
                        ]}
                        onChange={(val: string, viewUpdate: any) => { setExpression(val); setVerified(false) }}
                        theme={'dark'}
                        editable={true}
                        ref={editor}
                        // autoFocus={true}
                        basicSetup={{
                            lineNumbers: false
                        }}
                    />
                </div>
            </div>

            {(issues.length > 0) && <div className={styles.issues}>{issues.join('; ')}</div>}

            <div>
                <button
                    onClick={() => { onOK(
                        name, expression,
                        description, unitName,
                        decimalDigits ? parseFloat(decimalDigits) : null
                    ) }}
                >
                    OK
                </button>
                <button
                    onClick={() => { verify() }}
                >
                    {verified ? <span>✓ Verified</span> : <span>Verify</span>}
                </button>
            </div>

            <ComputationHelp computeCtx={computeCtx} />

        </div>
    )
}