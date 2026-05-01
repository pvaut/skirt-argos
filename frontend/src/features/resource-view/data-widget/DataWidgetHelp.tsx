import { createInternalError } from "../../../util/errors";
import { getMLWidgetLayerTypeDef } from "../element-types/canvas-2d/canvas2DDefinition";
import { getElemTypeDef } from "../element-types/elementsFactory";
import { getVisualSetup } from "../element-types/helpers/helpers";
import { ELEMTYPE_CLASSES, TpElemTypeDefDataWidgetML, TpElemTypeDefDataWidgetSL, TpResourceRenderContext } from "../element-types/interface";
import { TpDataWidgetCtx } from "./interface";

import { canvasVolumeDefinition } from "../element-types/canvas-volume/canvasVolumeDefinition";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface TpProps {
    resourceRenderCtx: TpResourceRenderContext;
    elemDef: any;
    dataWidgetCtx: TpDataWidgetCtx;
}

export function DataWidgetHelp(props: TpProps) {

    const elemDef = props.elemDef;
    const resourceRenderCtx = props.resourceRenderCtx;
    const elemTypeDefBase = getElemTypeDef(elemDef.type);

    if (!elemDef.elemTrStateId) throw createInternalError('Element is missing elemTrStateId');

    let contentDataSources: any = null;
    let thingsTodoHelp: any[] = [];

    if (elemTypeDefBase.elementClass == ELEMTYPE_CLASSES.DATA_SINGLE_LAYER) {
        const elemTypeDef = getElemTypeDef(elemDef.type) as TpElemTypeDefDataWidgetSL;
        const visualSetup = getVisualSetup(resourceRenderCtx, elemTypeDef.channels, elemTypeDef.configSettings, elemDef, true);
        if (visualSetup) {
            contentDataSources = elemTypeDef.channels
                .filter(channel => visualSetup.channelEncodings[channel.id])
                .map((channel) => {
                    const channelEncoding = visualSetup.channelEncodings[channel.id];
                    return (
                        <p key={channel.id}>
                            <span style={{ textDecoration: 'underline' }}>{channel.name}</span>
                            : <span><i>{visualSetup.tableData.name} → {channelEncoding.name}</i></span>
                            {channelEncoding.description && (<span> ({channelEncoding.description})</span>)}
                        </p>
                    )
                });
            thingsTodoHelp = elemTypeDef.getThingsTodoHelp(visualSetup);
        }
    }

    if (elemTypeDefBase.elementClass == ELEMTYPE_CLASSES.DATA_MULTI_LAYER) {

    const globalVisualSetup = getVisualSetup(resourceRenderCtx, [], canvasVolumeDefinition.configSettings, elemDef);
    if (globalVisualSetup?.configSettings.animate)
        thingsTodoHelp = [<span>Click on the <FontAwesomeIcon icon="pause" /> / <FontAwesomeIcon icon="play" /> button to stop or resume the automatic rotation of the viewpoint</span>, ...thingsTodoHelp];

        const elemTypeDef = getElemTypeDef(elemDef.type) as TpElemTypeDefDataWidgetML;
        let layerIdx = 0;
        contentDataSources = elemDef.layers.map((layer: any) => {
            const layerTypeDef = getMLWidgetLayerTypeDef(elemTypeDef, layer.type);
            const visualSetup = getVisualSetup(resourceRenderCtx, layerTypeDef.channels, layerTypeDef.configSettings, layer, true);
            if (visualSetup) {
                thingsTodoHelp = [...thingsTodoHelp, ...layerTypeDef.getThingsTodoHelp(visualSetup)];
                return (
                    <div key={`layer_${layerIdx}`}>
                        {layerTypeDef.channels
                            .filter(channel => visualSetup.channelEncodings[channel.id])
                            .map((channel) => {
                                const channelEncoding = visualSetup.channelEncodings[channel.id];
                                return (
                                    <p key={channel.id}>
                                        <span style={{ textDecoration: 'underline' }}>{channel.name}</span>
                                        : <span><i>{visualSetup.tableData.name} → {channelEncoding.name}</i></span>
                                        {channelEncoding.description && (<span> ({channelEncoding.description})</span>)}
                                    </p>
                                )
                            })}
                    </div>
                )
            } else
                return null;
        });
        layerIdx++;
    }

    return (
        <div style={{ maxWidth: "400px", fontSize: "90%" }}>
            {contentDataSources.length > 0 && (
                <>
                    <p><b>Data sources:</b></p>
                    {contentDataSources}
                </>
            )}
            {thingsTodoHelp && (thingsTodoHelp.length > 0) && (<>
                <p><b>What can I do here?</b></p>
                <ul style={{paddingInlineStart:"1.5em"}}>
                    {thingsTodoHelp.map((item, idx) => (
                        <li key={`li_${idx}`} style={{padding: "2px 0"}}>
                            {item}
                            </li>
                        ))}
                </ul>
            </>)}
        </div>
    )
}