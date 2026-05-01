import { useEffect, useRef, useState } from "react";


const theGlobalObserver = new ResizeObserver((entries: ResizeObserverEntry[], observer: ResizeObserver) => {
    for (const entry of entries) {
        const observedElement = findCurrentObservedElement(entry.target);
        if (observedElement)
            observedElement.callBack(entry);
    }
});


interface TpObservedElement {
    element: any;
    callBack: any;
}



let currentObservedElements: TpObservedElement[] = [];


export function addCurrentObservedElement(element: any, callBack: any) {
    theGlobalObserver.observe(element);
    currentObservedElements.push({
        element,
        callBack,
    });
}


export function delCurrentObservedElement(element: any) {
    if (theGlobalObserver && element)
        theGlobalObserver.unobserve(element);
    currentObservedElements = currentObservedElements.filter(e => (e.element !== element));
}


function findCurrentObservedElement(element: any): TpObservedElement | undefined {
    return currentObservedElements.find(el => el.element == element);
}


export const useResizeObserver = (elementRef: any, callBack: any) => {
    useEffect(() => {
        if (elementRef.current) {
            addCurrentObservedElement(elementRef.current, callBack);
        }
        // callback on termination
        return () => {
            delCurrentObservedElement(elementRef.current);
        };
    }, [elementRef.current]);
};


interface TpSizeInfo {
    width: number, height: number;
}


export function useResizedCompRedraw(refObservedComponent: any, debounceDelay: number, avoidTriggerOnCreation: boolean) {
    const [measuredSize, setMeasuredSize] = useState<TpSizeInfo>({ width: 1, height: 1 });
    const measuredSizeRef = useRef(measuredSize);
    measuredSizeRef.current = measuredSize;

    const startupDelayCompletedRef = useRef(!avoidTriggerOnCreation);
    if (avoidTriggerOnCreation) {
        // NOTE: we use this ugly hack to avoid that a redraw is triggered right after the component was created
        // A user will start resizing  only after a while anyway
        setTimeout(() => {
            startupDelayCompletedRef.current = true
        }, 100);
    } else {
        if (!refObservedComponent.current) {
            // NOTE: another ugly hack. The element is not always present in the DOM on first call of this function
            // Here we make sure that the component is rerendered, so that the element is mounted in the DOM
            setTimeout(() => {
                if (refObservedComponent.current) {
                    setMeasuredSize({
                        width: refObservedComponent.current.clientWidth,
                        height: refObservedComponent.current.clientHeight
                    })
                }
            }, 150);
        }
    }

    const updateClientSize = (clientSize: TpSizeInfo) => {
        if ((clientSize.width != measuredSizeRef.current.width) || (clientSize.height != measuredSizeRef.current.height)) {
            setMeasuredSize(structuredClone(clientSize)); // this will trigger a redraw
        }
    };

    useResizeObserver(refObservedComponent, (info: any) => {
        if (!refObservedComponent.current) return;
        if (!startupDelayCompletedRef.current) return;
        updateClientSize({
            width: refObservedComponent.current.clientWidth,
            height: refObservedComponent.current.clientHeight
        });
    });
}


// @todo: potential, more elegant replacement via a callback function on init of the element:
//
// const [measuredSize, setMeasuredSize] = useState<{ width: number, height: number }>({ width: 1, height: 1 });
// const updateClientSizeDebounced = useDebounceInComponent(() => {
//     setMeasuredSize({
//         width: wrapperRef.current?.clientWidth || 1,
//         height: wrapperRef.current?.clientHeight || 1
//       })
// }, 200)

// const init = useCallback((node: HTMLDivElement) => {
//     wrapperRef.current = node;
//     addCurrentObservedElement(node, () => {
//         console.log(`resize callback called!`);
//         updateClientSizeDebounced();
//     });
//     return () => {
//         delCurrentObservedElement(node);
//     }
// }, []);
