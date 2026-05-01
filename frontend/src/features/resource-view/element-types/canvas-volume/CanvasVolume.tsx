import { useEffect, useRef, useState } from "react";
import { CanvasGPUR } from "../../../../util/render-gpu/CanvasGPU";
import { TpGPURContext } from "../../../../util/render-gpu/interfaces";
import Loader from "../../../../util/components/loader/Loader";
import { MESSAGE_OPENEDROWS_UPDATE, SYNCGROUP_TYPES, TpElemInfo, TpResourceRenderContext } from "../interface";
import { useResizedCompRedraw } from "../../../../util/resizeObserverHook";
import { updateGPURData } from "../../../../util/render-gpu/renderGPU";
import { useMouseDragObserver, useMouseScrollwheelObserver } from "../../../../util/mouseHandlingHooks";
import { TpPoint2D } from "../../../../util/geometry/point2D";
import { _addFilter } from "../../../../data/store/loadedTablesSlice";
import { useTablesStorage } from "../../../../data/usage/useTablesStorage";
import { TpDataWidgetCtx } from "../../data-widget/interface";
import { useDebounceInComponent } from "../../../../util/misc";
import { useMessageListener } from "../../../../util/messageBus";
import { updataResourceElemTrStateSyncGroups as updateResourceElemTrStateSyncGroups } from "../../../../data/elemTrState";
import { canvasVolumeCollectLegends, canvasVolumeHandleSlicingNotification, canvasVolumeUpdateResolutions, canvasVolumeUpdateViewPortDisplayDimensions, createCanvasVolumeInitialTransientData, getCanvasViewportVolume, renderCanvasVolume, renderCanvasVolumeOverlay, TpCanvasVolumeTransientData } from "./rendering";
import { createRenderData } from "./createRenderData";
import { canvasVolumeHandleMouseDown, canvasVolumeHandleMouseDrag, canvasVolumeHandleMouseUp, canvasVolumeMouseClickHandler, canvasVolumeMouseMoveHandler, canvasVolumeMouseScrollwheelHandler, canvasVolumeRemoveHoverInfo } from "./mouseHandlers";
import { MESSAGE_CANVASVOLUME_REDRAW, MESSAGE_CANVASVOLUME_SYNC_POV, MESSAGE_VOL_POV_ANIM_INCR } from "./interface";
import { MESSAGE_UPDATE_SLICE } from "../canvas-2d/interface";
import { createMarginsCss, getElemSyncGroupsFromDef, getVisualSetup } from "../helpers/helpers";
import { canvasVolumeDefinition } from "./canvasVolumeDefinition";
import { canvasDownloadBitmap } from "../canvas-2d/rendering";
import { copyViewportViewSettings } from "../../../../util/geometry/viewportVolume";


function surpressCtrlPressContextMenu(event: React.MouseEvent) {
    if (event.ctrlKey) {
        // Suppress the context menu triggered by Ctrl+Click on macOS
        event.preventDefault();
    }
};


interface TpProps {
    resourceRenderCtx: TpResourceRenderContext,
    elemDef: any,
    dataWidgetCtx: TpDataWidgetCtx;
}


