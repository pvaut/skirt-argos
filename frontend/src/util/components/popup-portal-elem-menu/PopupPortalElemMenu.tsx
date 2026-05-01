import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './PopupPortalElemMenu.module.scss';

function BlurPanel({ top, left, width, height }: { top: number, left: number, width: number, height: number }) {
    if ((width <= 0) || (height <= 0)) return null;
    return (
        <div
            style={{
                backdropFilter: "blur(10px)",
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
    targetElement: HTMLElement;
    width: number;
    children: React.ReactNode;
    close: () => void;
}


export function PopupPortalElemMenu(props: TpProps) {
    const docEl = document.getElementById('modalPopupElem');

    const [slideOut, setSlideOut] = useState(false);

    if (!docEl) return null;

    useEffect(() => {
        setTimeout(() => {
            if (!slideOut) setSlideOut(true);
        }, 20);
    }, []);

    const vpWidth = window.innerWidth;
    const vpHeight = innerHeight;

    const popupStyle: any = {};

    const borderSize = 15;

    const targetRect = props.targetElement.getBoundingClientRect();
    let popupTop = targetRect.top - borderSize;
    let popupLeft = targetRect.left - props.width;
    let popupWidth = props.width;
    let popupHeight = targetRect.bottom - targetRect.top + 2 * borderSize;
    if (popupTop + popupHeight > vpHeight) popupHeight = vpHeight - popupTop;
    if (popupLeft + popupWidth > vpWidth - 10) popupLeft = vpWidth - popupWidth - 10;
    popupStyle.top = `${popupTop}px`;
    popupStyle.left = `${slideOut ? popupLeft : (popupLeft + 100)}px`;
    popupStyle.height = `${popupHeight}px`;
    popupStyle.width = `${popupWidth}px`;
    popupStyle.transform = '';

    const wrapper = (
        <div
            id="modalPopupWrapper"
            style={{ width: '100vw', height: '100vh', position: 'absolute' }}
            onClick={props.close}
        >
            <BlurPanel top={0} left={0} width={vpWidth} height={targetRect.top} />
            <BlurPanel top={targetRect.top + targetRect.height} left={0} width={vpWidth} height={vpHeight - targetRect.top - targetRect.height} />
            <BlurPanel top={targetRect.top - 20} left={0} width={targetRect.left} height={popupHeight + 40} />
            <BlurPanel top={targetRect.top - 20} left={targetRect.right} width={vpWidth - targetRect.right} height={popupHeight + 40} />

            <div
                className={styles.menuTopBorder}
                style={{
                    left: `${targetRect.left -10}px`,
                    top: `${targetRect.top - borderSize}px`,
                    width: `${targetRect.right - targetRect.left + 10 + borderSize}px`,
                }} />
            <div
                className={styles.menuBottomBorder}
                style={{
                    left: `${targetRect.left -10}px`,
                    top: `${targetRect.bottom}px`,
                    width: `${targetRect.right - targetRect.left + 10 + borderSize}px`,
                }} />
            <div
                className={styles.menuRightBorder}
                style={{
                    left: `${targetRect.right}px`,
                    top: `${targetRect.top - borderSize}px`,
                    height: `${popupHeight}px`,
                }} />
            <div
                className={styles.chartOverlay}
                style={{
                    left: `${targetRect.left}px`,
                    top: `${targetRect.top}px`,
                    width: `${targetRect.right-targetRect.left}px`,
                    height: `${targetRect.bottom-targetRect.top}px`,
                }} />
            <div
                className={styles.menu}
                style={popupStyle}
                onClick={(e) => {
                    e.stopPropagation();
                }}
                onMouseDown={(e) => {
                    e.stopPropagation();
                }}
            >
                {props.children}
            </div>
        </div>
    );
    return createPortal(wrapper, docEl);
}
