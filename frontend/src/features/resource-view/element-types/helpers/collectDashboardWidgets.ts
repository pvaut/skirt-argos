import { TpResourceRenderTemplate } from "../../../../data/interfaces";
import { getElemTypeDef } from "../elementsFactory";
import { ELEMTYPE_CLASSES, TpDashboardWidgetDefs } from "../interface";


export function collectDashboardWidgets(renderTemplate?: TpResourceRenderTemplate): TpDashboardWidgetDefs {

    const dashboardWidgets: TpDashboardWidgetDefs = {
        dataWidgetsML: [],
        dataWidgetsSL: [],
    };

    if (!renderTemplate) return dashboardWidgets;

    function accumulateRecursive(elemDef: any) {
        const elemType = getElemTypeDef(elemDef.type);
        if (elemType.elementClass == ELEMTYPE_CLASSES.DATA_MULTI_LAYER)
            dashboardWidgets.dataWidgetsML.push(elemDef);
        if (elemType.elementClass == ELEMTYPE_CLASSES.DATA_SINGLE_LAYER)
            dashboardWidgets.dataWidgetsSL.push(elemDef);
        if (elemDef.elements) {
            for (const child of elemDef.elements)
                accumulateRecursive(child);
        }
    }

    accumulateRecursive(renderTemplate.rootElement);
    return dashboardWidgets;
}