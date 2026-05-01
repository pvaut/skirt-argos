import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';


function BlurPanel({ top, left, width, height }: { top: number, left: number, width: number, height: number }) {
    if ((width <= 0) || (height <= 0)) return null;
    return (
        <div
            style={{
                backdropFilter: "blur(7px) saturate(75%) brightness(75%)",
                position: "absolute",
                top: `${top}px`,
                left: `${left}px`,
                width: `${width}px`,
                height: `${height}px`,
            }}
        />
    );
}


interface TpProps {
    children: React.ReactNode;
    close: () => void;
    noBackgroundBlur?: boolean;
}


export function PopupPortal(props: TpProps) {
    const docEl = document.getElementById('modalPopupElem');

    if (!docEl) return null;

    const vpWidth = window.innerWidth;
    const vpHeight = innerHeight;

    const wrapper = (
        <div
            id="modalPopupWrapper"
            style={{ width: '100vw', height: '100vh', position: 'absolute', zIndex: 99 }}
            onMouseDown={props.close}
        >
            <BlurPanel top={0} left={0} width={vpWidth} height={vpHeight} />

            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 40px rgb(0,0,0,0.5)',
                }}
                onClick={(e) => { e.stopPropagation(); }}
                onMouseDown={(e) => { e.stopPropagation(); }}
            >
                {props.children}
            </div>
        </div>
    );
    return createPortal(wrapper, docEl);
}
