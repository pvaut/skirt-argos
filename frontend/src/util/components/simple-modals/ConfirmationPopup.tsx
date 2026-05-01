import { useState } from 'react';

import styles from './SimpleModals.module.scss';
import { postAMessage, useMessageListener } from '../../messageBus';
import { PopupPortal } from '../popup-portal/PopupPortal';
import { StyledButton } from '../buttons/styled-button/StyledButton';


const MESSAGE_CONFIRM_POPUP = "_msgConfirmationPopup";


export interface TpConfirmationInfo {
    title: string;
    description: string;
    isWarning?: boolean;
}


interface TpConfirmationProps {
    confirmData: TpConfirmationInfo;
    onConfirm: any;
    onCancel: any;
}


export function getConfirmation(confirmData: TpConfirmationInfo) {
    return new Promise((resolve, reject) => {
        postAMessage(MESSAGE_CONFIRM_POPUP, {
            confirmData,
            onConfirm: () => { resolve(true); },
            onCancel: () => { resolve(false); },

        });
    });
}


export function ConfirmationPopup() {
    const [data, setData] = useState<TpConfirmationProps | null>(null);

    useMessageListener(MESSAGE_CONFIRM_POPUP,
        (tpe: string, messageBody: TpConfirmationProps) => { setData(messageBody); }, [],);

    if (!data) return null;

    return (
        <PopupPortal
            close={() => {
                data.onCancel();
                setData(null);
            }}
        >
            <div className={!data.confirmData.isWarning ? styles.confirmationPopup : styles.errorPopup}>
                <div className={styles.title}>{data.confirmData.title}</div>
                <div className={styles.description}>{data.confirmData.description}</div>

                <div style={{ paddingTop: '20px' }}>
                    <StyledButton
                        text={"Cancel"}
                        marginRight={15}
                        onClick={() => {
                            setTimeout(() => { data.onCancel(); }, 25)
                            setData(null);
                        }}
                    />
                    <StyledButton
                        text={"OK"}
                        onClick={() => {
                            setData(null);
                            setTimeout(() => { data.onConfirm(); }, 25)
                        }}
                    />
                </div>
            </div>
        </PopupPortal>
    );
}
