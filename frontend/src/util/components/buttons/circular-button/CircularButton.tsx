import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './CircularButton.module.scss';



interface TpCircularButtonProps {
    icon: string;
    disabled?: boolean;
    checked?: boolean;
    onClick: () => void;
    stopPropagation?: boolean;
    highlight?: boolean;
}


export function CircularButton(props: TpCircularButtonProps) {
    const { icon, onClick, highlight, disabled, checked, stopPropagation } = props;

    let className = styles.button;
    if (highlight) className = styles.buttonHighlight;
    if (checked) className = styles.buttonChecked;
    if (disabled) className = styles.buttonDisabled;
    return (
        <div style={{ display: 'inline-block', verticalAlign: 'top' }}>
            <div
                className={className}
                onClick={(ev) => {
                    if (stopPropagation) ev.stopPropagation();
                    if (!disabled) {
                        onClick();
                    }
                }}
            >
                <FontAwesomeIcon icon={icon as any} />
            </div>
        </div>
    )
}