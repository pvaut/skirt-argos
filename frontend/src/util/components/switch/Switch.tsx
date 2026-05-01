import React from 'react';
import styles from './Switch.module.scss';


interface SwitchProps {
    value: boolean;
    onChange: (newValue: boolean) => void;
    trueLabel?: string;
    falseLabel?: string;
}


const Switch: React.FC<SwitchProps> = ({
    value,
    onChange,
    trueLabel = '',
    falseLabel = '',
}) => {
    return (
        <div className={styles.toggleContainer}>
            <span className={styles.toggleLabel}>{falseLabel}</span>
            <button
                onClick={() => onChange(!value)}
                // className={`toggle-switch ${value ? 'on' : 'off'}`}
                className={value ? styles.toggleSwitchOn : styles.toggleSwitch}
            >
                <span className={styles.toggleKnob} />
            </button>
            <span className={styles.toggleLabel}>{trueLabel}</span>
        </div>
    );
};

export default Switch;