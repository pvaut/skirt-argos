import { useEffect } from "react";
import { point2DSubtract, TpPoint2D } from "./geometry/point2D";


export interface TpMouseWheelEvent {
    deltaY: number;
    deltaX: number;
    deltaMax: number;
    offsetX: number,
    offsetY: number;
    shiftKey: boolean;
    ctrlKey: boolean;
    _origEv: any;
}


export function useMouseScrollwheelObserver(refObservedComponent: any, callBack: (ev: TpMouseWheelEvent) => void, preventDefaultHandling = true) {

    const theHandler = (ev: any) => {
        if (preventDefaultHandling) {
            ev.stopPropagation();
            ev.preventDefault();
        }
        const deltaMax = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
        callBack({
            deltaY: ev.deltaY,
            deltaX: ev.deltaX,
            deltaMax,
            offsetX: ev.offsetX,
            offsetY: ev.offsetY,
            shiftKey: ev.shiftKey,
            ctrlKey: ev.ctrlKey,
            _origEv: ev,
        });
    }

    useEffect(() => {
        // NOTE: we register the mouse wheel event handling function with 'addEventListener', because 'onWheel' makes the handler passive and disables preventDefault
        if (refObservedComponent.current) {
            refObservedComponent.current.addEventListener('wheel', theHandler, { passive: false });
            return () => {
                // on terminate: unregister
                if (refObservedComponent.current)
                    refObservedComponent.current.removeEventListener('wheel', theHandler);
            };
        }
    }, [
        refObservedComponent.current,
    ]);
}


export function mouseWheelPreventDefaultHandling(ev: TpMouseWheelEvent) {
    ev._origEv.stopPropagation();
    ev._origEv.preventDefault();

}


// The returned function should be attached to the onPointerDownCapture={mouseDragHandler} handler of the target element
export function useMouseDragObserver(props: {
    handleMouseDown: (e: any, pos: TpPoint2D) => void,
    handleMouseMove: (e: any, pos: TpPoint2D, diff: TpPoint2D) => void,
    handleMouseUp: (e: any) => void,
}): (ev: any) => void {
    const { handleMouseDown: callBackMouseDown, handleMouseMove: callBackMouseMove, handleMouseUp: callBackMouseUp } = props;

    return (eventMouseCapture: any) => {
        eventMouseCapture.preventDefault();
        const targetElementOffset = eventMouseCapture.target.getBoundingClientRect();
        const target = eventMouseCapture.target;
        const pointerId = eventMouseCapture.pointerId;
        const startPos: TpPoint2D = {
            x: eventMouseCapture.clientX - targetElementOffset.left,
            y: eventMouseCapture.clientY - targetElementOffset.top,
        }
        let previousPos = { ...startPos };
        target.setPointerCapture(pointerId);

        if (callBackMouseDown) callBackMouseDown(eventMouseCapture, startPos);

        const listenerDocumentMouseUp = (eventMouseUp: any) => {
            target.releasePointerCapture(pointerId);
            document.removeEventListener('pointerup', listenerDocumentMouseUp);
            document.removeEventListener('pointermove', listenerDocumentMouseMove);
            if (callBackMouseUp)
                callBackMouseUp(eventMouseUp);
        };

        const listenerDocumentMouseMove = (eventMouseMove: any) => {
            eventMouseMove.preventDefault();
            const currentPos = {
                x: eventMouseMove.clientX - targetElementOffset.left,
                y: eventMouseMove.clientY - targetElementOffset.top,
            }
            if (callBackMouseMove)
                callBackMouseMove(eventMouseCapture, currentPos, point2DSubtract(currentPos, previousPos));
            previousPos = { ...currentPos };
        };

        // we can register the listeners at the document level, because we will unregister when the mouse dragging is done
        // and only one dragging action can be done at a certain moment
        document.addEventListener('pointerup', listenerDocumentMouseUp);
        document.addEventListener('pointermove', listenerDocumentMouseMove);
    };
}
