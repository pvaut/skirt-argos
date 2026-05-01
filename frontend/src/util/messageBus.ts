import { useEffect } from 'react';
import { guid } from './misc';


export interface TpMessageListener {
    (messageType: string, messageBody: any): void;
}


const currentMessageListeners: { [id: string]: { messageType: string | null; handler: TpMessageListener } } = {};


function _addMessageListener(messageType: string | null, handler: any): string {
    const id = guid();
    currentMessageListeners[id] = {
        messageType,
        handler,
    };
    return id; // use this id in deleteMessageListener to remove the listener
}


function _deleteMessageListener(id: string): void {
    if (currentMessageListeners[id])
        delete currentMessageListeners[id];
}


export function useMessageListener(
    messageType: string,
    callBack: TpMessageListener,
    dependencyList?: any[],
) {
    useEffect(() => {
        const id = _addMessageListener(messageType, callBack);
        return () => {
            if (id) {
                if (id) _deleteMessageListener(id);
            }
        };
    }, dependencyList || []);
}


export function postAMessage(messageType: string, messageBody: any) {
    for (const [id, listener] of Object.entries(currentMessageListeners)) {
        if (!listener.messageType || listener.messageType == messageType) 
            listener.handler(messageType, messageBody);
    }
}


