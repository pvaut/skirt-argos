

import React, { ReactNode, useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";

import styles from "./InfoTooltip.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FloatingBox } from "../floating-box/FloatingBox";


interface InfoTooltipProps {
    children: ReactNode;
    className?: string;
}


const InfoTooltip: React.FC<InfoTooltipProps> = ({ children, className }) => {
    const [visibleFromIcon, setVisibleFromIcon] = useState(false);
    const [visibleFromPopup, setVisibleFromPopup] = useState(false);
    const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const iconRef = useRef<HTMLSpanElement>(null);

    const docEl = document.getElementById('tooltipElem');

    function determinePosition() {
        if (iconRef.current) {
            const rect = iconRef.current.getBoundingClientRect();
            setPosition({
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX + 24, // offset to the right of icon
            });
        }
    }

    return (
        <>
            <span
                ref={iconRef}
                className={styles.infoIcon}
                onMouseEnter={() => { setVisibleFromIcon(true); determinePosition(); }}
                onMouseLeave={() => { setTimeout(() => { setVisibleFromIcon(false) }, 100); }}
            >
                <FontAwesomeIcon icon="circle-info" />
            </span>
            {(visibleFromIcon || visibleFromPopup) && docEl &&
                ReactDOM.createPortal(

                    <FloatingBox anchorX={position.left} anchorY={position.top}>
                        <div
                            className={styles.infoPopup}
                            // style={{
                            //     position: "absolute",
                            //     top: position.top,
                            //     left: position.left,
                            // }}
                            onMouseEnter={() => { setVisibleFromPopup(true); determinePosition(); }}
                            onMouseLeave={() => setVisibleFromPopup(false)}
                        >
                            {children}
                        </div>

                    </FloatingBox>



                    ,
                    docEl,
                )}
        </>
    );
};


export default InfoTooltip;
