import { createPortal } from "react-dom";


import styles from './OpenedRows.module.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getOpenedRows } from "../../../data/usage/useActiveResourcesStorage";
import { useEffect, useRef, useState } from "react";
import { MESSAGE_OPENEDROWS_UPDATE, TpResourceRenderContext } from "../element-types/interface";
import { useMessageListener } from "../../../util/messageBus";
import { useTablesStorage } from "../../../data/usage/useTablesStorage";
import { SingleOpenedRow } from "./SingleOpenedRow";


interface TpProps {
    resourceRenderCtx: TpResourceRenderContext;
    close: () => void;
}


export function OpenedRows(props: TpProps) {
    const { resourceRenderCtx, close } = props;
    const [expanded, setExpanded] = useState(false);
    const rowsWrapperElem = useRef<HTMLDivElement>(null);

    const tablesStorage = useTablesStorage();

    const resourceInfo = resourceRenderCtx.resourceInfo;

    useEffect(() => {
        setTimeout(() => { setExpanded(true) }, 10)
    }, []);

    useMessageListener(MESSAGE_OPENEDROWS_UPDATE, (messageType: string, messageBody: any) => {
        // Make sure that, if a new row is added, it is scrolled into view
        setTimeout(() => {
            const lastChild = rowsWrapperElem.current?.lastChild;
            if (lastChild)
                ((lastChild) as any).scrollIntoView({ behavior: 'smooth' });
        }, 25);
    });

    const openedRows = getOpenedRows(resourceInfo);

    const docEl = document.getElementById('modalPopupElem');
    if (!docEl) return null;

    const theElement = (
        <div className={expanded ? styles.wrapperExpanded : styles.wrapperCollapsed}
            onClick={() => { if (!expanded) setExpanded(true) }}
        >
            <div className={styles.buttonBar}>
                <button style={{ left: 0 }} onClick={() => setExpanded(!expanded)}>
                    <FontAwesomeIcon icon="chevron-left" />
                </button>
                <button style={{ right: 0 }} onClick={close}>
                    <FontAwesomeIcon icon="times" />
                </button>
            </div>
            <div className={styles.content} ref={rowsWrapperElem}>
                {openedRows.map(row =>
                    <SingleOpenedRow resourceRenderCtx={resourceRenderCtx} tablesStorage={tablesStorage} row={row} />
                )}
            </div>
            {(!expanded) && <div className={styles.expandClicker} />}
        </div>
    );

    return createPortal(theElement, docEl);

}