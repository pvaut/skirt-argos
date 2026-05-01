import Markdown from "react-markdown";
import rehypeExternalLinks from "rehype-external-links";
import remarkGfm from 'remark-gfm'


export function SmartMarkdown({ children }: { children: any }) {
    return (
        <Markdown
            rehypePlugins={[[rehypeExternalLinks, { target: '_blank' }]]}
            remarkPlugins={[remarkGfm]} // this is supposed to support tables but does not seem to work...
        >
            {children}
        </Markdown>

    )
}