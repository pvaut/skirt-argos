import { useEffect, useRef, useState } from "react";
import { PopupPortal } from "../../util/components/popup-portal/PopupPortal";
import { postAMessage, useMessageListener } from "../../util/messageBus";
import styles from './ShowHelp.module.scss';
import { getCacheBustedUrl } from "../../util/download/fetchWithProgress";
import { HelpMDRenderer } from "./HelpMDRenderer";


const MESSAGE_SHOW_HELP = "MESSAGE_SHOW_HELP";

export function showHelp(page: string | null) {
    postAMessage(MESSAGE_SHOW_HELP, { page });
}

type TpHistoryEntry = {
    page: string;
    scrollY: number;
};

export function DocViewer() {

    const [isActive, setIsActive] = useState(false);

    const [history, setHistory] = useState<TpHistoryEntry[]>([{ page: "index.md", scrollY: 0 }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [content, setContent] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    useMessageListener(MESSAGE_SHOW_HELP, (type: string, messageBody: any) => {
        setIsActive(true);
        if (messageBody.page)
            navigateTo(messageBody.page);
    });

    const currentEntry = history[historyIndex];

    useEffect(() => {
        fetch(getCacheBustedUrl(`/docs/${currentEntry.page}`))
            .then((res) => {
                if (!res.ok) throw new Error("Not found");
                return res.text();
            })
            .then(setContent)
            .catch(() => setContent("**Page not found**"));
    }, [currentEntry]);


    useEffect(() => { // Restore scroll after rendering content
        if (containerRef.current) containerRef.current.scrollTo(0, currentEntry.scrollY);
    }, [content, currentEntry.scrollY]);


    const navigateTo = (page: string) => {
        const normalized = page.replace(/^\.?\//, "");
        if (normalized === currentEntry.page) return;

        const updatedHistory = [...history];
        updatedHistory[historyIndex] = {
            ...currentEntry,
            scrollY: containerRef.current?.scrollTop ?? 0,
        };

        updatedHistory.splice(historyIndex + 1);
        updatedHistory.push({ page: normalized, scrollY: 0 });


        setHistory(updatedHistory);
        setHistoryIndex(updatedHistory.length - 1);
    };

    const storeScrollPos = () => {
        const updatedHistory = [...history];
        updatedHistory[historyIndex] = {
            ...currentEntry,
            scrollY: containerRef.current?.scrollTop ?? 0,
        };
        setHistory(updatedHistory);
    }

    const goBack = () => {
        if (historyIndex > 0) {
            storeScrollPos();
            setHistoryIndex(historyIndex - 1);
        }
    };

    const goForward = () => {
        if (historyIndex < history.length - 1) {
            storeScrollPos();
            setHistoryIndex(historyIndex + 1);
        }
    };


    if (!isActive) return null;

    const breadCrumbs = getBreadCrumbs(currentEntry.page);

    return (
        <PopupPortal
            close={() => {
                setIsActive(false);
            }}
        >
            <div className={styles.wrapper}>
                <div className={styles.body} ref={containerRef}>
                    <HelpMDRenderer navigateTo={navigateTo}>
                        {content}
                    </HelpMDRenderer>
                </div>

                <div className={styles.header}>
                    <button onClick={goBack} disabled={historyIndex === 0}>
                        ←<br />Back
                    </button>
                    <button onClick={goForward} disabled={historyIndex >= history.length - 1} style={{ textAlign: 'right' }}>
                        →<br />
                        Forward
                    </button>
                    <div className={styles.breadCrumbsContainer}>
                        {breadCrumbs.map((crumb, idx) => (
                            <div key={crumb.id} style={{ display: 'inline-block' }}>
                                {(idx > 0) && "▶"}
                                {crumb.page && <div className={styles.crumbClickable} onClick={() => { navigateTo(crumb.page!) }}>{crumb.name}</div>}
                                {!crumb.page && <div className={styles.crumbUnClickable}>{crumb.name}</div>}
                            </div>
                        ))}
                    </div>

                </div>

            </div>
        </PopupPortal>
    );
}

interface TpBreadCrumb {
    id: string;
    name: string;
    page: string | null;
}

function getBreadCrumbs(page: string): TpBreadCrumb[] {
    let tokens = page.split('/');
    if (tokens[tokens.length - 1] == 'index.md')
        tokens = tokens.slice(0, tokens.length - 1);

    const breadcrumbs: TpBreadCrumb[] = [];
    breadcrumbs.push({ id: 'root', name: 'Introduction', page: (tokens.length > 0) ? 'index.md' : null });
    let partialPagePath = '';
    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
        const id = `id_${tokenIndex}`;
        const token = tokens[tokenIndex];
        const name = token2Name(token);
        if (partialPagePath.length > 0) partialPagePath == '/';
        partialPagePath += token;
        const isPage = token.endsWith('.md');
        if (tokenIndex == tokens.length - 1)
            breadcrumbs.push({ id, name, page: null });
        else {
            breadcrumbs.push({ id, name, page: partialPagePath + '/index.md' });
        }
    }
    return breadcrumbs;
}

function token2Name(token: string): string {
    if (!token) return "";
    const sentence = token.replace(/\.md$/, "").replace(/_/g, " ");
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);

}