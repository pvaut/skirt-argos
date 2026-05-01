import styles from './StartPage.module.scss';


import { TpResourceInfo } from "../../data/interfaces";
import { locDb } from '../../data/local-database/localDatabase';
import { useEffect, useState } from 'react';
import { postAMessage, useMessageListener } from '../../util/messageBus';
import { messagePopup } from '../../util/components/simple-modals/MessagePopup';

export const MSG_REFRESH_THUMBNAILS = "MSG_REFRESH_THUMBNAILS";

export async function setResourceThumbnail(uri: string, data: ArrayBuffer) {
    await locDb.storeResourceThumbnail(uri, data);
    setTimeout(() => {
        postAMessage(MSG_REFRESH_THUMBNAILS, null); 
        messagePopup({
            title: "Confirmation",
            description: "New thumbnail has been set."
        })
    }, 250);
}

interface TpProps {
    resource: TpResourceInfo
}

export function ResourceThumbnail({ resource }: TpProps) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [version, setVersion] = useState(0);

    function getLocalThumbnail() { // Try to fetch a local thumbnail image
        locDb.getResourceThumbnail(resource.uri).then((buffer) => {
            if (buffer) {
                const blob = new Blob([buffer], { type: 'image/png' });
                setObjectUrl(URL.createObjectURL(blob));
            }
        });
    }

    useMessageListener(MSG_REFRESH_THUMBNAILS, (type: string, messageBody: any) => {
        getLocalThumbnail();
    });


    useEffect(() => {
        getLocalThumbnail();
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }; // Cleanup on unmount or buffer change
    }, [resource.uri, version]);

    if (objectUrl) { // first try: client side stored thumbnail
        return (
            <div className={styles.linkTileThumbnail}>
                <img src={objectUrl} />
                <div className={styles.thumbnailOverlay} />
            </div>
        );
    }

    if (resource.thumbnail) { // we have a fixed thumbnail, server side
        return (
            <div className={styles.linkTileThumbnail}>
                <img src={`/data/images/${resource.thumbnail}`} />
                <div className={styles.thumbnailOverlay} />
            </div>
        );
    }

    return ( // no thumbnail - placeholder fallback
        <div
            className={styles.linkTileThumbnail}
            style={{ opacity: 0.85 }}
        >
            <img src="eye2.png" />
            <div className={styles.thumbnailOverlay} />
        </div>

    );
}