export function CanvasVolume(props: TpProps) {
    const { resourceRenderCtx, elemDef } = props;

    const elemInfo: TpElemInfo = {
        resourceUri: resourceRenderCtx.resourceInfo.uri,
        elemTrStateId: elemDef.elemTrStateId,
        syncGroups: getElemSyncGroupsFromDef(elemDef),
    }
    const viewportVolume = getCanvasViewportVolume(elemInfo);

    updateResourceElemTrStateSyncGroups(elemInfo); // We call this here because sync groups may change during the chart life cycle, when the user edits the chart config

    const canvasBaseRef = useRef<HTMLCanvasElement>(null);
    const canvasOverlayRef = useRef<HTMLCanvasElement>(null);

    const trDataRef = useRef<TpCanvasVolumeTransientData>(createCanvasVolumeInitialTransientData(elemInfo, resourceRenderCtx, viewportVolume));
    const trData = trDataRef.current;
    trData.resourceRenderCtx = resourceRenderCtx;
    trData.loadedTables = useTablesStorage(); // NOTE: calling useTablesStorage is needed to refesh on updates of filtering
    trData.canvasBase = canvasBaseRef.current;
    trData.canvasOverlay = canvasOverlayRef.current;
    trData.viewportVolume = viewportVolume;
    trData.elemInfo = elemInfo;

    trData.renderData = createRenderData(resourceRenderCtx, elemDef, elemInfo, trData.viewportVolume);
    const [hasData, setHasData] = useState(trData.renderData!.isDataComplete);
    if (hasData != trData.renderData!.isDataComplete)
        setTimeout(() => { setHasData(trData.renderData!.isDataComplete) }, 25); // this will trigger a component rerender when the data is complete

    canvasVolumeUpdateViewPortDisplayDimensions(trData);

    canvasVolumeCollectLegends(trData);

    if (trData.gpuContext) updateGPURData(trData.gpuContext, trData.renderData!.gpurData); // We make sure the latest data is set for gpu rendering

    function setShortcutButtons() {
        props.dataWidgetCtx.setDataWidgetShortcutButtons([
            { icon: 'draw-polygon', active: !trData.isZooming, handle: () => { trData.isZooming = false; setShortcutButtons() } },
            { icon: 'magnifying-glass', active: trData.isZooming, handle: () => { trData.isZooming = true; setShortcutButtons() } },
        ])
    }

    useEffect(() => { // We instruct the parent component what "action buttons" to display
        if (props.dataWidgetCtx) {
            props.dataWidgetCtx.setDataWidgetActions({
                downloadBitmap: () => { canvasDownloadBitmap(trData, false) },
                setThumbnail: () => { canvasDownloadBitmap(trData, true) },
            });
            setShortcutButtons();
        }
    }, [
        !!props.dataWidgetCtx, // NOTE: this ensures that this setup action is executed a single time when we have a dataWidgetCtx
    ]);


    useMessageListener(MESSAGE_OPENEDROWS_UPDATE, (messageType: string, messageBody: any) => {
        // Here we respond to the "opening" of a row by clicking on it. This causes the row to be pointed at in the drawing
        renderCanvasVolumeOverlay(trData);
    });

    useMessageListener(MESSAGE_CANVASVOLUME_REDRAW, (messageType: string, messageBody: any) => {
        // Here we respond to a general redraw request
        if (messageBody.elemTrStateId == elemInfo.elemTrStateId) {
            if (!messageBody.debounced) renderCanvasAll();
            else debouncedRenderCanvasAll();
        }
    });

    useMessageListener(MESSAGE_CANVASVOLUME_SYNC_POV, (messageType: string, messageBody: any) => {
        // Here we respond to a request for syncing this widget's POV with another widget
        if (messageBody.syncGroup == trData.elemInfo.syncGroups[SYNCGROUP_TYPES.VOLUME]) {
            if (messageBody.sourceElemTrStateId != trData.elemInfo.elemTrStateId) {
                copyViewportViewSettings(messageBody.viewportVolume, viewportVolume);
                renderCanvasAll();
            }
        }
    });

    useMessageListener(MESSAGE_UPDATE_SLICE, (messageType: string, messageBody: any) => {
        // Here we respond to a change in slicing of a property
        if (messageBody.elemTrStateId == elemInfo.elemTrStateId) {
            canvasVolumeHandleSlicingNotification(trData);
            if (!messageBody.debounced) renderCanvasAll();
            else debouncedRenderCanvasAll()
        }
    });

    useMessageListener(MESSAGE_VOL_POV_ANIM_INCR, (messageType: string, messageBody: any) => {
        // Here we respond to a request for applying to automatic animation of volume plots
        viewportVolume.angleAzim += messageBody.incr;
        renderCanvasAll();
    });

    function renderCanvasAll() { renderCanvasVolume(trData); }
    const debouncedRenderCanvasAll = useDebounceInComponent(renderCanvasAll, 75);

    useResizedCompRedraw(canvasBaseRef, 100, false); // make sure that the component is redrawn when resized

    useEffect(() => {
        // This effect makes sure that the canvasses get (re)drawn each time the component redraws
        canvasVolumeUpdateResolutions(trData);
        debouncedRenderCanvasAll();
    });

    useMouseScrollwheelObserver(canvasOverlayRef, (ev) => { canvasVolumeMouseScrollwheelHandler(trData, ev) }, false);

    const mouseDragObserver = useMouseDragObserver({
        handleMouseDown: (e: any, pos: TpPoint2D) => canvasVolumeHandleMouseDown(trData, e, pos),
        handleMouseMove: (e: any, pos: TpPoint2D, diff: TpPoint2D) => canvasVolumeHandleMouseDrag(trData, e, pos, diff),
        handleMouseUp: (e: any) => canvasVolumeHandleMouseUp(trData, e),
    })

    let canvasGPUR: any = null;
    if (hasData && (trData.renderData!.gpurData.layers.length > 0)) {
        canvasGPUR = <CanvasGPUR
            renderData={trData.renderData!.gpurData}
            pixelRatio={trData.viewportVolume.pixelRatio}
            registerContext={(ctx: TpGPURContext) => { trData.gpuContext = ctx; }}
        />
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {!hasData && <div><Loader paddingTop={30} /></div>}
            <canvas
                id="baseCanvas"
                ref={canvasBaseRef}
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            />
            <div style={createMarginsCss(trData.renderData!.centralViewportMargins)}>
                {canvasGPUR}
            </div>
            <canvas
                id="overlay"
                ref={canvasOverlayRef}
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                onPointerDownCapture={mouseDragObserver}
                onMouseMove={(ev: any) => canvasVolumeMouseMoveHandler(trData, ev, props.resourceRenderCtx.volumeAnimating)}
                onMouseLeave={() => { canvasVolumeRemoveHoverInfo(trData) }}
                onClick={(ev) => { canvasVolumeMouseClickHandler(trData, ev) }}
                onContextMenu={surpressCtrlPressContextMenu}
            />
        </div>)
}