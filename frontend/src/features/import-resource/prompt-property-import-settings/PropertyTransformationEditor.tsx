import ReactCodeMirror from "@uiw/react-codemirror";
import { javascript } from '@codemirror/lang-javascript';
import { TpIssue, TpConceptTablePropertyDefinition } from "../../../data/interfaces";
import { ExpandableSection } from "../../../util/components/expandable-section/ExpandableSection";
import { ComputationHelp } from "../../../util/table-computations/computation-help/ComputationHelp";
import { interpolateColors } from "../../../util/color/color";
import { theAppColorSchema } from "../../../util/color/appColorSchema";
import { useState } from "react";
import { parseTableComputationExpression } from "../../../util/table-computations/tableComputationExpression";
import { TpColumnData, TpTableData } from "../../../data/tables/interface";

import styles from './PrompPropertyImportSettings.module.scss';
import { computeCtxAddDataTable, computeCtxAddSourceDataAttributes, createComputeCtx } from "../../../util/table-computations/helpers";
import { TpDataSource } from "../../../util/data-sources/file-parsers/interface";
import { getDataSourceData } from "../../../util/data-sources/file-parsers/sourceFileParser";
import { getDataSourceDataDef } from "../../../util/data-sources/dataSourceStructure";
import { c } from "vite/dist/node/moduleRunnerTransport.d-CXw_Ws6P";
import { COMPUTATION_TYPES } from "../../../util/table-computations/interface";


export function createTempDataTable(prop: TpConceptTablePropertyDefinition): TpTableData {

    let dataType = prop.dataType as any;
    if (prop.children.length > 0)
        dataType = prop.children[0].dataType as any

    const col: TpColumnData = {
        id: 'x',
        name: 'x',
        description: '',
        parentColId: null,
        dataType,
        values: null,
        categoricalStatesList: null,
        subComponents: [],
        config: { decimalDigits: null, unitName: null, pixelSize: null },
        cache: {},
    };

    const table: TpTableData = {
        id: '',
        name: '',
        tableUri: '',
        labelColumnId: null,
        rowCount: 0,
        rowKeyIndexes: new Int32Array(0),
        columnGroups: [],
        columns: [],
        columnsMap: {},
        currentfilterMask: new Uint8Array(0),
        currentFilterCount: 0,
        filterStepsData: {},
        issues: [],
    };

    table.columns.push(col);
    table.columnsMap[col.id] = col;

    return table;
}

interface TpProps {
    dataSource: TpDataSource;
    prop: TpConceptTablePropertyDefinition;
    updateProp: () => void;
}

export function PropertyTransformationEditor({ dataSource, prop, updateProp }: TpProps) {

    const [issues, setIssues] = useState<string[]>([]);
    const [verified, setVerified] = useState(false);

    const bgColor = interpolateColors(theAppColorSchema.colorSp1, theAppColorSchema.colorBg3, 0.45);

    const tempDataTable = createTempDataTable(prop);
    const computeCtx = createComputeCtx(COMPUTATION_TYPES.OUTPUT_COLUMN);
    computeCtxAddDataTable(computeCtx, tempDataTable, false, false);

    const propDataSet = getDataSourceDataDef(dataSource, prop.path);
    computeCtxAddSourceDataAttributes(computeCtx, propDataSet.attributes);

    function verifyExpression() {

        const issues: string[] = [];
        const computation = parseTableComputationExpression(
            computeCtx,
            prop.transformationExpression,
            (issue: TpIssue) => { issues.push(issue.message) }
        );
        setIssues(issues);
        setVerified(issues.length == 0);
    }

    return (
        <div>
            <ReactCodeMirror
                value={prop.transformationExpression}
                width="100%"
                height="100px"
                extensions={[
                    javascript({ jsx: false }),
                ]}
                onChange={(val: string, viewUpdate: any) => { prop.transformationExpression = val; updateProp(); setVerified(false) }}
                theme={'dark'}
                editable={true}
                // autoFocus={true}
                basicSetup={{
                    lineNumbers: false
                }}
            />

            <div>
                <button onClick={verifyExpression}>
                    {verified ? <span>✓ Verified</span> : <span>Verify</span>}
                </button>
            </div>

            {(issues.length > 0) && <div className={styles.issues}>{issues.join('; ')}</div>}


            <ComputationHelp computeCtx={computeCtx} />

        </div>
    );
}
