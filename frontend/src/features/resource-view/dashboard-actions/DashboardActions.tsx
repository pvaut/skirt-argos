import { useState } from "react";
import { useActiveResourcesStorage } from "../../../data/usage/useActiveResourcesStorage";
import { useTablesStorage } from "../../../data/usage/useTablesStorage";
import { postAMessage, useMessageListener } from "../../../util/messageBus";
import { TpResourceRenderContext } from "../element-types/interface";
import { PopupPortal } from "../../../util/components/popup-portal/PopupPortal";

import styles from './DashboardActions.module.scss';
import { StyledButton } from "../../../util/components/buttons/styled-button/StyledButton";
import { executeForm, TpFormExecutionContext } from "../../../util/components/form/Form";
import { createFormChoice, createFormString } from "../../../util/components/form/formFieldTypes";
import { guid } from "../../../util/misc";
import { EditDashboardAction } from "./EditDashboardAction";
import { TpDashboardAction } from "../../../data/interfaces";
import { getConfirmation } from "../../../util/components/simple-modals/ConfirmationPopup";
import { TARGET_DASHBOARD } from "../../../util/table-computations/interface";

const MESSAGE_PROMPT_DASHBOARD_ACTIONS = "_msgMESSAGE_PROMPT_DASHBOARD_ACTIONS";




interface TpCtx {
    resourceRenderCtx: TpResourceRenderContext;
}

export function promptDashboardActions(resourceRenderCtx: TpResourceRenderContext) {
    const ctx: TpCtx = {
        resourceRenderCtx,
    }
    postAMessage(MESSAGE_PROMPT_DASHBOARD_ACTIONS, ctx);
}

export function PromptDashboardActionsModal() {

    const tablesStorage = useTablesStorage();
    const activeResourcesStorage = useActiveResourcesStorage();



    const [currentCtx, setCurrentCtx] = useState<TpCtx | null>(null);
    const [editingActionId, setEditingActionId] = useState<string | null>(null);


    useMessageListener(MESSAGE_PROMPT_DASHBOARD_ACTIONS, (type: string, messageBody: any) => {
        setCurrentCtx(messageBody as TpCtx);
        setEditingActionId(null);
    });

    if (!currentCtx) return null;

    // Note: we get it from the store, in order to have the up-to-date version
    const resourceInfo = activeResourcesStorage.getActiveResource(currentCtx.resourceRenderCtx.resourceInfo.uri);

    console.log(`==> actions: ${JSON.stringify(resourceInfo.renderTemplate!.actions)}`);

    function promptAddAction() {
        const fieldName = createFormString("name", "Action Name", "", 1);
        fieldName.validator = (ctx: TpFormExecutionContext, value: any) => { if (!value) throw "Name should not be empty"; };
        executeForm({
            name: 'Add action',
            fields: [
                fieldName,
                createFormChoice("tableId", "Target", 
                    [
                        {id:TARGET_DASHBOARD, value: "Dashboard"},
                        ...currentCtx!.resourceRenderCtx.resourceTables.map(table => ({ id: table.tableData.id, value: `Individual ${table.tableData.name} items` }))
                    ]),
            ],
            buttons: [],
        }).then((result: any) => {
            const id = guid();
            activeResourcesStorage.addOrModifyDashboardAction(resourceInfo.uri, { id, name: result.data.name, targetTableId: result.data.tableId, actionDef: "" });
            setTimeout(() => { setEditingActionId(id) }, 50);
        });
    }


    function promptDeleteAction(actionDef: TpDashboardAction) {
        getConfirmation({ title: 'Delete action', description: `Are you sure you want to permanently delete action "${actionDef.name}" ?` }).then((resp) => {
            if (resp) {
                if (actionDef.id == editingActionId) setEditingActionId(null);
                activeResourcesStorage.deleteDashboardAction(resourceInfo.uri, actionDef.id);
            }
        });
    }

    return (
        <PopupPortal
            close={() => {
                setCurrentCtx(null);
            }}
        >
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    Dashboard actions
                </div>
                <div className={styles.body}>
                    {(resourceInfo.renderTemplate!.actions || []).map(actionDef => {
                        let targetName = "Dashboard";
                        if (actionDef.targetTableId != TARGET_DASHBOARD)
                            targetName = "Individual " + (currentCtx!.resourceRenderCtx.resourceTables.find(tb => tb.tableData.id == actionDef.targetTableId)?.tableData.name || "Unknown") + " items";
                        if (actionDef.id != editingActionId) {
                            return (
                                <div
                                    key={actionDef.id}
                                    onClick={() => { if (!editingActionId) setEditingActionId(actionDef.id) }}
                                    className={editingActionId ? styles.lineDisabled : styles.line}
                                >
                                    <div style={{ fontSize: '90%', opacity: 0.7, paddingBottom: '5px' }}>
                                        Target: {targetName}
                                    </div>
                                    <div><b>{actionDef.name}</b></div>
                                </div>
                            );
                        } else {
                            return (
                                <div
                                    key={actionDef.id}
                                    className={styles.lineOpened}
                                >
                                    <div style={{ fontSize: '90%', opacity: 0.7, paddingBottom: '10px' }}>
                                        Target: {targetName}
                                    </div>
                                    <EditDashboardAction
                                        resourceInfo={resourceInfo}
                                        tablesStorage={tablesStorage}
                                        action={actionDef}
                                        onOK={(newAction: TpDashboardAction) => {
                                            activeResourcesStorage.addOrModifyDashboardAction(resourceInfo.uri, newAction);
                                            setEditingActionId(null);
                                        }}
                                        onCancel={() => {
                                            setEditingActionId(null);
                                        }}
                                        onDelete={() => promptDeleteAction(actionDef)}
                                    />
                                </div>)
                        }
                    })}
                    {!editingActionId && (
                        <div style={{ padding: '20px' }}>
                            <StyledButton
                                text="Add action..."
                                onClick={promptAddAction}
                            />
                        </div>
                    )}
                </div>
            </div>
        </PopupPortal>
    );
}