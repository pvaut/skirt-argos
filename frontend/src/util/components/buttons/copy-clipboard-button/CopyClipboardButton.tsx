import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './CopyClipboardButton.module.scss';
import { useState } from 'react';



interface TpProps {
    content: string;
}


export function CopyClipboardButton(props: TpProps) {
    const { content } = props;

    const [animated, setAnimated] = useState(false)

    return (
        <div style={{
            display: 'inline-block',
            verticalAlign: 'top',
        }}>
            <div
                title='Copy to clipboard'
                className={animated ? styles.buttonAnimated : styles.button}
                onClick={(ev) => {
                    navigator.clipboard.writeText(content);
                    setAnimated(true);
                    setTimeout(() => setAnimated(false), 500);
                    ev.stopPropagation();
                }}
            >
                <FontAwesomeIcon icon={['far', 'clipboard']} />
            </div>
        </div>
    )
}