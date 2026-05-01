import { useEffect, useRef, useState } from "react";
import { CanvasGPUR } from "../../../../util/render-gpu/CanvasGPU";
import { TpGPURContext } from "../../../../util/render-gpu/interfaces";
import Loader from "../../../../util/components/loader/Loader";
import { MESSAGE_OPENEDROWS_UPDATE, TpElemInfo, TpResourceRenderContext } from "../interface";
import { useResizedCompRedraw } from "../../../../util/resizeObserverHook";
import { updateGPURData } from "../../../../util/render-gpu/renderGPU";
import { useMouseDragObserver, useMouseScrollwheelObserver } from "../../../../util/mouseHandlingHooks";
import { TpPoint2D } from "../../../../util/geometry/point2D";
import { _addFilter } from "../../../../data/store/loadedTablesSlice";
import { MESSAGE_CANVAS2D_REDRAW, MESSAGE_UPDATE_SLICE } from "./interface";
import { useTablesStorage } from "../../../../data/usage/useTablesStorage";
import { TpDataWidgetCtx } from "../../data-widget/interface";
import { createRenderData } from "./createRenderData";
import { useDebounceInComponent } from "../../../../util/misc";
import { useMessageListener } from "../../../../util/messageBus";
import { createCanvas2DInitialTransientData, canvasDownloadBitmap, TpCanvas2DTransientData, renderCanvas2DOverlay, renderCanvas2D, canvas2DHandleSlicingNotification, canvas2DUpdateViewPortDisplayDimensions, canvas2DUpdateResolutions, getCanvas2DCentralViewport, canvas2DCollectLegends, canvas2DRemoveHoverInfo } from "./rendering";
import { canvas2DHandleMouseDown, canvas2DHandleMouseDrag, canvas2DHandleMouseUp, canvas2DMouseClickHandler, canvas2DMouseMoveHandler, canvas2DMouseScrollwheelHandler } from "./mouseHandlers";
import { updataResourceElemTrStateSyncGroups } from "../../../../data/elemTrState";
import { createMarginsCss, getElemSyncGroupsFromDef } from "../helpers/helpers";



interface TpProps {
    resourceRenderCtx: TpResourceRenderContext,
    elemDef: any,
    dataWidgetCtx: TpDataWidgetCtx;
}


export function Canvas2D(props: TpProps) {
    // NOTE: there is currently a minor issue with how this works
    // Upon creation, the component needs to be rendered twice, because it currently depends on canvas Refs which are only available after first render.
    // This is ensured via the call to useResizedCompRedraw
    // This is not ideal. A better implementation should only demand a single component rendering upon creation,
    // an only call the canvas rendering function when the canvas refs are in place
    const { resourceRenderCtx: resourceRenderCtxProp, elemDef } = props;

    const elemInfo: TpElemInfo = {
        resourceUri: resourceRenderCtxProp.resourceInfo.uri,
        elemTrStateId: elemDef.elemTrStateId,
        syncGroups: getElemSyncGroupsFromDef(elemDef),
    }
    const centralViewport2D = getCanvas2DCentralViewport(elemInfo, elemDef.settings?.aspectRatio11);

    updataResourceElemTrStateSyncGroups(elemInfo); // We call this here because sync groups may change during the chart life cycle, when the user edits the chart config

    const canvasBaseRef = useRef<HTMLCanvasElement>(null);
    const canvasOverlayRef = useRef<HTMLCanvasElement>(null);

    const trDataRef = useRef<TpCanvas2DTransientData>(createCanvas2DInitialTransientData(elemInfo, resourceRenderCtxProp, centralViewport2D));
    const trData = trDataRef.current;
    trData.resourceRenderCtx = resourceRenderCtxProp;
    trData.loadedTables = useTablesStorage(); // NOTE: calling useTablesStorage is needed to refresh on updates of filtering
    trData.canvasBase = canvasBaseRef.current;
    trData.canvasOverlay = canvasOverlayRef.current;
    trData.centralViewport = centralViewport2D;
    trData.hideXYAxes = elemDef.settings?.hideXYAxes;

    trData.renderData = createRenderData(resourceRenderCtxProp, elemDef, elemInfo, trData.centralViewport, trData.hideXYAxes);
    const [hasData, setHasData] = useState(trData.renderData!.isDataComplete);
    if (hasData != trData.renderData!.isDataComplete)
        setTimeout(() => { setHasData(trData.renderData!.isDataComplete) }, 25); // this will trigger a component rerender when the data is complete

    canvas2DUpdateViewPortDisplayDimensions(trData);

    canvas2DCollectLegends(trData);

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
        renderCanvas2DOverlay(trData);
    });

    useMessageListener(MESSAGE_CANVAS2D_REDRAW, (messageType: string, messageBody: any) => {
        // Here we respond to a general redraw request
        if (messageBody.elemTrStateId == elemInfo.elemTrStateId) {
            if (!messageBody.debounced) renderCanvasAll();
            else debouncedRenderCanvasAll();
        }
    });

    useMessageListener(MESSAGE_UPDATE_SLICE, (messageType: string, messageBody: any) => {
        // Here we respond to a change in slicing of a property
        if (messageBody.elemTrStateId == elemInfo.elemTrStateId) {
            canvas2DHandleSlicingNotification(trData);
            if (!messageBody.debounced) renderCanvasAll();
            else debouncedRenderCanvasAll()
        }
    });

    function renderCanvasAll() { renderCanvas2D(trData); }
    const debouncedRenderCanvasAll = useDebounceInComponent(renderCanvasAll, 75);

    useResizedCompRedraw(canvasBaseRef, 100, false); // make sure that the component is redrawn when resized

    useEffect(() => {
        // This effect makes sure that the canvasses get (re)drawn each time the component redraws
        canvas2DUpdateResolutions(trData);
        debouncedRenderCanvasAll();
    });

    useMouseScrollwheelObserver(canvasOverlayRef, (ev) => { canvas2DMouseScrollwheelHandler(trData, ev) }, false);

    const mouseDragObserver = useMouseDragObserver({
        handleMouseDown: (e: any, pos: TpPoint2D) => canvas2DHandleMouseDown(trData, e, pos),
        handleMouseMove: (e: any, pos: TpPoint2D, diff: TpPoint2D) => canvas2DHandleMouseDrag(trData, e, pos, diff),
        handleMouseUp: (e: any) => canvas2DHandleMouseUp(trData, e),
    })

    let canvasGPUR: any = null;
    if (hasData && (trData.renderData!.gpurData.layers.length > 0)) {
        canvasGPUR = <CanvasGPUR
            renderData={trData.renderData!.gpurData}
            pixelRatio={trData.centralViewport.pixelRatio}
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
            <div style={createMarginsCss(trData.renderData.centralViewportMargins)}>
                {canvasGPUR}
            </div>
            <canvas
                id="overlay"
                ref={canvasOverlayRef}
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                onPointerDownCapture={mouseDragObserver}
                onMouseMove={(ev: any) => canvas2DMouseMoveHandler(trData, ev)}
                onMouseLeave={() => { canvas2DRemoveHoverInfo(trData) }}
                onClick={(ev) => { canvas2DMouseClickHandler(trData, ev) }}
            />
        </div>)
}