
import { useRef, useState } from 'react';
import styles from './ExpandableSection.module.scss';
import { TpColor } from '../../color/color';
import { useResizeObserver } from '../../resizeObserverHook';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';


interface TpProps {
    collapsedHeight: number;
    children: React.ReactNode;
    bgColor: TpColor;
}


export function ExpandableSection({ collapsedHeight: maxHeight, children, bgColor }: TpProps) {
    const refSection = useRef<HTMLDivElement>(null);
    const [isOverflowing, setIsOverflowing] = useState<boolean>(false);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    useResizeObserver(refSection, () => {
        if (refSection.current) {
            const sectionHeight = refSection.current.clientHeight;
            setIsOverflowing(sectionHeight > maxHeight);
        }
    });

    const style: any = {};
    if ((isOverflowing && !isExpanded) || !refSection.current) {
        style.maxHeight = `${maxHeight}px`;
    }

    const gradient = `linear-gradient(0deg, rgba(${bgColor.r},${bgColor.g},${bgColor.b},1) 0%, rgba(${bgColor.r},${bgColor.g},${bgColor.b},0) 100%)`;

    return (
        <div className={styles.wrapper} style={style}>
            <div ref={refSection}>{children}</div>
            {isOverflowing && !isExpanded && (
                <div
                    className={styles.expanderSection}
                    style={{ background: gradient }}
                    onClick={() => setIsExpanded(true)}
                >
                    <div className={styles.switchButton}><FontAwesomeIcon icon="caret-down" /></div>
                </div>
            )}
            {isOverflowing && isExpanded && (
                <div
                    className={styles.collapserSection}
                    style={{ background: gradient }}
                    onClick={() => setIsExpanded(false)}
                >
                    <div className={styles.switchButton}><FontAwesomeIcon icon="caret-up" /></div>
                </div>
            )}
        </div>
    );
};
