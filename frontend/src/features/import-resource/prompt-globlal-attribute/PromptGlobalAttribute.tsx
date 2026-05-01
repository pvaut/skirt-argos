import { useEffect, useMemo, useState } from "react";
import { TpIssue, TpConcept, TpConceptGlobalAttributeDef } from "../../../data/interfaces";
import { TpDataSource, TpDtSrcAttribute, TpDtSrcGroup } from "../../../util/data-sources/file-parsers/interface";
import { postAMessage, useMessageListener } from "../../../util/messageBus";
import { PopupPortal } from "../../../util/components/popup-portal/PopupPortal";

import ReactCodeMirror from "@uiw/react-codemirror";
import { javascript } from '@codemirror/lang-javascript';

import styles from './PromptGlobalAttribute.module.scss';
import { StyledButton } from "../../../util/components/buttons/styled-button/StyledButton";
import { interpolateColors } from "../../../util/color/color";
import { theAppColorSchema } from "../../../util/color/appColorSchema";
import { ExpandableSection } from "../../../util/components/expandable-section/ExpandableSection";
import { ComputationHelp } from "../../../util/table-computations/computation-help/ComputationHelp";
import { computeCtxAddSourceDataAttributes, createComputeCtx, dataTypeColumn2Computation, dataTypeColumnIsDoublePrecision } from "../../../util/table-computations/helpers";
import { parseTableComputationExpression } from "../../../util/table-computations/tableComputationExpression";
import { COMPUTATION_TYPES, TpComputeContext } from "../../../util/table-computations/interface";
import { path2Id } from "../../../data/helpers";

const MESSAGE_PROMPT_GLOBAL_ATTRIB = "_msgPromptGlobalAttribSettings";

function collectDataSourceAttributes(dataSource: TpDataSource): TpDtSrcAttribute[] {
    const attributes: TpDtSrcAttribute[] = [];

    function _collect(group: TpDtSrcGroup) {

        for (const attrib of group.attributes) {
        const attribWithPath = structuredClone(attrib);
        attribWithPath.name = 'attrib' + group.path + '_' + attrib.name;
            attributes.push(attribWithPath);
        }
        for (const member of group.memberGroups) _collect(member);
    }

    _collect(dataSource.root);

    return attributes;
}

export function addDataSourceAttribsToComputeCtx(computeCtx: TpComputeContext, dataSource: TpDataSource) {
    const attributes: TpDtSrcAttribute[] = collectDataSourceAttributes(dataSource);
    computeCtxAddSourceDataAttributes(computeCtx, attributes);
}


function addIdentifiersToComputeCtx(computeCtx: TpComputeContext, conceptDef: TpConcept, dataSource: TpDataSource) {
    for (const table of conceptDef.tableConcepts) {
        let tableId = path2Id(table.path);

        for (const prop of table.properties) {
            let propId = path2Id(prop.path, table.path);
            computeCtx.sourceItems.push({
                identifier: `${tableId}_${propId}`,
                outputType: {
                    dataType: dataTypeColumn2Computation(prop.dataType),
                    isColumn: true,
                    isDoublePrecision: dataTypeColumnIsDoublePrecision(prop.dataType),
                },
                sourceColumn: undefined,
            })

            for (const childProp of prop.children) {
                let propId = path2Id(prop.path, table.path) + `_${childProp.index}`;
                computeCtx.sourceItems.push({
                    identifier: `${tableId}_${propId}`,
                    outputType: {
                        dataType: dataTypeColumn2Computation(childProp.dataType),
                        isColumn: true,
                        isDoublePrecision: dataTypeColumnIsDoublePrecision(childProp.dataType),
                    },
                    sourceColumn: undefined,
                })
            }
        }
    }

    addDataSourceAttribsToComputeCtx(computeCtx, dataSource);
}

interface TpCtx {
    handleOK?: any;
    handleCancel?: any;
    dataSource: TpDataSource;
    conceptDef: TpConcept;
    initialAttrib: TpConceptGlobalAttributeDef;
}


