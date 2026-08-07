import ReactMarkdown from 'react-markdown'
import { CodeBlock } from './CodeBlock'

interface MarkdownProps {
  children: string
  className?: string
}

export function Markdown({ children, className = '' }: MarkdownProps) {
  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          code({ className: codeClassName, children: codeChildren, ...rest }) {
            const match = /language-(\w+)/.exec(codeClassName || '')
            const isBlock = Boolean(match) || String(codeChildren).includes('\n')
            if (isBlock) {
              const language = match ? match[1] : undefined
              return <CodeBlock code={String(codeChildren).replace(/\n$/, '')} language={language} />
            }
            return <code {...rest}>{codeChildren}</code>
          },
          pre({ children: preChildren }) {
            // Avoid double-wrapping in <pre> when CodeBlock already handles it
            return <>{preChildren}</>
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
