import { useState } from "react";
import { PopupPortal } from "./components/popup-portal/PopupPortal";
import { postAMessage, useMessageListener } from "./messageBus";
import Loader from "./components/loader/Loader";
import ProgressBar from "./components/loader/ProgressBar";


const MESSAGE_WAIT_POPUP = "_msgWait";
const MESSAGE_WAIT_PROGRESS = "MESSAGE_WAIT_PROGRESS";


export function startWait(message: string) {
    postAMessage(MESSAGE_WAIT_POPUP, message);
}


export function stopWait() {
    postAMessage(MESSAGE_WAIT_POPUP, null);
}


export function setWaitProgress(progress: number) {
    postAMessage(MESSAGE_WAIT_PROGRESS, progress);
}


export function processWithWait<RESULT>(message: string, fnc: () => RESULT): Promise<RESULT> {
    return new Promise((resolve, reject) => {
        postAMessage(MESSAGE_WAIT_POPUP, message);
        setTimeout(() => {
            const result = fnc();
            postAMessage(MESSAGE_WAIT_POPUP, null);
            resolve(result);
        }, 20);
    });
}


export function WaitPopup() {
    const [waitMessage, setWaitMessage] = useState<string | null>(null);
    const [progress, setProgress] = useState<number | null>(null);

    useMessageListener(MESSAGE_WAIT_POPUP,
        (tpe: string, messageBody: string | null) => { setWaitMessage(messageBody) }, [],);

    useMessageListener(MESSAGE_WAIT_PROGRESS,
        (tpe: string, messageBody: number | null) => { setProgress(messageBody) }, [],);

    if (!waitMessage) return null;

    return (
        <PopupPortal
            close={() => { }}
        >
            <div style={{ textAlign: 'center', borderRadius: '10px', background: 'var(--color-bg2)' }}>
                {(progress != null) && <div style={{ padding: '10px 0' }}><ProgressBar percentage={progress} /></div>}
                <div style={{padding: '30px'}}>
                    {waitMessage && (
                        <div style={{ paddingBottom: '20px' }}>{waitMessage}</div>
                    )}
                    <Loader />
                </div>
            </div>
        </PopupPortal>
    );
}
