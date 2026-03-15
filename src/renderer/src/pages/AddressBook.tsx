import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  UserPlus,
  Search,
  X,
} from 'lucide-react'
import type { Contact } from '@shared/types'

export default function AddressBook() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    try {
      const c = await window.api.cloudSync.getContacts()
      setContacts(c)
    } catch {}
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    if (!address.trim() || address.length < 95) { setError('Valid Monero address required'); return }
    setError('')

    const contact: Contact = {
      id: editingId || crypto.randomUUID(),
      name: name.trim(),
      address: address.trim(),
      notes: notes.trim() || undefined,
      createdAt: editingId ? contacts.find(c => c.id === editingId)?.createdAt || Date.now() : Date.now(),
      updatedAt: Date.now(),
    }

    await window.api.cloudSync.saveContact(contact)
    await loadContacts()
    resetForm()
  }

  const handleDelete = async (id: string) => {
    await window.api.cloudSync.deleteContact(id)
    await loadContacts()
  }

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id)
    setName(contact.name)
    setAddress(contact.address)
    setNotes(contact.notes || '')
    setShowForm(true)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setName('')
    setAddress('')
    setNotes('')
    setError('')
  }

  const copyAddress = (id: string, addr: string) => {
    navigator.clipboard.writeText(addr)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.address.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Address Book</h2>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Add Contact
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="input-field pl-10 text-sm"
          />
        </div>

        {/* Add/Edit Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="glass-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{editingId ? 'Edit Contact' : 'New Contact'}</h3>
                  <button onClick={resetForm} className="text-text-muted hover:text-text-primary">
                    <X size={18} />
                  </button>
                </div>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  className="input-field text-sm"
                />
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Monero address (4... or 8...)"
                  className="input-field text-sm font-mono h-20 resize-none"
                />
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  className="input-field text-sm"
                />

                {error && <p className="text-sm text-status-error">{error}</p>}

                <div className="flex gap-3">
                  <button onClick={resetForm} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={handleSave} className="btn-primary flex-1">
                    {editingId ? 'Save Changes' : 'Add Contact'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contact list */}
        <div className="glass-card divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <UserPlus size={32} className="mx-auto text-text-muted mb-3" />
              <p className="text-text-secondary">No contacts yet</p>
              <p className="text-text-muted text-sm mt-1">Add contacts for quick sending</p>
            </div>
          ) : (
            filtered.map((contact, i) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="p-4 hover:bg-bg-hover/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary">{contact.name}</p>
                    <p className="text-xs font-mono text-text-muted truncate mt-0.5">{contact.address}</p>
                    {contact.notes && (
                      <p className="text-xs text-text-secondary mt-1">{contact.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <button
                      onClick={() => copyAddress(contact.id, contact.address)}
                      className="p-2 text-text-muted hover:text-text-primary transition-colors"
                    >
                      {copiedId === contact.id ? (
                        <Check size={14} className="text-status-success" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(contact)}
                      className="p-2 text-text-muted hover:text-text-primary transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="p-2 text-text-muted hover:text-status-error transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}
