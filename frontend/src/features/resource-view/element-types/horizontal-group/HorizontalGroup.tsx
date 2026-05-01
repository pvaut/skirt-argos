import { createConfigError } from "../../../../util/errors";
import { BasicElement } from "../../basic-element/BasicElement";
import { RenderElement } from "../elementsFactory";
import { getChildrenSizingInfo, getWidgetSize, SIZE_DIM } from "../helpers/elemSizeInfo";
import { TpElemProps } from "../interface";

import styles from './HorizontalGroup.module.scss';


export function HorizontalGroup(props: TpElemProps) {
    const { resourceRenderCtx, elemDef, sizingContext } = props;
    const dashboardEditMode = resourceRenderCtx.dashboardEditMode;

    const subElements = [];

    if (!sizingContext.widthConstrained) throw createConfigError("Horizontal group should have width constrained");

    const childrenSizes = getChildrenSizingInfo(elemDef.elements, SIZE_DIM.HOR, sizingContext.widthConstrained);

    for (const [index, subElemDef] of elemDef.elements.entries()) {
        const style: any = {
            display: 'inline-block',
            verticalAlign: 'top',
            whiteSpace: 'normal',
        };
        if (childrenSizes[index].sizeString) style.width = childrenSizes[index].sizeString;
        const vertSize = getWidgetSize(subElemDef, SIZE_DIM.VERT);
        if (vertSize && (!vertSize.isPercentage))
            style.height = `${vertSize.value}px`;

        subElements.push(
            <div key={`elem_${index}`} style={style}>
                {RenderElement(
                    {
                        ...resourceRenderCtx,
                        parentElemInfo: {
                            ...resourceRenderCtx.parentElemInfo, 
                            inVerticalGroup: false,
                            inTabGroup: false,
                            inHorizontalGroup: true,
                            firstInGroup: (index == 0),
                            lastInGroup: (index == elemDef.elements.length-1),
                        }
                    },
                    subElemDef,
                    {
                        widthConstrained: childrenSizes[index].sizeConstrained,
                        heightConstrained: sizingContext.heightConstrained || (vertSize != null),
                    })}
            </div>
        );
    }
    return (
        <BasicElement {...props}>
            <div style={{ whiteSpace: 'nowrap' }}>
                {subElements}
            </div>
        </BasicElement>
    )
}