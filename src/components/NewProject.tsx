import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { isDesktop } from '../desktop/client'
import { categoryIcon, PROJECT_TYPES } from '../lib/categories'
import { entityHash } from '../lib/route'
import { createWorkspaceProject } from '../lib/workspace'
import './new-project.css'

const typeLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

function NewProjectDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const name = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(PROJECT_TYPES[0])
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useLayoutEffect(() => {
    const element = dialog.current!
    element.showModal()
    // showModal focuses the first control (the close button); start on the name.
    name.current?.focus()
    return () => element.close()
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true); setError('')
    try {
      const entity = await createWorkspaceProject({ title, category, description })
      onClose()
      window.location.hash = entityHash(entity.id)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The project could not be created. Try again.')
      setSaving(false)
    }
  }

  return createPortal(
    <dialog
      ref={dialog}
      className="entity-menu new-project-dialog"
      aria-label="New project"
      aria-busy={saving}
      onCancel={event => { event.preventDefault(); if (!saving) onClose() }}
      onKeyDown={event => event.stopPropagation()}
    >
      <form onSubmit={event => void submit(event)}>
        <div className="entity-menu-heading">
          <div><span>Workspace</span><h2>New project</h2></div>
          <button type="button" className="entity-menu-close" aria-label="Close new project" disabled={saving} onClick={onClose}>×</button>
        </div>
        <fieldset disabled={saving}>
          <label className="entity-category-control">
            Name
            <input ref={name} required maxLength={80} value={title} onChange={event => setTitle(event.target.value)} placeholder="My project" />
          </label>
          <label className="entity-category-control">
            Project type
            <select value={category} onChange={event => setCategory(event.target.value)}>
              {PROJECT_TYPES.map(value => <option key={value} value={value}>{categoryIcon(value)} {typeLabel(value)}</option>)}
            </select>
          </label>
          <label className="entity-category-control">
            <span>Description <small>(optional)</small></span>
            <textarea rows={2} maxLength={300} value={description} onChange={event => setDescription(event.target.value)} placeholder="A sentence about the project" />
          </label>
        </fieldset>
        <p className="entity-menu-hint">The project starts with tabs suited to its type. Ask an agent in Chats to fill them in.</p>
        <button type="submit" className="new-project-submit" disabled={saving || !title.trim()}>{saving ? 'Creating…' : 'Create project'}</button>
        {error && <p className="entity-menu-error" role="alert">{error}</p>}
      </form>
    </dialog>, document.body,
  )
}

export default function NewProjectButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="new-project-button"
        disabled={!isDesktop}
        title={isDesktop ? 'New project' : 'Open the desktop app to create projects'}
        aria-label="New project"
        onClick={() => setOpen(true)}
      >
        +
      </button>
      {open && <NewProjectDialog onClose={() => setOpen(false)} />}
    </>
  )
}
