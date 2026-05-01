import { useState } from "react";
import { postAMessage, useMessageListener } from "../../../../util/messageBus";
import { TpResourceRenderContext } from "../../element-types/interface";
import { PopupPortal } from "../../../../util/components/popup-portal/PopupPortal";
import styles from './PromptCreateWidget.module.scss';
import { getFeasibleWidgets, TpFeasibleWidgetDefinition } from "./getFeasibleWidgets";
import { RenderElement } from "../../element-types/elementsFactory";
import { ColumnPickerList } from "./ColumnPickerList";

const MESSAGE_PROMPT_CREATE_WIDGET = "_msgPromptCreateWidget";

interface TpCtx {
    handleOK?: any;
    handleCancel?: any;
    resourceRenderCtx: TpResourceRenderContext;
}


export function promptCreateWidget(resourceRenderCtx: TpResourceRenderContext) {
    return new Promise((resolve, reject) => {
        function handleOK(widget: TpFeasibleWidgetDefinition) {
            resolve(widget);
        }

        function handleCancel() {
            reject();
        }

        const ctx: TpCtx = {
            handleOK,
            handleCancel,
            resourceRenderCtx,
        }

        postAMessage(MESSAGE_PROMPT_CREATE_WIDGET, ctx);
    });
}


function createRenderedWidget(ctx: TpCtx, widget: TpFeasibleWidgetDefinition) {
    return <>
        {widget.name}
        <div className={styles.widget}>
            <div className={styles.widgetBox}>
                {RenderElement(ctx.resourceRenderCtx, widget.elemDef, {
                    widthConstrained: true,
                    heightConstrained: true,
                })}
            </div>
            <div className={styles.widgetOverlay} />
        </div>
    </>
}


export function CreateWidgetModal() {
    const [currentTableIdx, setCurrentTableIdx] = useState(0);
    const [currentCtx, setCurrentCtx] = useState<TpCtx | null>(null);

    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

    useMessageListener(MESSAGE_PROMPT_CREATE_WIDGET, (type: string, messageBody: any) => {
        setCurrentTableIdx(0);
        setCurrentCtx(messageBody as TpCtx);
        setSelectedColumns([]);
    });

    if (!currentCtx) return null;
    if (currentCtx.resourceRenderCtx.resourceTables.length == 0) return null;
    const dataTable = currentCtx.resourceRenderCtx.resourceTables[currentTableIdx].tableData;
    if (!dataTable) return null;

    const feasibleWidgetInfo = getFeasibleWidgets({ dataTable, colIds: selectedColumns });

    function handleClickColumn(colId: string) {
        if (selectedColumns.includes(colId)) {
            setSelectedColumns(selectedColumns.filter(col => col != colId));
        } else {
            setSelectedColumns([...selectedColumns, colId]);
        }
    }

    const renderedTables = currentCtx.resourceRenderCtx.resourceTables.map((table, idx) => (
        <div
        className={(idx == currentTableIdx) ? styles.tableActive : styles.table}
            key={table.tableData.id}
            onClick={() => {
                if (idx != currentTableIdx) {
                    setSelectedColumns([]);
                    setCurrentTableIdx(idx);
                }
            }}
        >
            <div>{table.tableData.name}</div>
            {table.tableData.description && <div className={styles.tableDescription}>{table.tableData.description}</div>}
        </div>
    ));

    const renderedWidgets = feasibleWidgetInfo.feasibleWidgets.map((widget) => (
        <div
            key={widget.elemDef.elemTrStateId}
            className={styles.widgetWrapper}
            onClick={() => {
                setCurrentCtx(null);
                currentCtx.handleOK(widget);
            }}
        >
            {createRenderedWidget(currentCtx, widget)}
        </div>
    ));


    return (
        <PopupPortal
            close={() => {
                currentCtx.handleCancel();
                setCurrentCtx(null);
            }}
        >
            <div className={styles.wrapper}>
                <div className={styles.leftPart}>
                    <div className={styles.tables}>
                        {renderedTables}
                    </div>
                    <div className={styles.columns}>
                        <ColumnPickerList 
                        dataTable={dataTable}
                        singleSelectedColumn={null}
                        multiSelectedColumns={selectedColumns}
                        onClickColumn={handleClickColumn}
                        />
                    </div>
                </div>
                <div className={styles.widgetArea}>
                    {feasibleWidgetInfo.message && <div className={styles.widgetMessage}>{feasibleWidgetInfo.message}</div>}
                    {renderedWidgets}
                </div>
            </div>
        </PopupPortal>
    );
}