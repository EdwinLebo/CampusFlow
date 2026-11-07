import { Fragment } from 'react'

function inline(text: string) {
  return text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g).map((piece, index) => {
    if (piece.startsWith('**') && piece.endsWith('**') && piece.length > 4)
      return <strong key={index}>{piece.slice(2, -2)}</strong>
    if (piece.startsWith('`') && piece.endsWith('`') && piece.length > 2)
      return <code key={index}>{piece.slice(1, -1)}</code>
    return <Fragment key={index}>{piece}</Fragment>
  })
}
export function NoteText({ content }: { content: string }) {
  return (
    <div className="note-content">
      {(content || 'This note is empty.').split(/\n{2,}/g).map((block, index) => {
        const lines = block.split('\n')
        if (lines.every((line) => /^[-*] /.test(line)))
          return (
            <ul key={index}>
              {lines.map((line, i) => (
                <li key={i}>{inline(line.slice(2))}</li>
              ))}
            </ul>
          )
        return <p key={index}>{inline(block)}</p>
      })}
    </div>
  )
}
