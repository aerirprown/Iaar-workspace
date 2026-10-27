import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { WorkspaceEntity } from '../types'
import { isDesktop } from '../desktop/client'
import { entityHash } from '../lib/route'
import { addWorkspaceTab } from '../lib/workspace'
import './new-project.css'

function AddTabDialog({ entity, onClose }: { entity: WorkspaceEntity, onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useLayoutEffect(() => {
    const element = dialog.current!
    element.showModal()
    // showModal focuses the first control (the close button); start on the name.
    input.current?.focus()
    return () => element.close()
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true); setError('')
    try {
      const card = await addWorkspaceTab(entity.id, name)
      onClose()
      window.location.hash = entityHash(entity.id, card.steps.length - 1)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The tab could not be added. Try again.')
      setSaving(false)
    }
  }

  return createPortal(
    <dialog
      ref={dialog}
      className="entity-menu new-project-dialog"
      aria-label={`Add a tab to ${entity.title}`}
      aria-busy={saving}
      onCancel={event => { event.preventDefault(); if (!saving) onClose() }}
      onKeyDown={event => event.stopPropagation()}
    >
      <form onSubmit={event => void submit(event)}>
        <div className="entity-menu-heading">
          <div><span>{entity.title}</span><h2>Add a tab</h2></div>
          <button type="button" className="entity-menu-close" aria-label="Close add tab" disabled={saving} onClick={onClose}>×</button>
        </div>
        <fieldset disabled={saving}>
          <label className="entity-category-control">
            Tab name
            <input ref={input} required maxLength={60} value={name} onChange={event => setName(event.target.value)} placeholder="Notes" />
          </label>
        </fieldset>
        <p className="entity-menu-hint">The tab starts as a blank Markdown page you can edit.</p>
        <button type="submit" className="new-project-submit" disabled={saving || !name.trim()}>{saving ? 'Adding…' : 'Add tab'}</button>
        {error && <p className="entity-menu-error" role="alert">{error}</p>}
      </form>
    </dialog>, document.body,
  )
}

export default function AddTabButton({ entity }: { entity: WorkspaceEntity }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="new-project-button add-tab-button"
        disabled={!isDesktop}
        title={isDesktop ? 'Add a tab' : 'Open the desktop app to add tabs'}
        aria-label="Add a tab"
        onClick={() => setOpen(true)}
      >
        +
      </button>
      {open && <AddTabDialog entity={entity} onClose={() => setOpen(false)} />}
    </>
  )
}
