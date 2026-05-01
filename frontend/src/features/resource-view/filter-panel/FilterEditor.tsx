import { useState } from "react";
import { TpResourceInfo } from "../../../data/interfaces";
import { TpLoadedTableInfo } from "../../../data/store/loadedTablesSlice";
import { TpTableData } from "../../../data/tables/interface";
import { PopupPortal } from "../../../util/components/popup-portal/PopupPortal";
import { postAMessage, useMessageListener } from "../../../util/messageBus";
import ReactCodeMirror from "@uiw/react-codemirror";
import { TpFilterInstance } from "../../../util/filters/interfaces";

import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import { getFilterTypeDef } from "../../../util/filters/filterTypeFactory";

import styles from './FilterEditor.module.scss';
import { StyledButton } from "../../../util/components/buttons/styled-button/StyledButton";
import { TpTableStorage, useTablesStorage } from "../../../data/usage/useTablesStorage";
import { createConfigError, reportException } from "../../../util/errors";


const MESSAGE_EDIT_FILTER = "MESSAGE_EDIT_FILTER";


export function showFilterEditor(resourceInfo: TpResourceInfo, tableInfo: TpLoadedTableInfo, tableData: TpTableData) {
    postAMessage(MESSAGE_EDIT_FILTER, {
        resourceInfo,
        tableInfo,
        tableData,
    });

}


export function createFilterStepsExport(steps: TpFilterInstance[], tableData: TpTableData): string {
    if (steps.length == 0) return "";

    const exportedSteps: any[] = [];
    for (const step of steps) {
        const filterType = getFilterTypeDef(step.filterType);
        if (!filterType.exportJSON) throw createConfigError(`Cannot edit filter of type ${step.filterType}`);
        exportedSteps.push(filterType.exportJSON(step, tableData));
    }
    return dumpYaml(exportedSteps, { lineWidth: 3000 });
}


function parseFilterSteps(exportString: any, tableData: TpTableData): TpFilterInstance[] {
    if (exportString.length == 0) return [];
    let json;
    const steps: TpFilterInstance[] = [];
    try {
        json = loadYaml(exportString);
        if (!Array.isArray(json)) throw createConfigError(`Filter is not a list`);
    } catch (e) {
        throw createConfigError(`Unable to parse filter: ${e}`);
    }
    for (const jsonStep of json as any[]) {
        const filterType = getFilterTypeDef(jsonStep.type);
        steps.push(filterType.importJSON!(jsonStep, tableData));
    }
    return steps;
}


export function importFilterSteps(tablesStorage: TpTableStorage, tableInfo: TpLoadedTableInfo, tableData: TpTableData, filterExportText: string) {
    const filterSteps = parseFilterSteps(filterExportText, tableData!);
    const backupSteps = structuredClone(tableInfo.currentFilterSteps);
    try {
        tablesStorage.replaceFilterSteps(tableInfo!.uri, filterSteps);
    } catch (e) {
        tablesStorage.replaceFilterSteps(tableInfo!.uri, backupSteps);
        throw e;
    }

}


export function FilterEditorModal() {

    const tablesStorage = useTablesStorage();

    const [resourceInfo, setResourceInfo] = useState<TpResourceInfo | null>(null)
    const [tableInfo, setTableInfo] = useState<TpLoadedTableInfo | null>(null)
    const [tableData, setTableData] = useState<TpTableData | null>(null)
    const [filterExportText, setFilterExportText] = useState("");

    useMessageListener(MESSAGE_EDIT_FILTER, (type: string, messageBody: any) => {
        const theTableInfo = messageBody.tableInfo as TpLoadedTableInfo;
        const theTableData = messageBody.tableData as TpTableData;
        try {
            const exportedFilter = createFilterStepsExport(theTableInfo.currentFilterSteps, theTableData);
            setResourceInfo(messageBody.resourceInfo);
            setTableInfo(theTableInfo);
            setTableData(theTableData);
            setFilterExportText(exportedFilter);
        } catch (e) {
            reportException(e);
            return;
        }
    });

    if (!resourceInfo) return null;

    const close = () => {
        setResourceInfo(null);
        setTableInfo(null);
        setTableData(null);
        setFilterExportText("");
    }

    return (
        <PopupPortal
            close={close}
        >
            <div className={styles.wrapper}>
                <ReactCodeMirror
                    value={filterExportText}
                    width="100%"
                    height="70vh"
                    onChange={(val: string, viewUpdate: any) => { setFilterExportText(val) }}
                    theme={'dark'}
                    editable={true}
                    autoFocus={true}
                    basicSetup={{
                        lineNumbers: false
                    }}
                />

                <div style={{ marginTop: '15px' }}>
                    <StyledButton
                        text="Update Filter"
                        onClick={() => {
                            try {
                                importFilterSteps(tablesStorage, tableInfo!, tableData!, filterExportText);
                                close();
                            } catch (e) { reportException(e) }
                        }}
                    />
                </div>

            </div>
        </PopupPortal>
    );
}    