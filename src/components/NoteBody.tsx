// A lesson note with its headings in bold ("New words:", "Covered:" and so on)
const HEADING = /^(Lesson|Attendance|Covered|Covered today|New words|Say it better|Notes|Other notes|Homework|Feedback|Next time|Review):\s*/i

export function NoteBody({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {text.split('\n').map((line, i) => {
        const m = line.match(HEADING)
        return (
          <p key={i} className={m && i > 0 ? 'mt-1.5' : ''}>
            {m ? <><strong className="font-extrabold">{m[1]}:</strong> {line.slice(m[0].length)}</> : line || ' '}
          </p>
        )
      })}
    </div>
  )
}
