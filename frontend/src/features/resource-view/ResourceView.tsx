import { useParams } from "react-router-dom";
import { cleanupTemplate, getConcept, getTableUri, useConfig } from "../../data/helpers";
import { useEffect, useRef, useState } from "react";
import { LOAD_STATUS } from "../../data/interfaces";

import styles from './ResourceView.module.scss';
import Loader from "../../util/components/loader/Loader";

import { RenderElement } from "./element-types/elementsFactory";
import { MESSAGE_OPENEDROWS_UPDATE, TpResourceRenderContext } from "./element-types/interface";
import { useTablesStorage } from "../../data/usage/useTablesStorage";
import { getOpenedRows, useActiveResourcesStorage } from "../../data/usage/useActiveResourcesStorage";
import { FilterPanel } from "./filter-panel/FilterPanel";
import { CircularButton } from "../../util/components/buttons/circular-button/CircularButton";
import { getConfirmation } from "../../util/components/simple-modals/ConfirmationPopup";
import { messagePopup } from "../../util/components/simple-modals/MessagePopup";
import { OpenedRows } from "./opened-rows/OpenedRows";
import { postAMessage, useMessageListener } from "../../util/messageBus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { collectVolumeAnimationInfo, createChartInteractive, TpAnimationInfo } from "./helpers";
import { collectDashboardWidgets } from "./element-types/helpers/collectDashboardWidgets";
import { editComputeDerivedProperties } from "./compute-derived/PromptComputeDerivedProperties";
import { guid } from "../../util/misc";
import { useResourceInfo } from "../../data/usage/useResourceInfo";
import { useLocalResourcesStorage } from "../../data/usage/useLocalResourcesStorage";
import { locDb } from "../../data/local-database/localDatabase";
import { SmartMarkdown } from "../../util/components/smart-markdown/SmartMarkdown";
import { promptContextMenuItems } from "../../util/components/context-menu/ContextMenu";
import { promptDashboardActions } from "./dashboard-actions/DashboardActions";
import { ErrorBoundary } from "../../util/error-boundaries/ErrorBoundary";
import { MESSAGE_STOP_VOL_POV_ANIM, MESSAGE_VOL_POV_ANIM_INCR } from "./element-types/canvas-volume/interface";
import { createInternalError } from "../../util/errors";


const MSG_SCROLL_DASHBOARD_TO_BOTTOM = "MSG_SCROLL_DASHBOARD_TO_BOTTOM";


export function shrollDashboardToBottom(uri: string) {
    postAMessage(MSG_SCROLL_DASHBOARD_TO_BOTTOM, { uri });
}


