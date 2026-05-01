import React from "react";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from 'remark-gfm'

import styles from "./HighlightText.module.scss";
import rehypeExternalLinks from "rehype-external-links";

// Helper to escape user input in a regex-safe way
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


export function highlightText(text: string, search: string): React.ReactNode {
    if (!search) return text;

    const regex = new RegExp(`(${escapeRegExp(search)})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
        regex.test(part) ? (
            <span key={i} className={styles.highlight}>
                {part}
            </span>
        ) : (
            part
        )
    );
}


export function MarkdownWithHighlight({
    markdown,
    search,
}: {
    markdown: string;
    search: string;
}) {
    const highlighted = highlightInMarkdown(markdown, search);

    return (
        <ReactMarkdown rehypePlugins={[rehypeRaw, [rehypeExternalLinks, { target: '_blank' }], [remarkGfm]]}>
            {highlighted}
        </ReactMarkdown>
    );
}


function highlightInMarkdown(markdown: string, search: string): string {
    if (!search) return markdown;

    const regex = new RegExp(`(${escapeRegExp(search)})`, "gi");

    return markdown.replace(regex, (match) => `<span class="${styles.highlight}">${match}</span>`);
}