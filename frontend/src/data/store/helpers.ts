import { createConfigError } from "../../util/errors";
import { guid } from "../../util/misc";
import { TpResourceRenderTemplate } from "../interfaces";
import { TpActiveResourcesData } from "./activeResourcesSlice";


export function templateElemAttachElemTrStateIds(elem: any, parentElemTrStateId: string) {
    if (!elem.elemTrStateId)
        elem.elemTrStateId = guid();
    elem.parentElemTrStateId = parentElemTrStateId;
    if (elem.elements) {
        for (const childElem of elem.elements)
            templateElemAttachElemTrStateIds(childElem, elem.elemTrStateId);
    }
}


export function renderTemplateAttachElemTrStateIds(renderTemplate: TpResourceRenderTemplate) {
    // During dashboard life cycle, each element gets a unique ID called elemTrStateId
    // Attaches a unique elemTrStateId to each element in the template
    // Fot an active dashboard this identifier is used to track information about the element that lives outside the store
    // Example: zoom & pan position of a plot
    templateElemAttachElemTrStateIds(renderTemplate.rootElement, '');
}


export function findRenderElementByTrStateId(state: TpActiveResourcesData, uri: string, elemTrStateId: string): any {
    const resource = state.activeResources.find(res => res.uri == uri);
    if (!resource) throw createConfigError(`Resource not found: ${uri}`);
    if (!resource.renderTemplate) throw createConfigError(`Resource does not have render template: ${uri}`);

    let renderElement: any = null;

    function findRecursive(elem: any) {
        if (elem.elemTrStateId == elemTrStateId) {
            if (renderElement) throw createConfigError(`Duplicate render element TrStateId: ${uri} ${elemTrStateId}`);
            renderElement = elem;
        }
        if (elem.elements)
            for (const childElem of elem.elements)
                findRecursive(childElem);
    }

    findRecursive(resource.renderTemplate.rootElement);
    if (!renderElement) throw createConfigError(`Could not find render element via TrStateId: ${uri} ${elemTrStateId}`);
    return renderElement;
}