export function ResourceView() {
    let { uri } = useParams();
    if (!uri) uri = "";

    const [dashboardEditMode, setDashboardEditMode] = useState(false);
    const [configWasModified, setConfigWasModified] = useState(false);
    const [animPauzed, setAminPauzed] = useState(false);
    const renderWrapperRef = useRef<HTMLDivElement>(null);
    const scrollableBodyRef = useRef<HTMLDivElement>(null);
    const refEditButton = useRef<HTMLDivElement>(null);
    const config = useConfig();
    const activeResourcesStorage = useActiveResourcesStorage();
    const localResourceStorage = useLocalResourcesStorage();
    const resourceInfo = useResourceInfo(uri);
    const tablesStorage = useTablesStorage();
    const openedRows = getOpenedRows(resourceInfo);
    const zoomFactor = useRef(100);
    const animInfoRef = useRef<{ animationTimeStamp: DOMHighResTimeStamp | undefined, animationFrameId: number | undefined }>({ animationTimeStamp: undefined, animationFrameId: undefined })

    //Perform the automatic rotating animation, if not pauzed
    useEffect(() => {

        const animate = (timeStamp: DOMHighResTimeStamp) => {
            if (animInfoRef.current.animationTimeStamp) {
                const incr = (timeStamp - animInfoRef.current.animationTimeStamp) / 10000;
                postAMessage(MESSAGE_VOL_POV_ANIM_INCR, { incr });
            }
            animInfoRef.current.animationFrameId = requestAnimationFrame(animate);
            animInfoRef.current.animationTimeStamp = timeStamp;
        };

        const startAnimation = () => {
            animInfoRef.current.animationFrameId = requestAnimationFrame(animate);
        }

        const stopAnimation = () => {
            if (animInfoRef.current.animationFrameId !== undefined) {
                cancelAnimationFrame(animInfoRef.current.animationFrameId);
                animInfoRef.current.animationFrameId = undefined;
                animInfoRef.current.animationTimeStamp = undefined;
            }
        }

        if (!animPauzed) startAnimation();
        else stopAnimation();

        return () => { stopAnimation() };
    }, [animPauzed]);


    useMessageListener(MESSAGE_STOP_VOL_POV_ANIM, (messageType: string, messageBody: any) => {
        setAminPauzed(true);
    });

    useMessageListener(MSG_SCROLL_DASHBOARD_TO_BOTTOM, (messageType: string, messageBody: any) => {
        if (messageBody.uri == uri) {
            const elem = scrollableBodyRef.current;
            if (elem) elem.scrollTo({ top: elem.scrollHeight, behavior: 'smooth' });
        }
    })

    if ((!resourceInfo) || (resourceInfo.status != LOAD_STATUS.PRESENT)) return (
        <div style={{ textAlign: 'center', paddingTop: '50px' }}>
            <Loader />
        </div>
    );

    const renderTemplate = resourceInfo.renderTemplate;
    const conceptInfo = getConcept(config, resourceInfo!.conceptId);

    let animInfoList: TpAnimationInfo[] = [];
    if (renderTemplate)
        animInfoList = collectVolumeAnimationInfo(renderTemplate);

    function setDashboardOverallMagFactor(percentage: number) {
        // This is used in dashboard edit mode, to display a smaller version for overview
        zoomFactor.current = percentage;
        if (!renderWrapperRef.current) return;
        if (percentage == 100)
            renderWrapperRef.current.style.transform = "";
        else {
            const offset = (100 - percentage) / 2;
            renderWrapperRef.current.style.transform = `translate(0,-${offset}%) scale(${percentage}%)`;
        }
    }

    function handleSaveTemplate() {
        getConfirmation({
            title: 'Save template',
            description: `Do you want to save the current view as the new default for all resources belonging to the concept "${conceptInfo.name}"?`
        })
            .then((accepted) => {
                if (!accepted) return;
                const toSaveTemplate = cleanupTemplate(renderTemplate);
                if (!conceptInfo.isLocal) throw createInternalError(`Only local concepts are supported`);
                localResourceStorage.saveRenderTemplate(toSaveTemplate);
                locDb.storeConceptRenderTemplate(conceptInfo.id, toSaveTemplate).then(() => {
                    if (!dashboardEditMode) setConfigWasModified(false);
                    messagePopup({ title: 'Success', description: "Resource view has been updated" });
                });
            })
            .catch(() => { });
    }


    function addOpenedRow(tableUri: string, rowKeyIndex: number) {
        if (!uri) return;
        activeResourcesStorage.addOpenedRow(uri, tableUri, rowKeyIndex);
        postAMessage(MESSAGE_OPENEDROWS_UPDATE, {});
    }

    function closeOpenedRow(tableUri: string, rowKeyIndex: number) {
        if (!uri) return;
        activeResourcesStorage.closeOpenedRow(uri, tableUri, rowKeyIndex);
        postAMessage(MESSAGE_OPENEDROWS_UPDATE, {});
    }

    function closeAllOpenedRows() {
        activeResourcesStorage.closeAllOpenedRows(uri!);
        postAMessage(MESSAGE_OPENEDROWS_UPDATE, {});
    }



    let rootRenderedElement: any = <div>No template present</div>;

    const ctx: TpResourceRenderContext = {
        resourceInfo: resourceInfo!,
        dashboardEditMode,
        parentElemInfo: {},
        addOpenedRow,
        closeOpenedRow,
        resourceTables: [],
        dashboardWidgetDefs: collectDashboardWidgets(renderTemplate),
        volumeAnimating: !animPauzed,
    }

    if (renderTemplate) {
        for (const table of resourceInfo.tables) {
            const tableData = tablesStorage.findTableData(getTableUri(uri, table.id));
            if (tableData) {
                const tableInfo = tablesStorage.getTableInfo(tableData.tableUri);
                ctx.resourceTables.push({ tableInfo, tableData });
            }
        }
        rootRenderedElement = RenderElement(
            ctx,
            renderTemplate.rootElement,
            { widthConstrained: true, heightConstrained: false } // @todo: constrain height once we have scroller elements implemented
        );
        if (ctx.resourceTables.length > 0) {
            // We add a button to create a new chart
            rootRenderedElement = (<>
                {rootRenderedElement}
                <div
                    className={styles.addChartButton}
                    onClick={() => {
                        createChartInteractive(ctx, activeResourcesStorage, () => {
                            setConfigWasModified(true);
                            setTimeout(() => { shrollDashboardToBottom(uri); }, 50);
                        });
                    }}
                >
                    <FontAwesomeIcon icon="plus" />
                </div>
            </>);
        }
    }

    const renderedIssues: any[] = [];
    for (const issue of ctx.resourceInfo.issues)
        renderedIssues.push(<div key={guid()} className={styles.issueError}>{issue.message}</div>)
    for (const table of ctx.resourceTables) {
        for (const issue of table.tableData.issues)
            renderedIssues.push(<div key={guid()} className={styles.issueError}>{issue.message}</div>)
    }

    let loadingCompleted = true;
    for (const tableDef of resourceInfo.tables) {
        const tableUri = getTableUri(resourceInfo.uri, tableDef.id);
        const tableInfo = tablesStorage.findTableInfo(tableUri);
        const tableData = tablesStorage.findTableData(tableUri);
        if (!tableInfo || !tableDef || !tableData) loadingCompleted = false;
    }

    if (!loadingCompleted) return <Loader paddingTop={50} />

    function promptEditOptions() {
        promptContextMenuItems(refEditButton.current!, {
            items: [
                {
                    name: 'Edit dashboard layout',
                    description: 'Interactively modify the visual layout of the dashboard and add new elements.',
                    action: () => {
                        setDashboardEditMode(true);
                        setDashboardOverallMagFactor(100);
                        setConfigWasModified(true);
                    }
                },
                {
                    name: 'Edit derived properties',
                    description: 'Compute new properties, defined as expressions over the existing data.',
                    action: () => {
                        editComputeDerivedProperties(ctx);
                        setConfigWasModified(true);
                    }
                },
                {
                    name: 'Edit actions',
                    description: 'Create or modify custom dashboard actions that can be triggered by the user.',
                    action: () => {
                        promptDashboardActions(ctx);
                        setConfigWasModified(true);
                    }
                },
            ]
        })
    }

    return (
        <div
            // NOTE: having the unique resource URI as key is critical in order to force a full rerender when switching between resources
            key={uri}
        >

            <div className={styles.fixedPanel}>
                <div className={styles.filterPanel}>
                    {resourceInfo && (resourceInfo.tables.length > 0) && (
                        <ErrorBoundary>
                            <FilterPanel resourceInfo={resourceInfo} />
                        </ErrorBoundary>
                    )}
                </div>
                <div className={styles.actionsPanel}>
                    <div>
                        {(animInfoList.length > 0) && (
                            <CircularButton
                                onClick={() => { setAminPauzed(!animPauzed) }}
                                icon={animPauzed ? "play" : "pause"}
                            />
                        )}
                        <div ref={refEditButton} style={{ display: 'inline-block' }}>
                            <CircularButton
                                onClick={() => {
                                    if (!dashboardEditMode)
                                        promptEditOptions();
                                    else
                                        setDashboardEditMode(false);
                                }}
                                icon="pencil"
                                checked={dashboardEditMode}
                            />
                        </div>
                        <CircularButton
                            onClick={() => { handleSaveTemplate() }}
                            highlight={configWasModified}
                            icon="floppy-disk"
                        />
                    </div>

                </div>
            </div>


            <div className={styles.body} ref={scrollableBodyRef}>
                <div style={{ padding: 'var(--dashboard-hmargin)' }}>
                    <h1>
                        {resourceInfo.name}
                    </h1>
                    <div>
                        <SmartMarkdown>{resourceInfo.description}</SmartMarkdown>
                    </div>
                </div>

                {renderedIssues}

                <div ref={renderWrapperRef}>
                    {rootRenderedElement}
                </div>
            </div>

            {(openedRows.length > 0) && (
                <OpenedRows
                    resourceRenderCtx={ctx}
                    close={closeAllOpenedRows}
                />
            )}


            {dashboardEditMode && (
                <div className={styles.zoomBox}>
                    <input
                        style={{ width: '100%', boxSizing: "border-box" }}
                        type="range"
                        min={30}
                        max={100}
                        step={2}
                        defaultValue={zoomFactor.current}
                        onChange={(ev) => {
                            const newValue = parseFloat(ev.target.value);
                            setDashboardOverallMagFactor(newValue)
                        }}
                    />
                </div>
            )}
        </div>
    )
}