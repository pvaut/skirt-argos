import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { createConfigError } from "../../../util/errors";
import { elemTypeDefsMap, getElemTypeDef } from "../element-types/elementsFactory";
import { TpElemProps } from "../element-types/interface";
import styles from './DataWidget.module.scss';
import { Menu } from "./menu/Menu";
import { useRef, useState } from "react";
import { TpDataWidgetActions, TpDataWidgetCtx, TpDataWidgetShortcutButton } from "./interface";
import React from "react";
import { BasicElement } from "../basic-element/BasicElement";
import { ErrorBoundary } from "../../../util/error-boundaries/ErrorBoundary";
import InfoTooltip from "../../../util/components/info-tooltip/InfoTooltip";
import { showContextMenu } from "../../../util/components/context-menu/ContextMenu";
import { DataWidgetHelp } from "./DataWidgetHelp";


function compareProps(previousProps: TpElemProps, newProps: TpElemProps) {
    // WARNING: THIS IS A DANGEROUS FUNCTION. IF MORE INFO IS ADDED TO THE PROPS, THIS SHOULD REFLECT IN MORE TESTS IN THIS FUNCTION
    if (JSON.stringify(previousProps.elemDef) != JSON.stringify(newProps.elemDef)) return false;
    if (previousProps.resourceRenderCtx.resourceInfo.uri != newProps.resourceRenderCtx.resourceInfo.uri) return false;
    if (previousProps.resourceRenderCtx.resourceInfo.status != newProps.resourceRenderCtx.resourceInfo.status) return false;
    if (previousProps.resourceRenderCtx.resourceTables != newProps.resourceRenderCtx.resourceTables) return false;
    if (previousProps.resourceRenderCtx.dashboardEditMode != newProps.resourceRenderCtx.dashboardEditMode) return false;
    if (JSON.stringify(previousProps.resourceRenderCtx.parentElemInfo) != JSON.stringify(newProps.resourceRenderCtx.parentElemInfo)) return false;
    return true;
}


function DataWidget(props: TpElemProps) {
    const { resourceRenderCtx, elemDef } = props;
    const ElemTypeDef = getElemTypeDef(elemDef.type);
    const dashboardEditMode = resourceRenderCtx.dashboardEditMode;

    const [menuActive, setMenuActive] = useState(false);
    const [shortcutButtons, setShortcutButtons] = useState<TpDataWidgetShortcutButton[]>([]);
    const refWidgetWrapper = useRef<HTMLDivElement>(null);
    const refWidgetContent = useRef<HTMLDivElement>(null);
    const refHelpButton = useRef<HTMLDivElement>(null);
    const dataWidgetActionsRef = useRef<TpDataWidgetActions | null>(null);

    const dataWidgetCtx: TpDataWidgetCtx = {
        setDataWidgetActions: (actions: TpDataWidgetActions) => { dataWidgetActionsRef.current = actions },
        setDataWidgetShortcutButtons: (buttons: TpDataWidgetShortcutButton[]) => {
            setShortcutButtons(buttons);
        }
    };

    function toggleFullScreen() {
        if (!document.fullscreenElement) {
            refWidgetContent.current!.requestFullscreen();
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }

    const theChart = <ElemTypeDef.renderComponent
        resourceRenderCtx={resourceRenderCtx}
        elemDef={elemDef}
        dataWidgetCtx={dataWidgetCtx}
    />;

    return (
        <div
            className={dashboardEditMode ? styles.widgetMarginWrapperEditMode : styles.widgetMarginWrapper}
        >
            <BasicElement {...props}>
                <div
                    className={styles.widget}
                    ref={refWidgetWrapper}
                >

                    <div
                        style={{ width: '100%', height: '100%', position: 'relative' }}
                        ref={refWidgetContent}
                    >
                        <ErrorBoundary>
                            {theChart}
                        </ErrorBoundary>
                        {dashboardEditMode && // inserted to avoid interactions with the chart during edit mode
                            <div className={styles.editOverlay} />}
                    </div>

                    <div
                        className={styles.menuButton}
                        onClick={() => { setMenuActive(true); }}
                    >
                        <FontAwesomeIcon icon="bars" />
                    </div>

                    {(!dashboardEditMode && (
                        <div className={styles.buttonBox}>
                            <div className={styles.smallButton}
                                ref={refHelpButton}
                                onClick={() => {
                                    if (refHelpButton.current) showContextMenu(refHelpButton.current!,
                                        <DataWidgetHelp
                                            resourceRenderCtx={resourceRenderCtx}
                                            elemDef={elemDef}
                                            dataWidgetCtx={dataWidgetCtx}
                                        />);
                                }}
                            >
                                <FontAwesomeIcon icon="question" />
                            </div>
                            {shortcutButtons.map((button) => (
                                <div
                                    className={button.active ? styles.smallButtonActive : styles.smallButton}
                                    key={button.icon}
                                    onClick={button.handle}
                                >
                                    <FontAwesomeIcon icon={button.icon as any} />
                                </div>
                            ))}
                            <div
                                className={styles.smallButton}
                                onClick={toggleFullScreen}
                                key="fullscreen"
                            >
                                <FontAwesomeIcon icon="display" />
                            </div>
                        </div>
                    ))}

                    {menuActive && (
                        <Menu
                            resourceRenderCtx={resourceRenderCtx}
                            elemDef={elemDef}
                            widgetElem={refWidgetWrapper.current!}
                            close={() => { setMenuActive(false); }}
                            dataWidgetActions={dataWidgetActionsRef.current!}
                        />
                    )}

                </div>
            </BasicElement>
        </div>
    )
}

export default React.memo(DataWidget, compareProps);