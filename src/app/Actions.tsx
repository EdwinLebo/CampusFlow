import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Modal, Confirm } from '../components/ui'
import { RecordForm, nouns, type FormRequest, type Editable } from '../components/RecordForm'
import type { Change, Collections } from '../domain/model'
import { friendly } from '../services/firebase'
import { useWorkspace } from './Workspace'
interface Actions {
  edit: (request: FormRequest) => void
  remove: (kind: Editable, item: Collections[Editable]) => void
  apply: (changes: Change[], message?: string) => Promise<boolean>
  notify: (message: string, error?: boolean) => void
}
const Context = createContext<Actions | null>(null)
export function useActions() {
  const context = useContext(Context)
  if (!context) throw Error('Actions provider missing')
  return context
}
export function ActionsProvider({ children }: { children: ReactNode }) {
  const { commit, data, profile } = useWorkspace()
  const [form, setForm] = useState<FormRequest | null>(null)
  const [removal, setRemoval] = useState<{ kind: Editable; item: Collections[Editable] } | null>(null)
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const notify = (text: string, error = false) => setToast({ text, error })
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(id)
  }, [toast])
  async function apply(changes: Change[], message = 'Changes saved') {
    try {
      await commit(changes)
      notify(message)
      return true
    } catch (e) {
      notify(friendly(e), true)
      return false
    }
  }
  return (
    <Context.Provider
      value={{ edit: setForm, remove: (kind, item) => setRemoval({ kind, item }), apply, notify }}
    >
      {children}
      {form && (
        <Modal
          wide
          title={(form.item ? 'Edit ' : 'Add ') + nouns[form.kind]}
          onClose={() => setForm(null)}
        >
          <RecordForm
            request={form}
            data={data}
            profile={profile}
            onCancel={() => setForm(null)}
            onSave={async (change) => {
              try {
                await commit([change])
                notify(form.item ? 'Changes saved' : 'Added ' + nouns[form.kind])
                setForm(null)
              } catch (e) {
                throw Error(friendly(e))
              }
            }}
          />
        </Modal>
      )}
      {removal && (
        <Confirm
          title={'Delete ' + nouns[removal.kind] + '?'}
          detail={
            removal.kind === 'modules'
              ? 'This removes the module. Its assignments, marks and study history stay in your workspace under “Removed module”. Archive the module if you may need it again.'
              : 'This record will be permanently removed from your workspace.'
          }
          busy={busy}
          onClose={() => {
            if (!busy) setRemoval(null)
          }}
          onConfirm={async () => {
            setBusy(true)
            const ok = await apply([{ ...removal, remove: true } as Change], 'Record deleted')
            setBusy(false)
            if (ok) setRemoval(null)
          }}
        />
      )}
      {toast && (
        <div
          className={'toast ' + (toast.error ? 'failed' : '')}
          role={toast.error ? 'alert' : 'status'}
        >
          {toast.text}
        </div>
      )}
    </Context.Provider>
  )
}
