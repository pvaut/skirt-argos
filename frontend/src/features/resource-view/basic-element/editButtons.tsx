import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TpActiveResourcesStorage } from "../../../data/usage/useActiveResourcesStorage";
import { getElemTypeDef } from "../element-types/elementsFactory";
import { TpResourceRenderContext } from "../element-types/interface";

import styles from './BasicElement.module.scss';
import { promptAddChildElement, promtWidgetSettings } from "./editBasicElement";
import { horizontalGroupDefinition } from "../element-types/horizontal-group/horizontalGroupDefinition";
import { tabberGroupDefinition } from "../element-types/tabber-group/tabberGroupDefinition";
import { verticalGroupDefinition } from "../element-types/vertical-group/verticalGroupDefinition";


export function createEditButtons(activeResourcesStorage: TpActiveResourcesStorage, resourceRenderCtx: TpResourceRenderContext, elemDef: any) {
    const elemTypeDef = getElemTypeDef(elemDef.type);

    return (
        <>
            <div className={styles.editLabel}>{elemTypeDef.name}</div>

            {elemDef.parentElemTrStateId && (
                <div
                    className={styles.editButton}
                    style={{ left: '-11px', top: '5px' }}
                    onClick={() => {
                        activeResourcesStorage.deleteElement(resourceRenderCtx.resourceInfo.uri, elemDef.elemTrStateId);
                    }}
                >
                    <FontAwesomeIcon icon="trash-can" />
                </div>
            )}

            {true && (
                <div
                    className={styles.editButton}
                    style={{ left: '-11px', top: '35px' }}
                    onClick={() => {
                        promtWidgetSettings(activeResourcesStorage, resourceRenderCtx, elemTypeDef, elemDef);
                    }}
                >
                    <FontAwesomeIcon icon="pen-to-square" />
                </div>
            )}

            {(resourceRenderCtx.parentElemInfo.inHorizontalGroup || resourceRenderCtx.parentElemInfo.inTabGroup) && (!resourceRenderCtx.parentElemInfo.lastInGroup) && (
                <div
                    className={styles.moveButton}
                    style={{ right: '-11px', bottom: '11px' }}
                    onClick={() => {
                        activeResourcesStorage.moveElementInParent(resourceRenderCtx.resourceInfo.uri, elemDef.elemTrStateId, true);
                    }}
                >
                    <FontAwesomeIcon icon="chevron-right" />
                </div>
            )}

            {(resourceRenderCtx.parentElemInfo.inHorizontalGroup || resourceRenderCtx.parentElemInfo.inTabGroup) && (!resourceRenderCtx.parentElemInfo.firstInGroup) && (
                <div
                    className={styles.moveButton}
                    style={{ left: '-11px', bottom: '11px' }}
                    onClick={() => {
                        activeResourcesStorage.moveElementInParent(resourceRenderCtx.resourceInfo.uri, elemDef.elemTrStateId, false);
                    }}
                >
                    <FontAwesomeIcon icon="chevron-left" />
                </div>
            )}

            {resourceRenderCtx.parentElemInfo.inVerticalGroup && (!resourceRenderCtx.parentElemInfo.lastInGroup) && (
                <div
                    className={styles.moveButton}
                    style={{ right: '11px', bottom: '-11px' }}
                    onClick={() => {
                        activeResourcesStorage.moveElementInParent(resourceRenderCtx.resourceInfo.uri, elemDef.elemTrStateId, true);
                    }}
                >
                    <FontAwesomeIcon icon="chevron-down" />
                </div>
            )}

            {resourceRenderCtx.parentElemInfo.inVerticalGroup && (!resourceRenderCtx.parentElemInfo.firstInGroup) && (
                <div
                    className={styles.moveButton}
                    style={{ right: '11px', top: '-11px' }}
                    onClick={() => {
                        activeResourcesStorage.moveElementInParent(resourceRenderCtx.resourceInfo.uri, elemDef.elemTrStateId, false);
                    }}
                >
                    <FontAwesomeIcon icon="chevron-up" />
                </div>
            )}

            {(elemTypeDef.id == horizontalGroupDefinition.id) && (
                <div
                    className={styles.editButton}
                    style={{ right: '-11px', top: 'calc(50% - 25px)', height: '50px', lineHeight: '50px' }}
                    onClick={() => {
                        promptAddChildElement(activeResourcesStorage, resourceRenderCtx, elemTypeDef, elemDef)
                    }}
                >
                    <FontAwesomeIcon icon="plus" />
                </div>
            )}

            {(elemTypeDef.id == tabberGroupDefinition.id) && (
                <div
                    className={styles.editButton}
                    style={{ right: '-11px', top: '50px', height: '50px', lineHeight: '50px' }}
                    onClick={() => {
                        promptAddChildElement(activeResourcesStorage, resourceRenderCtx, elemTypeDef, elemDef)
                    }}
                >
                    <FontAwesomeIcon icon="plus" />
                </div>
            )}

            {(elemTypeDef.id == verticalGroupDefinition.id) && (
                <div
                    className={styles.editButton}
                    style={{ left: 'calc(50% - 11px)', bottom: '-11px', width: '50px' }}
                    onClick={() => {
                        promptAddChildElement(activeResourcesStorage, resourceRenderCtx, elemTypeDef, elemDef);
                    }}
                >
                    <FontAwesomeIcon icon="plus" />
                </div>
            )}

        </>
    )
}