

export interface TpDataWidgetActions {
    downloadBitmap: ()=> void;
    setThumbnail: ()=> void;
}

export interface TpDataWidgetShortcutButton {
    icon: string;
    active?: boolean;
    handle: () => void;
}


export interface TpDataWidgetCtx {
    setDataWidgetActions: (actions: TpDataWidgetActions) => void; // this function is called by the child element of a data widget that rendrts the data, in order to provide functionality to the parten widget element
    setDataWidgetShortcutButtons: (buttons: TpDataWidgetShortcutButton[]) =>void;
}

export const KW_ABSENT_CHANNEL = "_empty_";
