

import React, { useState } from "react";
import { createPortal } from "react-dom";

import styles from "./ContextMenu.module.scss";
import { postAMessage, useMessageListener } from "../../messageBus";
import { FloatingBox } from "../floating-box/FloatingBox";
import { guid } from "../../misc";

const MESSAGE_CONTEXT_MENU = "_msgContextMenu";


export function showContextMenu(targetElem: HTMLElement, content: any, registerCloseMenu?: (closeMenu: () => void) => void) {
    postAMessage(MESSAGE_CONTEXT_MENU, {
        content,
        targetElem,
        registerCloseMenu,
    });
}


export interface TpContextMenuItem {
    name: string;
    description?: string;
    action: () => void;
}


export const contextMenuSeparator: TpContextMenuItem = {
    name: '-',
    action: () => { }
}


export interface TpContextMenuDef {
    items: TpContextMenuItem[];
}


export function promptContextMenuItems(targetElem: HTMLElement, menu: TpContextMenuDef) {
    let closeMenu: (() => void) | null = null;
    showContextMenu(
        targetElem,
        (<div>
            {menu.items.map(item => (
                <div key={guid()}>
                    {(item.name == '-') && <div className={styles.menuSeparator} />}
                    {(item.name != '-') && (
                        <div
                            className={styles.menuLine}
                            onClick={(ev) => { ev.stopPropagation(); item.action(); closeMenu!() }}
                        >
                            <div>{item.name}</div>
                            {item.description && <div className={styles.menuItemDescription}>{item.description}</div>}
                        </div>
                    )}
                </div>
            ))}
        </div>),
        (closeMenuFunction) => { closeMenu = closeMenuFunction }
    )
}


interface TpProps {
    content: any;
    targetElem: HTMLElement;
    registerCloseMenu?: (closeMenu: () => void) => void;
}


export const ContextMenu: React.FC<{}> = () => {
    const [content, setContent] = useState<any | null>(null);
    const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    const docEl = document.getElementById('contextMenuElem');

    useMessageListener(MESSAGE_CONTEXT_MENU,
        (tpe: string, messageBody: TpProps) => {
            const rect = messageBody.targetElem.getBoundingClientRect();

            setPosition({
                top: rect.top + window.scrollY,
                left: Math.max(0, rect.right + window.scrollX),
            })

            setContent(messageBody.content);
            if (messageBody.registerCloseMenu)
                messageBody.registerCloseMenu(() => { setContent(null); });
        }, []);

    if (!content || !docEl) return null;

    const wrapper = (

        <div
            id="modalPopupWrapper"
            style={{ width: '100vw', height: '100vh', position: 'absolute', zIndex: 99 }}
            onClick={() => { setContent(null); }}
        >
            <FloatingBox anchorX={position.left} anchorY={position.top}>
                <div
                    className={styles.wrapper}
                    onClick={(e) => { e.stopPropagation(); }}
                    onMouseDown={(e) => { e.stopPropagation(); }}
                >
                    {content}
                </div>
            </FloatingBox>
        </div>

    );

    return createPortal(wrapper, docEl);
};


