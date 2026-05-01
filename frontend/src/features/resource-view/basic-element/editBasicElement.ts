import { TpActiveResourcesStorage } from "../../../data/usage/useActiveResourcesStorage";
import { executeForm, TpForm, TpFormField } from "../../../util/components/form/Form";
import { createFormString } from "../../../util/components/form/formFieldTypes";
import { createInternalError } from "../../../util/errors";
import { promptCreateWidget } from "../data-widget/create-widget/PromptCreateWidget";
import { CONFIG_SETTING_TYPES } from "../element-types/helpers/configSettingTypes";
import { parseSizeInfoString } from "../element-types/helpers/elemSizeInfo";
import { ELEMTYPE_CLASSES, ELEMTYPES, TpDataWidgetConfigSettingDef, TpElemTypeDef, TpResourceRenderContext } from "../element-types/interface";


const validateSizeString = (ctx: any, value: any) => {
    if (!value) return;
    parseSizeInfoString(value);
}

function isFunction(arg: any): boolean {
    return (arg) && (typeof arg === 'function');
}


function elemSetting2FormField(setting: TpDataWidgetConfigSettingDef, resourceRenderCtx: TpResourceRenderContext, elemDef: any): TpFormField {
    const id = `settings.${setting.id}`;

    if (isFunction(setting.generator)) {
        const elem = setting.generator!(resourceRenderCtx, elemDef);
        elem.id = id;
        return elem;
    }
    if (setting.settingType.configSettingType == CONFIG_SETTING_TYPES.STRING) {
        return createFormString(id, setting.name,
            (elemDef.settings && elemDef.settings[setting.id]) ?? setting.settingType.defaultVal, setting.settingType.lineCount);
    }
    throw createInternalError(`Invalid setting type`);
}


export function promtWidgetSettings(activeResourcesStorage: TpActiveResourcesStorage, resourceRenderCtx: TpResourceRenderContext,
    elemTypeDef: TpElemTypeDef, elemDef: any) {
    const fieldSizeWidth = createFormString('size.width', "Width", elemDef.size?.width, 1);
    fieldSizeWidth.validator = validateSizeString;
    const fieldSizeHeight = createFormString('size.height', "Height", elemDef.size?.height, 1);
    fieldSizeHeight.validator = validateSizeString;
    const form: TpForm = {
        name: 'Settings',
        fields: [
            fieldSizeWidth,
            fieldSizeHeight,
        ],
        buttons: [],
    }
    if (elemTypeDef.elementClass == ELEMTYPE_CLASSES.BASIC) { // NOTE: data widget specific settings are handled in a special menu, available when not in edit mode
        for (const setting of elemTypeDef.configSettings) {
            form.fields.push(elemSetting2FormField(setting, resourceRenderCtx, elemDef));
        }
        if (elemTypeDef.createCustomSettingElement) {
            form.customFormElement = elemTypeDef.createCustomSettingElement(resourceRenderCtx);
        }
    }
    executeForm(form)
        .then(({ data }: any) => {
            const settings: any = { ...elemDef.settings };
            if (elemTypeDef.elementClass == ELEMTYPE_CLASSES.BASIC) {
                for (const setting of elemTypeDef.configSettings) {
                    settings[setting.id] = data[`settings.${setting.id}`];
                }
            }
            activeResourcesStorage.updateBasicWidgetSettings(
                resourceRenderCtx.resourceInfo.uri,
                elemDef.elemTrStateId, {
                width: data['size.width'],
                height: data['size.height'],
                settings,
            });
        })
        .catch(() => { });
}


export function promptAddChildElement(activeResourcesStorage: TpActiveResourcesStorage, resourceRenderCtx: TpResourceRenderContext,
    elemTypeDef: TpElemTypeDef, elemDef: any) {
    const form: TpForm = {
        name: 'Add child widget',
        fields: [],
        buttons: [
            { id: '__chart__', name: "Chart" },
            { id: ELEMTYPES.HORIZONTAL_GROUP, name: "Horizontal group" },
            { id: ELEMTYPES.VERTICAL_GROUP, name: "Vertical group" },
            { id: ELEMTYPES.TAB_GROUP, name: "Tab group" },
            { id: ELEMTYPES.STATIC_TEXT, name: "Static text" },
            { id: ELEMTYPES.ACTION_BUTTON, name: "Action button" },
        ],
    }
    executeForm(form)
        .then(({ data, buttonId }: any) => {

            if (buttonId == '__chart__') {
                promptCreateWidget(resourceRenderCtx).then((widgetInfo: any) => {
                    let theDef = widgetInfo.elemDef;
                    // @todo: add smartness by automatically creating wrapper groups that allow extension
                    // but make sure that elemTrStateId & parentElemTrStateId are added properly
                    activeResourcesStorage.addChildElement(
                        resourceRenderCtx.resourceInfo.uri,
                        elemDef.elemTrStateId,
                        theDef,
                    );
                });
                return;
            }

            if (buttonId == ELEMTYPES.HORIZONTAL_GROUP) {
                activeResourcesStorage.addChildElement(resourceRenderCtx.resourceInfo.uri,
                    elemDef.elemTrStateId,
                    {
                        type: buttonId,
                        elements: [],
                        size: {
                            width: '100%',
                        },
                        settings: {},
                    }
                );
                return;
            }

            if (buttonId == ELEMTYPES.VERTICAL_GROUP) {
                activeResourcesStorage.addChildElement(resourceRenderCtx.resourceInfo.uri,
                    elemDef.elemTrStateId,
                    {
                        type: buttonId,
                        elements: [],
                        size: {
                            width: '100%',
                        },
                        settings: {},
                    }
                );
                return;
            }

            if (buttonId == ELEMTYPES.TAB_GROUP) {
                activeResourcesStorage.addChildElement(resourceRenderCtx.resourceInfo.uri,
                    elemDef.elemTrStateId,
                    {
                        type: buttonId,
                        elements: [],
                        size: {
                            width: '100%',
                        },
                        settings: {},
                    }
                );
                return;
            }

            if (buttonId == ELEMTYPES.STATIC_TEXT) {
                activeResourcesStorage.addChildElement(resourceRenderCtx.resourceInfo.uri,
                    elemDef.elemTrStateId,
                    {
                        type: buttonId,
                        content: "Static text content",
                        size: {
                            width: '100%',
                        },
                        settings: {},
                    }
                );
                return;
            }
            if (buttonId == ELEMTYPES.ACTION_BUTTON) {
                activeResourcesStorage.addChildElement(resourceRenderCtx.resourceInfo.uri,
                    elemDef.elemTrStateId,
                    {
                        type: buttonId,
                        // content: "Static text content",
                        size: {
                            width: '25%',
                        },
                        settings: {},
                    }
                );
                return;
            }

            throw createInternalError(`Unable to handle ${buttonId}`);
        })
        .catch(() => { })

}
