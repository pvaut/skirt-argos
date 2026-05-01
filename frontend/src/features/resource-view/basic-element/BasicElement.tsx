import { TpResourceRenderContext } from "../element-types/interface";
import styles from './BasicElement.module.scss';
import React from "react";
import { TpSizingContext } from "../element-types/helpers/elemSizeInfo";
import { useActiveResourcesStorage } from "../../../data/usage/useActiveResourcesStorage";
import { createEditButtons } from "./editButtons";


export interface TpProps {
    resourceRenderCtx: TpResourceRenderContext,
    elemDef: any,
    sizingContext: TpSizingContext,
    children: React.ReactNode;
}


export function BasicElement(props: TpProps) {
    const { resourceRenderCtx, elemDef, sizingContext, children } = props;
    const dashboardEditMode = resourceRenderCtx.dashboardEditMode;

    const activeResourcesStorage = useActiveResourcesStorage();

    const styleOuter: any = {
        position: 'relative',
        boxSizing: 'border-box',
    };
    const styleInner: any = {
        position: 'relative',
    };

    if (sizingContext.widthConstrained) {
        styleOuter.width = '100%';
        styleInner.width = '100%';
    }
    if (sizingContext.heightConstrained) {
        styleOuter.height = '100%';
        styleInner.height = '100%';
    }

    if (dashboardEditMode) {

        if ((resourceRenderCtx.parentElemInfo.inHorizontalGroup) && (!resourceRenderCtx.parentElemInfo.lastInGroup)) {
            styleOuter.paddingRight = '25px';
        }

        if ((resourceRenderCtx.parentElemInfo.inVerticalGroup) && (!resourceRenderCtx.parentElemInfo.lastInGroup)) {
            styleOuter.paddingBottom = '25px';
        }
    }

    return (
        <div style={styleOuter}>
            <div key={elemDef.elemTrStateId}
                className={dashboardEditMode ? styles.wrapperEditing : styles.wrapper}
                style={styleInner}
            >
                {children}
                {dashboardEditMode && createEditButtons(activeResourcesStorage, resourceRenderCtx, elemDef)}
            </div>
        </div>
    )
}
