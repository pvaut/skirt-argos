
import { createConfigError } from "../../../util/errors";
import DataWidget from "../data-widget/DataWidget";
import { actionButtonDefinition } from "./action-button/actionButtonDefinition";

import { canvas2DDefinition } from "./canvas-2d/canvas2DDefinition";
import { canvasVolumeDefinition } from "./canvas-volume/canvasVolumeDefinition";
import { categoricalFacetDefinition } from "./categorical-facet/categoricalFacetDefinition";
import { TpSizingContext } from "./helpers/elemSizeInfo";
import { horizontalGroupDefinition } from "./horizontal-group/horizontalGroupDefinition";

import { ELEMTYPE_CLASSES, TpElemTypeDef, TpResourceRenderContext } from "./interface";
import { numStatSummaryDefinition } from "./num-stat-summary/numStatSummaryDefinition";
import { staticTextDefinition } from "./static-text/staticTextDefinition";
import { tabberGroupDefinition } from "./tabber-group/tabberGroupDefinition";
import { tableViewDefinition } from "./table-view/tableViewDefinition";
import { verticalGroupDefinition } from "./vertical-group/verticalGroupDefinition";



const elemTypeDefs: TpElemTypeDef[] = [
    verticalGroupDefinition,
    horizontalGroupDefinition,
    tabberGroupDefinition,
    staticTextDefinition,
    actionButtonDefinition,
    tableViewDefinition,
    canvas2DDefinition,
    canvasVolumeDefinition,
    categoricalFacetDefinition,
    numStatSummaryDefinition,
];

export const elemTypeDefsMap: { [id: string]: TpElemTypeDef } = {};
for (const elemType of elemTypeDefs) elemTypeDefsMap[elemType.id] = elemType;

export function getElemTypeDef(typeId: string): TpElemTypeDef {
    const elemTypeDef = elemTypeDefsMap[typeId];
    if (!elemTypeDef) throw createConfigError(`Invalid element type: ${typeId}`);
    return elemTypeDef;
}

export function getElemTypeDefList() { return elemTypeDefs}

export function RenderElement(resourceRenderCtx: TpResourceRenderContext, elemDef: any, sizingContext: TpSizingContext) {
    const ElemTypeDef = elemTypeDefsMap[elemDef.type];
    if (!ElemTypeDef) throw createConfigError(`Invalid element type: ${elemDef.type}`);

    if (ElemTypeDef.elementClass == ELEMTYPE_CLASSES.BASIC) {
        return (
            <ElemTypeDef.renderComponent
                resourceRenderCtx={resourceRenderCtx}
                elemDef={elemDef}
                sizingContext={sizingContext}
            />
        )
    }
    if (ElemTypeDef.elementClass == ELEMTYPE_CLASSES.DATA_SINGLE_LAYER) {
        return (
            <DataWidget
                resourceRenderCtx={resourceRenderCtx}
                elemDef={elemDef}
                sizingContext={sizingContext}
            />
        )
    }

    if (ElemTypeDef.elementClass == ELEMTYPE_CLASSES.DATA_MULTI_LAYER) {
        return (
            <DataWidget
                resourceRenderCtx={resourceRenderCtx}
                elemDef={elemDef}
                sizingContext={sizingContext}
            />
        )
    }

}