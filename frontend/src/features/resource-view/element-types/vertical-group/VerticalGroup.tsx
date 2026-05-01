import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { createConfigError } from "../../../../util/errors";
import { BasicElement } from "../../basic-element/BasicElement";
import { RenderElement } from "../elementsFactory";
import { getChildrenSizingInfo, SIZE_DIM } from "../helpers/elemSizeInfo";
import { TpElemProps } from "../interface";

import styles from './VerticalGroup.module.scss';
import { useState } from "react";



export function VerticalGroup(props: TpElemProps) {
    const { resourceRenderCtx, elemDef, sizingContext } = props;
    const dashboardEditMode = resourceRenderCtx.dashboardEditMode;

    const [expanded, setExpanded] = useState(true);

    const sectionTitle = elemDef.settings?.title || "";

    const subElements = [];

    if (!sizingContext.widthConstrained) throw createConfigError("Vertical group should have width constrained");

    if (expanded) {
        const childrenSizes = getChildrenSizingInfo(elemDef.elements, SIZE_DIM.VERT, sizingContext.heightConstrained);

        for (const [index, subElemDef] of elemDef.elements.entries()) {
            const style: any = { width: '100%' };
            if (childrenSizes[index].sizeString) style.height = childrenSizes[index].sizeString;
            subElements.push(
                <div
                    key={`elem_${index}`}
                    style={style}
                >
                    {RenderElement(
                        {
                            ...resourceRenderCtx,
                            parentElemInfo: {
                                ...resourceRenderCtx.parentElemInfo,
                                inHorizontalGroup: false,
                                inTabGroup: false,
                                inVerticalGroup: true,
                                firstInGroup: (index == 0),
                                lastInGroup: (index == elemDef.elements.length - 1),
                            }
                        },
                        subElemDef, {
                        widthConstrained: sizingContext.widthConstrained,
                        heightConstrained: childrenSizes[index].sizeConstrained || sizingContext.heightConstrained,
                    })}
                </div>);
        }
    }

    // if (dashboardEditMode) {
    //     subElements.push(
    //         <div>Add...</div>
    //     );
    // }
    return (
        <BasicElement {...props}>
            {sectionTitle && (
                <div
                    className={styles.sectionTitle}
                    onClick={() => { setExpanded(!expanded) }}
                >
                    {sectionTitle}&nbsp;
                    {expanded ? <FontAwesomeIcon icon="chevron-up" /> : <FontAwesomeIcon icon="chevron-down" />}

                    <div className={styles.sepLine} />
                </div>
            )}
            {subElements}
        </BasicElement>
    )
}