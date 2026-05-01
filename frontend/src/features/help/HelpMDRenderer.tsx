import Markdown from "react-markdown";
import rehypeExternalLinks from "rehype-external-links";
import remarkGfm from 'remark-gfm'
import styles from './ShowHelp.module.scss';


export function HelpMDRenderer({ navigateTo, children }: { navigateTo: (page: string) => void, children: any }) {
    return (
        <Markdown
            rehypePlugins={[[rehypeExternalLinks, { target: '_blank' }]]}
            remarkPlugins={[remarkGfm]} // this added to support tables

            components={{
                a: ({ href, children, ...props }) => {
                    if (!href) return <span>{children}</span>;
                    if (href.endsWith(".md")) return (
                        <>
                            <span className={styles.linkTriangle}>▸&thinsp;</span>
                            <a
                                href={href}
                                onClick={(e) => { e.preventDefault(); navigateTo(href); }}
                                {...props}
                            >
                                {children}
                            </a>
                        </>
                    );
                    return (
                        <a href={href} target="_blank" rel="noreferrer" {...props}>
                            {children}
                        </a>
                    );
                },
                img: ({ node, ...props }) => (
                    <img
                        {...props}
                        style={{ maxWidth: "100%", height: "auto", display: "block", margin: "1rem auto" }}
                    />
                ),
            }}

        >
            {children}
        </Markdown>

    )
}