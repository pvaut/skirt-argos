import { isCategoricalDataType, isNumericalDataType } from "../../../../data/tables/interface";
import { getTableColumn } from "../../../../data/tables/table";
import { TpActiveResourcesStorage, useActiveResourcesStorage } from "../../../../data/usage/useActiveResourcesStorage";
import { PopupPortalElemMenu } from "../../../../util/components/popup-portal-elem-menu/PopupPortalElemMenu";
import { createInternalError } from "../../../../util/errors";
import { evalMathExpr, TpMathExprContext } from "../../../../util/expressions/mathExpression";
import { getMLWidgetLayerTypeDef } from "../../element-types/canvas-2d/canvas2DDefinition";
import { getElemTypeDef } from "../../element-types/elementsFactory";
import { getVisualSetup, TpVisualSetup } from "../../element-types/helpers/helpers";
import { TpDataWidgetChannelDef, TpDataWidgetConfigSettingDef, TpElemTypeDefDataWidgetML, TpElemTypeDefDataWidgetSL, TpResourceRenderContext, TpSectionDef, ELEMTYPE_CLASSES } from "../../element-types/interface";
import { TpDataWidgetActions } from "../interface";
import { ChannelPicker } from "./ChannelPicker";
import { ConfigSettingPicker } from "./ConfigSettingPicker";

import styles from './Menu.module.scss';

interface TpProps {
    resourceRenderCtx: TpResourceRenderContext;
    widgetElem: HTMLElement;
    elemDef: any;
    close: () => void;
    dataWidgetActions: TpDataWidgetActions;
}


function createVisibilityExpressionEvaluatorCtx(visualSetup: TpVisualSetup, channels: TpDataWidgetChannelDef[], configSettings: TpDataWidgetConfigSettingDef[]): TpMathExprContext {
    const variables: { [name: string]: any } = [];
    for (const channel of channels) {
        if (visualSetup.channelEncodings[channel.id])
            variables[`$${channel.id}`] = visualSetup.channelEncodings[channel.id].id;
        else
            variables[`$${channel.id}`] = null;
    }
    for (const setting of configSettings) {
        if (visualSetup.configSettings[setting.id])
            variables[`$${setting.id}`] = visualSetup.configSettings[setting.id];
        else
            variables[`$${setting.id}`] = null;
    }

    const functions: { [name: string]: (args: any[]) => any } = {};

    functions['isNumericalProperty'] = (args: any) => {
        if (args.length != 1) throw createInternalError("Invalid number of argyments");
        const propId = args[0];
        if (!propId) return false;
        return isNumericalDataType(getTableColumn(visualSetup.tableData, propId).dataType);
    }

    functions['isCategoricalProperty'] = (args: any) => {
        if (args.length != 1) throw createInternalError("Invalid number of argyments");
        const propId = args[0];
        if (!propId) return false;
        return isCategoricalDataType(getTableColumn(visualSetup.tableData, propId).dataType);
    }

    return {
        expression: '1', // a default expression, should be replaced
        variables,
        functions,
    }
}


function createRenderedSections(
    activeResourcesStorage: TpActiveResourcesStorage,
    elemDef: any,
    resourceRenderCtx: TpResourceRenderContext,
    visualSetup: TpVisualSetup,
    layerIdx: number | null, // null= for widgets without layers
    sections: TpSectionDef[],
    channels: TpDataWidgetChannelDef[],
    configSettings: TpDataWidgetConfigSettingDef[]
) {
    const exprCtx = createVisibilityExpressionEvaluatorCtx(visualSetup, channels, configSettings);

    const renderedSections: any[] = [];
    for (const section of sections) {

        const renderedSection = (
            <div key={section.id}>
                <div className={styles.sectionTitle}>{section.name}</div>
                {channels.filter(channel => channel.sectionId == section.id).map((channel) => {
                    return (
                        <div key={`channel_${channel.id}`} className={styles.sectionItem}>
                            <div className={styles.label}>{channel.name}</div>
                            <ChannelPicker
                                tableData={visualSetup.tableData}
                                layerIdx={layerIdx}
                                channelDef={channel}
                                visualSetup={visualSetup}
                                updateChannelBinding={(theLayerIdx: number | null, theChannelId: string, newBindingColId: string) => {
                                    activeResourcesStorage.updateChartLayerChannelBinding(
                                        resourceRenderCtx.resourceInfo.uri,
                                        elemDef.elemTrStateId,
                                        theLayerIdx,
                                        theChannelId,
                                        newBindingColId
                                    );
                                }}
                            />
                        </div>
                    );
                })}
                {configSettings.filter(setting => setting.sectionId == section.id).map((setting) => {
                    if (setting.visibleIf) {
                        exprCtx.expression = setting.visibleIf;
                        if (!evalMathExpr(exprCtx))
                            return null;
                    }
                    return (
                        <div key={`setting_${setting.id}`} className={styles.sectionItem}>
                            <div className={styles.label}>{setting.name}</div>
                            <ConfigSettingPicker
                                tableData={visualSetup.tableData}
                                layerIdx={layerIdx}
                                configSettingDef={setting}
                                visualSetup={visualSetup}
                                updateConfigSetting={(theLayerIdx: number | null, theSettingId: string, newValue: any) => {
                                    activeResourcesStorage.updateChartLayerConfigSetting(
                                        resourceRenderCtx.resourceInfo.uri,
                                        elemDef.elemTrStateId,
                                        theLayerIdx,
                                        theSettingId,
                                        newValue
                                    );
                                }}
                            />
                        </div>
                    );
                })}
            </div>
        )
        renderedSections.push(renderedSection);
    }
    return renderedSections;
}


