import styles from './StyledButton.module.scss';


interface TpStyledButtonProps {
    text: string;
    disabled?: boolean;
    width?: number;
    marginRight?: number;
    onClick: () => void;
}


export function StyledButton(props: TpStyledButtonProps) {
    const { text, onClick, disabled, width, marginRight } = props;

    return (
        <div style={{
            display:'inline-block', 
            verticalAlign: 'top', 
            marginRight: marginRight || 0
            }}>
            <div
                className={disabled ? styles.buttonDisabled : styles.button}
                style={{
                    width: `${width || 150}px`,
                }}
                onClick={(ev) => {
                    if (!disabled) {
                        onClick();
                    }
                }}
            >
                {text}
            </div>
        </div>
    )
}