import { useState } from "react";
import { createConfigError } from "../../../../util/errors";
import { BasicElement } from "../../basic-element/BasicElement";
import { RenderElement } from "../elementsFactory";
import { getChildrenSizingInfo, getWidgetSize, SIZE_DIM } from "../helpers/elemSizeInfo";
import { TpElemProps } from "../interface";

import styles from './TabberGroup.module.scss';


export function TabberGroup(props: TpElemProps) {
    const { resourceRenderCtx, elemDef, sizingContext } = props;
    const dashboardEditMode = resourceRenderCtx.dashboardEditMode;

    const tabCount = elemDef.elements.length;

    const [activeTabIdx, setActiveTabIdx] = useState(0);

    const currentActiveTabIdx = Math.min(activeTabIdx, tabCount - 1);

    if (tabCount == 0) {
        return (<BasicElement {...props}><div style={{padding: '30px', textAlign:'center'}}>No tabs defined</div></BasicElement>)
    }

    if (sizingContext.heightConstrained)
        throw createConfigError("Tab cannot be constrained in height");

    const tabNamesString = elemDef.settings && elemDef.settings.tabNames || "";
    const tabNames = tabNamesString.length >0 ? tabNamesString.split(';') :[];

    const tabs: any[] = []
    for (let tabIdx = 0; tabIdx < tabCount; tabIdx++) {
        let tabName = `Tab ${tabIdx + 1}`;
        if (tabIdx < tabNames.length) tabName = tabNames[tabIdx];
        tabs.push(
            <div
                key={`tab_${tabIdx}`}
                className={(tabIdx == currentActiveTabIdx) ? styles.tabActive : styles.tab}
                onClick={() => {
                    setActiveTabIdx(tabIdx);
                }}
            >
                {tabName}
            </div>
        )
    }

    const style: any = {
        width: '100%',
    };
    let heightConstrained: boolean = sizingContext.heightConstrained;
    const childSizeV = getWidgetSize(elemDef.elements[currentActiveTabIdx], SIZE_DIM.VERT);
    if (childSizeV && (!childSizeV.isPercentage)) {
        style.height = `${childSizeV.value}px`;
        heightConstrained = true
    }

    const activeElement = (
        RenderElement(
            {
                ...resourceRenderCtx,
                parentElemInfo: {
                    ...resourceRenderCtx.parentElemInfo, 
                    inHorizontalGroup: false,
                    inVerticalGroup: false,
                    inTabGroup: true,
                    firstInGroup: (currentActiveTabIdx == 0),
                    lastInGroup: (currentActiveTabIdx == elemDef.elements.length-1),
                }
            },
    elemDef.elements[currentActiveTabIdx],
            {
                widthConstrained: sizingContext.widthConstrained,
                heightConstrained,
            })
    )



    return (
        <BasicElement {...props}>
            <div>
                <div className={styles.tabGroup}>
                    {tabs}
                    <div className={styles.sepLine}/>
                </div>
                <div style={style}>
                    {activeElement}
                </div>
            </div>
        </BasicElement>
    )
}