export function Menu(props: TpProps) {

    const elemDef = props.elemDef;
    const resourceRenderCtx = props.resourceRenderCtx;
    const elemTypeDefBase = getElemTypeDef(elemDef.type);
    const activeResourcesStorage = useActiveResourcesStorage();

    if (!elemDef.elemTrStateId) throw createInternalError('Element is missing elemTrStateId');

    let content: any = null;

    if (elemTypeDefBase.elementClass == ELEMTYPE_CLASSES.DATA_SINGLE_LAYER) {
        const elemTypeDef = getElemTypeDef(elemDef.type) as TpElemTypeDefDataWidgetSL;
        const visualSetup = getVisualSetup(resourceRenderCtx, elemTypeDef.channels, elemTypeDef.configSettings, elemDef, true);
        if (visualSetup) {
            const renderedSections = createRenderedSections(
                activeResourcesStorage,
                elemDef,
                resourceRenderCtx,
                visualSetup,
                null,
                elemTypeDef.sections,
                elemTypeDef.channels,
                elemTypeDef.configSettings,
            );
            content = (<div>{renderedSections}</div>);
        }
    }

    if (elemTypeDefBase.elementClass == ELEMTYPE_CLASSES.DATA_MULTI_LAYER) {
        const elemTypeDef = getElemTypeDef(elemDef.type) as TpElemTypeDefDataWidgetML;
        const renderedLayers: any[] = [];


        // Render all bindings & settings for each layer
        let layerIdx = 0;
        for (const layer of elemDef.layers) {
            const layerTypeDef = getMLWidgetLayerTypeDef(elemTypeDef, layer.type);
            const visualSetup = getVisualSetup(resourceRenderCtx, layerTypeDef.channels, layerTypeDef.configSettings, layer, true);
            if (visualSetup) {
                renderedLayers.push(<div key={`title`} className={styles.tableTitle}>{visualSetup.tableData.name}</div>)
                const renderedSections = createRenderedSections(
                    activeResourcesStorage,
                    elemDef,
                    resourceRenderCtx,
                    visualSetup,
                    layerIdx,
                    layerTypeDef.sections,
                    layerTypeDef.channels,
                    layerTypeDef.configSettings,
                );
                renderedLayers.push(<div key={`layer_${layerIdx}`}>{renderedSections}</div>)
            }
            layerIdx++;
        }

        // We render the global settings of the widget, no attached to any layer
        const globalVisualSetup = getVisualSetup(resourceRenderCtx, [], elemTypeDef.configSettings, elemDef);
        if (globalVisualSetup) {
            renderedLayers.push(<div className={styles.sectionTitle} key='canvas'>Canvas</div>)
            for (const setting of elemTypeDef.configSettings) {
                const rendered = (
                    <div key={`setting_${setting.id}`} className={styles.sectionItem}>
                        <div className={styles.label}>{setting.name}</div>
                        <ConfigSettingPicker
                            tableData={globalVisualSetup.tableData} // note: we dont actually need a table here
                            layerIdx={null}
                            configSettingDef={setting}
                            visualSetup={globalVisualSetup}
                            updateConfigSetting={(theLayerIdx: number | null, theSettingId: string, newValue: any) => {
                                activeResourcesStorage.updateChartLayerConfigSetting(
                                    resourceRenderCtx.resourceInfo.uri,
                                    elemDef.elemTrStateId,
                                    theLayerIdx,
                                    theSettingId,
                                    newValue
                                );
                            }}
                        />
                    </div>
                );
                renderedLayers.push(rendered);
            }
        }


        content = <div>{renderedLayers}</div>
    }

    return (
        <PopupPortalElemMenu
            targetElement={props.widgetElem}
            width={300}
            close={props.close}
        >
            <div className={styles.body}>
                {props.dataWidgetActions?.downloadBitmap && (
                    <button onClick={()=> {props.dataWidgetActions.downloadBitmap()}}>
                        Download
                    </button>
                )}
                {props.dataWidgetActions?.setThumbnail && (
                    <button onClick={()=> {props.dataWidgetActions.setThumbnail()}}>
                        Set as thumbnail
                    </button>
                )}
                {content}
            </div>
        </PopupPortalElemMenu >
    );
}