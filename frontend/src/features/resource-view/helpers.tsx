import { TpResourceInfo, TpResourceRenderTemplate } from "../../data/interfaces";
import { TpActiveResourcesStorage } from "../../data/usage/useActiveResourcesStorage";
import { promptCreateWidget } from "./data-widget/create-widget/PromptCreateWidget";
import { parseSizeInfoString } from "./element-types/helpers/elemSizeInfo";
import { ELEMTYPES, TpResourceRenderContext } from "./element-types/interface";


export function addWidget(activeResourcesStorage: TpActiveResourcesStorage, resourceInfo: TpResourceInfo, widgetInfo: any) {
    let existingGroup: any = null;
    const rootElement = resourceInfo.renderTemplate!.rootElement;
    if (rootElement.elements.length > 0) {
        const lastChild = rootElement.elements[rootElement.elements.length - 1];
        if (lastChild.type == ELEMTYPES.HORIZONTAL_GROUP) {
            let totalPercentage = 0;
            for (const existingChild of lastChild.elements) {
                const sizeInfo = parseSizeInfoString(existingChild.size.width);
                if (sizeInfo.isPercentage) totalPercentage += sizeInfo.value;
            }
            if (totalPercentage < 75) //  We have room available => add it to the current last row
                existingGroup = lastChild; // we have an existing row to add it to
        }
    }

    let theChartDef = widgetInfo.elemDef;
    theChartDef.size.width = '50%';

    if (!existingGroup) { // we create a new row on the root element to add it to
        const wrapperElem = {
            type: ELEMTYPES.HORIZONTAL_GROUP,
            elements: [theChartDef],
            size: {
                width: '100%',
            },
            settings: {},
        }
        activeResourcesStorage.addChildElement(
            resourceInfo.uri,
            rootElement.elemTrStateId,
            wrapperElem,
        );
    } else {
        activeResourcesStorage.addChildElement(
            resourceInfo.uri,
            existingGroup.elemTrStateId,
            theChartDef,
        );
    }

}

export function createChartInteractive(ctx: TpResourceRenderContext, activeResourcesStorage: TpActiveResourcesStorage, onCreated: () => void) {

    promptCreateWidget(ctx)
        .then((widgetInfo: any) => {
            addWidget(activeResourcesStorage, ctx.resourceInfo, widgetInfo);
            onCreated();
        })
        .catch(() => { });

}


export interface TpAnimationInfo {
    elemTrStateId: string;
    syncGroupVolume: string;
}

export function collectVolumeAnimationInfo(renderTemplate: TpResourceRenderTemplate): TpAnimationInfo[] {

    const animInfoList: TpAnimationInfo[] = [];

    function _collect(elem: any) {
        if (elem.elements) {
            for (const subElem of elem.elements)
                _collect(subElem);
        }
        if (elem.type == 'canvasVolume') {
            const elemTrStateId = elem.elemTrStateId;;
            let syncGroupVolume = ''
            let animate = true;
            if (elem.settings) {
                syncGroupVolume = elem.settings.syncGroupVolume || "";
                if (elem.settings.animate === false) animate = false;
            }
            animInfoList.push({
                elemTrStateId,
                syncGroupVolume,
            })
        }
    }

    _collect(renderTemplate.rootElement);
    return animInfoList;
}