export function promptGlobalAttributeSettings(dataSource: TpDataSource, conceptDef: TpConcept, attrib: TpConceptGlobalAttributeDef):
    Promise<{ attrib: TpConceptGlobalAttributeDef }> {

    return new Promise((resolve, reject) => {

        const ctx: TpCtx = { handleOK, handleCancel, dataSource, conceptDef, initialAttrib: attrib };

        function handleOK(attrib: TpConceptGlobalAttributeDef) { resolve({ attrib }); };

        function handleCancel() { reject(); }

        postAMessage(MESSAGE_PROMPT_GLOBAL_ATTRIB, ctx);
    });
}


export function ConfigureImportGlobalAttributeModal() {

    useMessageListener(MESSAGE_PROMPT_GLOBAL_ATTRIB, (type: string, messageBody: any) => {
        setCurrentCtx(messageBody as TpCtx);
    });


    // const config = useConfig();

    const [currentCtx, setCurrentCtx] = useState<TpCtx | null>(null);
    const [currentAttrib, setCurrentAttrib] = useState<TpConceptGlobalAttributeDef | null>(null);

    const [issues, setIssues] = useState<string[]>([]);
    const [verified, setVerified] = useState(false);

    const bgColor = interpolateColors(theAppColorSchema.colorSp1, theAppColorSchema.colorBg3, 0.45);


    useEffect(() => {  // update the current property when the input changed
        if (currentCtx) {
            setCurrentAttrib(structuredClone(currentCtx.initialAttrib));
            setIssues([]);
            setVerified(false);
        }
    }, [currentCtx]);


    const computeCtx = useMemo(() => {
        const ctx = createComputeCtx(COMPUTATION_TYPES.OUTPUT_SCALAR);
        if (currentCtx)
            addIdentifiersToComputeCtx(ctx, currentCtx!.conceptDef, currentCtx.dataSource);
        return ctx;
    }, [currentCtx]);


    if (!currentCtx || !currentAttrib) return null;
    function updateCurrentAttrib() {
        setCurrentAttrib(structuredClone(currentAttrib));
    }


    function verifyExpression() {

        const issues: string[] = [];
        const computation = parseTableComputationExpression(
            computeCtx,
            currentAttrib!.expression,
            (issue: TpIssue) => { issues.push(issue.message) }
        );
        setIssues(issues);
        setVerified(issues.length == 0);
    }


    return (
        <PopupPortal
            close={() => {
                currentCtx.handleCancel();
                setCurrentCtx(null);
            }}
        >
            <div className={styles.wrapper}>
                <div className={styles.titleArea}>
                    <div className={styles.title}>
                        Configure attribute
                    </div>
                </div>

                <div className={styles.bodyArea}>

                    <div className={styles.sectionTitle}>Attribute identifier</div>
                    <p>
                        <input
                            value={currentAttrib.identifier}
                            onChange={(ev) => {
                                currentAttrib.identifier = ev.target.value;
                                updateCurrentAttrib();
                            }}
                        />
                    </p>


                    <div className={styles.sectionTitle}>Attribute expression</div>

                    <ReactCodeMirror
                        value={currentAttrib.expression}
                        width="100%"
                        height="100px"
                        extensions={[javascript({ jsx: false })]}
                        onChange={(val: string, viewUpdate: any) => { currentAttrib.expression = val; updateCurrentAttrib(); setVerified(false) }}
                        theme={'dark'}
                        editable={true}
                        // autoFocus={true}
                        basicSetup={{ lineNumbers: false }}
                    />

                    <div>
                        <button onClick={verifyExpression}>
                            {verified ? <span>✓ Verified</span> : <span>Verify</span>}
                        </button>
                    </div>

                    {(issues.length > 0) && <div className={styles.issues}>{issues.join('; ')}</div>}

                    <ComputationHelp computeCtx={computeCtx} />

                </div>

                <div className={styles.footerArea}>
                    <StyledButton
                        text="Cancel"
                        marginRight={10}
                        onClick={() => { currentCtx.handleCancel(); setCurrentCtx(null); }}
                    />
                    <StyledButton
                        text="OK"
                        onClick={() => { currentCtx.handleOK(currentAttrib); setCurrentCtx(null); }}
                    />
                </div>
            </div>
        </PopupPortal>
    );
}