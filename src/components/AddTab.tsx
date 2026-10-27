import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { WorkspaceEntity } from '../types'
import { isDesktop } from '../desktop/client'
import { entityHash } from '../lib/route'
import { addWorkspaceTab, editWorkspaceTabs, type TabEdit } from '../lib/workspace'
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

function EditTabsDialog({ entity, stepIndex, onClose }: { entity: WorkspaceEntity, stepIndex: number, onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [tabs, setTabs] = useState<TabEdit[]>(() => entity.steps.map((step, index) => ({ index, name: step.name })))
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const kept = new Set(tabs.map(tab => tab.index))
  const removed = entity.steps.filter((_, index) => !kept.has(index))

  useLayoutEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])

  const rename = (at: number, name: string) => setTabs(list => list.map((tab, i) => i === at ? { ...tab, name } : tab))
  const move = (at: number, by: number) => setTabs(list => {
    const next = [...list]
    ;[next[at], next[at + by]] = [next[at + by], next[at]]
    return next
  })
  const drop = (at: number) => { setTabs(list => list.filter((_, i) => i !== at)); setConfirming(false) }

  async function save() {
    if (saving) return
    if (removed.length && !confirming) { setConfirming(true); return }
    setSaving(true); setError('')
    try {
      await editWorkspaceTabs(entity.id, entity.steps.length, tabs)
      onClose()
      const current = tabs.findIndex(tab => tab.index === stepIndex)
      window.location.hash = entityHash(entity.id, Math.max(0, current))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The tabs could not be saved. Try again.')
      setSaving(false)
    }
  }

  const invalid = tabs.some(tab => !tab.name.trim())
  return createPortal(
    <dialog
      ref={dialog}
      className="entity-menu new-project-dialog edit-tabs-dialog"
      aria-label={`Edit tabs of ${entity.title}`}
      aria-busy={saving}
      onCancel={event => { event.preventDefault(); if (!saving) onClose() }}
      onKeyDown={event => event.stopPropagation()}
    >
      <div className="entity-menu-heading">
        <div><span>{entity.title}</span><h2>Edit tabs</h2></div>
        <button type="button" className="entity-menu-close" aria-label="Close edit tabs" disabled={saving} onClick={onClose}>×</button>
      </div>
      <fieldset disabled={saving}>
        <ol className="edit-tabs-list">
          {tabs.map((tab, at) => (
            <li key={tab.index}>
              <input aria-label={`Tab ${at + 1} name`} maxLength={60} value={tab.name} onChange={event => rename(at, event.target.value)} />
              <button type="button" aria-label={`Move ${tab.name} up`} title="Move up" disabled={at === 0} onClick={() => move(at, -1)}>↑</button>
              <button type="button" aria-label={`Move ${tab.name} down`} title="Move down" disabled={at === tabs.length - 1} onClick={() => move(at, 1)}>↓</button>
              <button type="button" className="edit-tabs-remove" aria-label={`Delete ${tab.name}`} title={tabs.length === 1 ? 'A project needs at least one tab' : 'Delete tab'} disabled={tabs.length === 1} onClick={() => drop(at)}>×</button>
            </li>
          ))}
        </ol>
      </fieldset>
      {confirming ? (
        <div className="entity-delete-confirm" role="group" aria-label="Confirm tab deletion">
          <p><strong>Delete {removed.map(step => step.name).join(', ')}?</strong> {removed.length === 1 ? 'Its file goes' : 'Their files go'} to the Recycle Bin.</p>
          <div>
            <button type="button" disabled={saving} onClick={() => setConfirming(false)}>Back</button>
            <button type="button" className="entity-delete-final" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Delete and save'}</button>
          </div>
        </div>
      ) : (
        <button type="button" className="new-project-submit" disabled={saving || invalid} onClick={() => void save()}>{saving ? 'Saving…' : 'Save tabs'}</button>
      )}
      {error && <p className="entity-menu-error" role="alert">{error}</p>}
    </dialog>, document.body,
  )
}

export function EditTabsButton({ entity, stepIndex }: { entity: WorkspaceEntity, stepIndex: number }) {
  const [open, setOpen] = useState(false)
  if (!entity.steps.length) return null
  return (
    <>
      <button
        type="button"
        className="new-project-button add-tab-button"
        disabled={!isDesktop}
        title={isDesktop ? 'Rename, reorder or delete tabs' : 'Open the desktop app to edit tabs'}
        aria-label="Edit tabs"
        onClick={() => setOpen(true)}
      >
        ✎
      </button>
      {open && <EditTabsDialog entity={entity} stepIndex={stepIndex} onClose={() => setOpen(false)} />}
    </>
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
