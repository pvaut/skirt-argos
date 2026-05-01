import { useState } from 'react';

import styles from './SimpleModals.module.scss';
import { postAMessage, useMessageListener } from '../../messageBus';
import { PopupPortal } from '../popup-portal/PopupPortal';
import { StyledButton } from '../buttons/styled-button/StyledButton';


const MESSAGE_MESSAGE_POPUP = "_msgMessagePopup";


export interface TpMessageInfo {
    title: string;
    description: string;
    isError?: boolean;
}


interface TpMessageProps {
    messageData: TpMessageInfo;
    onClose: any;
}


export function messagePopup(messageData: TpMessageInfo) {
    return new Promise((resolve, reject) => {
        postAMessage(MESSAGE_MESSAGE_POPUP, {
            messageData,
            onClose: () => { resolve(true); },
        });
    });
}


export function showError(errorMessage: string) {
    messagePopup({title: 'Error', description: errorMessage, isError: true});
}


export function MessagePopup() {
    const [data, setData] = useState<TpMessageProps | null>(null);

    useMessageListener(MESSAGE_MESSAGE_POPUP,
        (tpe: string, messageBody: TpMessageProps) => { setData(messageBody); }, [],);

    if (!data) return null;

    return (
        <PopupPortal
            close={() => {
                data.onClose();
                setData(null);
            }}
        >
            <div className={data.messageData.isError ? styles.errorPopup : styles.confirmationPopup}>
                <div className={styles.title}>{data.messageData.title}</div>
                <div className={styles.description}>{data.messageData.description}</div>

                <div style={{ paddingTop: '20px' }}>
                    <StyledButton
                        text={"OK"}
                        onClick={() => {
                            setData(null);
                            setTimeout(() => { data.onClose(); }, 25)
                        }}
                    />
                </div>
            </div>
        </PopupPortal>
    );
}
