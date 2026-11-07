import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useActions } from '../app/Actions'
import { useWorkspace } from '../app/Workspace'
import type { Editable } from './RecordForm'
export function useRecordLink(kind: Editable) {
  const [query, setQuery] = useSearchParams()
  const { data } = useWorkspace()
  const { edit, notify } = useActions()
  const id = query.get('record')
  useEffect(() => {
    if (!id) return
    const item = data[kind].find((record) => record.id === id)
    if (item) edit({ kind, item })
    else notify('That record is no longer in your workspace.', true)
    setQuery(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.delete('record')
        return next
      },
      { replace: true },
    )
  }, [id, data, kind, edit, notify, setQuery])
}
