'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Box, Tabs, Tab, Typography, Button, Table, TableHead, TableRow,
  TableCell, TableBody, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, AppBar, Toolbar,
  Container, Paper, CircularProgress, Alert, Snackbar,
  TableContainer, MenuItem, FormControlLabel, Checkbox,
  Grid,
} from '@mui/material'
import { Add, Edit, Delete, Business, Image } from '@mui/icons-material'

// ========== Types ==========
type Row = Record<string, unknown>
interface Field { key: string; label: string; type?: 'text' | 'multiline' | 'select' | 'checkbox'; rows?: number; options?: string[] }
interface Section { id: string; label: string; endpoint: string; fields: Field[]; columns: string[] }

// ========== Config ==========
const SECTIONS: Section[] = [
  {
    id: 'products-services', label: 'Products & Services', endpoint: '/api/products-services',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'image_url', label: 'Image URL' },
      { key: 'description', label: 'Description', type: 'multiline', rows: 3 },
      { key: 'video_url', label: 'Video URL' },
    ],
    columns: ['title', 'image_url', 'description', 'video_url'],
  },
  {
    id: 'clients', label: 'Clients', endpoint: '/api/clients',
    fields: [
      { key: 'title', label: 'Title / Company Name' },
      { key: 'image_url', label: 'Image URL' },
      { key: 'description', label: 'Description', type: 'multiline', rows: 3 },
      { key: 'link', label: 'Link' },
      { key: 'entity_type', label: 'Type', type: 'select', options: ['membership', 'partner'] },
    ],
    columns: ['title', 'image_url', 'description', 'link', 'entity_type'],
  },
  {
    id: 'jobs', label: 'Jobs', endpoint: '/api/jobs',
    fields: [
      { key: 'title', label: 'Job Title' },
      { key: 'description', label: 'Description', type: 'multiline', rows: 4 },
    ],
    columns: ['title', 'description'],
  },
]

// ========== Helpers ==========
const trunc = (s: unknown, n = 60) => {
  const str = String(s ?? '')
  return str.length > n ? str.slice(0, n) + '…' : str
}
const colLabel = (c: string) => c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

const exportToCSV = (data: any[], filename: string) => {
  if (!data.length) return
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
      }
    }
    if (value instanceof Date) {
      const year = value.getFullYear()
      const month = String(value.getMonth() + 1).padStart(2, '0')
      const day = String(value.getDate()).padStart(2, '0')
      const hours = String(value.getHours()).padStart(2, '0')
      const minutes = String(value.getMinutes()).padStart(2, '0')
      const seconds = String(value.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }
    if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`
    return String(value)
  }
  const headers = Object.keys(data[0])
  const csvRows = [headers.join(','), ...data.map(row => headers.map(h => formatValue(row[h])).join(','))]
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ========== Generic CRUD Section (no Stack) ==========
function CrudSection({ section }: { section: Section }) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form, setForm] = useState<Row>({})
  const [snack, setSnack] = useState({ open: false, msg: '', ok: true })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(section.endpoint)
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch { setRows([]) } finally { setLoading(false) }
  }, [section.endpoint])

  useEffect(() => { load() }, [load])

  const notify = (msg: string, ok = true) => setSnack({ open: true, msg, ok })
  const openAdd = () => { setEditing(null); setForm({}); setOpen(true) }
  const openEdit = (row: Row) => { setEditing(row); setForm({ ...row }); setOpen(true) }

  const save = async () => {
    try {
      const url = editing ? `${section.endpoint}/${editing.id}` : section.endpoint
      await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      notify(editing ? 'Updated' : 'Added')
      setOpen(false)
      load()
    } catch { notify('Something went wrong', false) }
  }

  const remove = async (id: unknown) => {
    if (!confirm('Delete this record?')) return
    await fetch(`${section.endpoint}/${id}`, { method: 'DELETE' })
    notify('Deleted')
    load()
  }

  const renderField = (field: Field) => {
    const value = form[field.key] ?? ''
    const handleChange = (newValue: any) => setForm(p => ({ ...p, [field.key]: newValue }))
    switch (field.type) {
      case 'multiline':
        return <TextField key={field.key} label={field.label} fullWidth multiline rows={field.rows || 3} value={value} onChange={e => handleChange(e.target.value)} />
      case 'select':
        return (
          <TextField key={field.key} label={field.label} fullWidth select value={value} onChange={e => handleChange(e.target.value)}>
            {field.options?.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
          </TextField>
        )
      case 'checkbox':
        return <FormControlLabel key={field.key} control={<Checkbox checked={!!value} onChange={e => handleChange(e.target.checked)} />} label={field.label} />
      default:
        return <TextField key={field.key} label={field.label} fullWidth value={value} onChange={e => handleChange(e.target.value)} />
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>{section.label}</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openAdd}>Add</Button>
      </Box>
      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead><TableRow sx={{ bgcolor: '#1565C0' }}>
              {section.columns.map(c => <TableCell key={c} sx={{ color: '#fff', fontWeight: 700 }}>{colLabel(c)}</TableCell>)}
              <TableCell sx={{ color: '#fff', fontWeight: 700, width: 90 }}>Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {rows.length === 0 ? <TableRow><TableCell colSpan={section.columns.length+1} align="center">No records</TableCell></TableRow> :
                rows.map((row, i) => (
                  <TableRow key={String(row.id)} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#f5f8ff' }}>
                    {section.columns.map(c => <TableCell key={c} sx={{ maxWidth: 220 }}>{trunc(row[c])}</TableCell>)}
                    <TableCell>
                      <IconButton size="small" color="primary" onClick={() => openEdit(row)}><Edit /></IconButton>
                      <IconButton size="small" color="error" onClick={() => remove(row.id)}><Delete /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1565C0', color: '#fff' }}>{editing ? `Edit ${section.label}` : `Add ${section.label}`}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}><Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{section.fields.map(f => renderField(f))}</Box></DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={save}>{editing ? 'Update' : 'Add'}</Button></DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.ok ? 'success' : 'error'}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}

// ========== Our Company Section ==========
function OurCompanySection() {
  const [company, setCompany] = useState<Row | null>(null)
  const [sections, setSections] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [compForm, setCompForm] = useState({ cover_pic: '', description: '' })
  const [secOpen, setSecOpen] = useState(false)
  const [editSec, setEditSec] = useState<Row | null>(null)
  const [secForm, setSecForm] = useState({ title: '', description: '', image_url: '' })
  const [snack, setSnack] = useState({ open: false, msg: '', ok: true })
  const notify = (msg: string, ok = true) => setSnack({ open: true, msg, ok })
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/our-company')
      const data = await res.json()
      setCompany(data)
      setSections(data.sections || [])
      setCompForm({ cover_pic: String(data.cover_pic ?? ''), description: String(data.description ?? '') })
    } catch {} finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  const saveCompany = async () => {
    try {
      await fetch('/api/our-company', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(compForm) })
      notify('Company info saved')
      load()
    } catch { notify('Failed to save', false) }
  }
  const openAddSec = () => { setEditSec(null); setSecForm({ title: '', description: '', image_url: '' }); setSecOpen(true) }
  const openEditSec = (s: Row) => { setEditSec(s); setSecForm({ title: String(s.title ?? ''), description: String(s.description ?? ''), image_url: String(s.image_url ?? '') }); setSecOpen(true) }
  const saveSec = async () => {
    try {
      const url = editSec ? `/api/our-company/sections/${editSec.id}` : '/api/our-company/sections'
      await fetch(url, { method: editSec ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(secForm) })
      notify(editSec ? 'Section updated' : 'Section added')
      setSecOpen(false)
      load()
    } catch { notify('Failed', false) }
  }
  const deleteSec = async (id: unknown) => {
    if (!confirm('Delete this section?')) return
    await fetch(`/api/our-company/sections/${id}`, { method: 'DELETE' })
    notify('Section deleted')
    load()
  }
  if (loading) return <CircularProgress />
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>Our Company</Typography>
      <Paper sx={{ p: 3, mb: 4 }}><Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField label="Cover Picture URL" fullWidth value={compForm.cover_pic} onChange={e => setCompForm(p => ({ ...p, cover_pic: e.target.value }))} />
        <TextField label="Description" fullWidth multiline rows={4} value={compForm.description} onChange={e => setCompForm(p => ({ ...p, description: e.target.value }))} />
        <Button variant="contained" onClick={saveCompany}>Save Company Info</Button>
      </Box></Paper>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>Sections</Typography>
        <Button variant="contained" size="small" startIcon={<Add />} onClick={openAddSec}>Add Section</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow sx={{ bgcolor: '#1565C0' }}>{['Title', 'Description', 'Image URL', 'Actions'].map(h => <TableCell key={h} sx={{ color: '#fff' }}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {sections.map((s, i) => (
              <TableRow key={String(s.id)} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#f5f8ff' }}>
                <TableCell>{trunc(s.title, 40)}</TableCell><TableCell>{trunc(s.description)}</TableCell><TableCell>{trunc(s.image_url)}</TableCell>
                <TableCell><IconButton size="small" color="primary" onClick={() => openEditSec(s)}><Edit /></IconButton><IconButton size="small" color="error" onClick={() => deleteSec(s.id)}><Delete /></IconButton></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={secOpen} onClose={() => setSecOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1565C0', color: '#fff' }}>{editSec ? 'Edit Section' : 'Add Section'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}><Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Title" fullWidth value={secForm.title} onChange={e => setSecForm(p => ({ ...p, title: e.target.value }))} />
          <TextField label="Description" fullWidth multiline rows={3} value={secForm.description} onChange={e => setSecForm(p => ({ ...p, description: e.target.value }))} />
          <TextField label="Image URL" fullWidth value={secForm.image_url} onChange={e => setSecForm(p => ({ ...p, image_url: e.target.value }))} />
        </Box></DialogContent>
        <DialogActions><Button onClick={() => setSecOpen(false)}>Cancel</Button><Button variant="contained" onClick={saveSec}>{editSec ? 'Update' : 'Add'}</Button></DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}><Alert severity={snack.ok ? 'success' : 'error'}>{snack.msg}</Alert></Snackbar>
    </Box>
  )
}

// ========== Contact Submissions ==========
function ContactSubmissions() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch('/api/contact-submissions'); const data = await res.json(); setRows(Array.isArray(data) ? data : []) } catch { setRows([]) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>Contact Submissions</Typography>
        <Button variant="outlined" onClick={() => exportToCSV(rows, 'contact_submissions')}>Export to CSV</Button>
      </Box>
      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead><TableRow sx={{ bgcolor: '#1565C0' }}>{['ID', 'Name', 'Email', 'Subject', 'Message', 'Created At'].map(h => <TableCell key={h} sx={{ color: '#fff' }}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.id}>
                  <TableCell>{row.id}</TableCell><TableCell>{row.name}</TableCell><TableCell>{row.email}</TableCell><TableCell>{row.subject || '-'}</TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>{trunc(row.message, 80)}</TableCell><TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}

// ========== Job Applications ==========
function JobApplications() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch('/api/job-applications'); const data = await res.json(); setRows(Array.isArray(data) ? data : []) } catch { setRows([]) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>Job Applications</Typography>
        <Button variant="outlined" onClick={() => exportToCSV(rows, 'job_applications')}>Export to CSV</Button>
      </Box>
      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead><TableRow sx={{ bgcolor: '#1565C0' }}>{['ID', 'Full Name', 'Email', 'Phone', 'Job Title', 'Cover Letter', 'Resume URL', 'Created At'].map(h => <TableCell key={h} sx={{ color: '#fff' }}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.id}>
                  <TableCell>{row.id}</TableCell><TableCell>{row.full_name}</TableCell><TableCell>{row.email}</TableCell><TableCell>{row.phone || '-'}</TableCell>
                  <TableCell>{row.job_title || '-'}</TableCell><TableCell sx={{ maxWidth: 200 }}>{trunc(row.cover_letter, 60)}</TableCell>
                  <TableCell>{row.resume_url ? <a href={row.resume_url} target="_blank">Link</a> : '-'}</TableCell>
                  <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
function ProjectImagesManager({ projectId }: { projectId: number }) {
  const [images, setImages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openAdd, setOpenAdd] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newCaption, setNewCaption] = useState('')
  const [snack, setSnack] = useState({ open: false, msg: '', ok: true })
  const loadImages = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch(`/api/projects/${projectId}/images`); const data = await res.json(); setImages(Array.isArray(data) ? data : []) } catch { setImages([]) } finally { setLoading(false) }
  }, [projectId])
  useEffect(() => { loadImages() }, [loadImages])
  const notify = (msg: string, ok = true) => setSnack({ open: true, msg, ok })
  const addImage = async () => {
    if (!newImageUrl.trim()) return notify('Image URL required', false)
    try {
      await fetch(`/api/projects/${projectId}/images`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_url: newImageUrl, caption: newCaption }) })
      notify('Image added')
      setNewImageUrl(''); setNewCaption(''); setOpenAdd(false); loadImages()
    } catch { notify('Failed to add image', false) }
  }
  const deleteImage = async (imageId: number) => {
    if (!confirm('Delete this sub‑image?')) return
    try { await fetch(`/api/projects/${projectId}/images/${imageId}`, { method: 'DELETE' }); notify('Image deleted'); loadImages() } catch { notify('Failed to delete', false) }
  }
  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Project Sub‑Images</Typography>
        <Button size="small" startIcon={<Add />} onClick={() => setOpenAdd(true)}>Add</Button>
      </Box>
      {loading ? <CircularProgress size={24} /> : images.length === 0 ? <Typography variant="body2" color="textSecondary">No sub‑images yet.</Typography> : (
        <Grid container spacing={1}>
          {images.map(img => (
            <Grid key={img.id}>
              <Box sx={{ position: 'relative', width: 80, height: 80, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}>
                <img src={img.image_url} alt={img.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <IconButton size="small" sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'white', opacity: 0.8 }} onClick={() => deleteImage(img.id)}><Delete fontSize="small" /></IconButton>
              </Box>
              {img.caption && <Typography variant="caption" sx={{ display: 'block', textAlign: 'center' }}>{img.caption}</Typography>}
            </Grid>
          ))}
        </Grid>
      )}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Sub‑Image</DialogTitle>
        <DialogContent>
          <TextField label="Image URL" fullWidth margin="normal" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} />
          <TextField label="Caption (optional)" fullWidth margin="normal" value={newCaption} onChange={e => setNewCaption(e.target.value)} />
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenAdd(false)}>Cancel</Button><Button variant="contained" onClick={addImage}>Add</Button></DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}><Alert severity={snack.ok ? 'success' : 'error'}>{snack.msg}</Alert></Snackbar>
    </Box>
  )
}

// ========== Projects Manager ==========
function ProjectsManager() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [openEdit, setOpenEdit] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form, setForm] = useState<Row>({})
  const [snack, setSnack] = useState({ open: false, msg: '', ok: true })
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch('/api/projects'); const data = await res.json(); setRows(Array.isArray(data) ? data : []) } catch { setRows([]) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  const notify = (msg: string, ok = true) => setSnack({ open: true, msg, ok })
  const openAdd = () => { setEditing(null); setForm({}); setOpenEdit(true) }
  const openEditRow = (row: Row) => { setEditing(row); setForm({ ...row }); setOpenEdit(true) }
  const save = async () => {
    try {
      const url = editing ? `/api/projects/${editing.id}` : '/api/projects'
      await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      notify(editing ? 'Updated' : 'Added')
      setOpenEdit(false); load()
    } catch { notify('Failed', false) }
  }
  const remove = async (id: unknown) => {
    if (!confirm('Delete this project? Sub‑images will be deleted automatically.')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    notify('Deleted')
    load()
  }
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>Projects</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openAdd}>Add Project</Button>
      </Box>
      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead><TableRow sx={{ bgcolor: '#1565C0' }}>
              <TableCell sx={{ color: '#fff' }}>Title</TableCell><TableCell sx={{ color: '#fff' }}>Image URL</TableCell><TableCell sx={{ color: '#fff' }}>Description</TableCell>
              <TableCell sx={{ color: '#fff' }}>Video URL</TableCell><TableCell sx={{ color: '#fff', width: 100 }}>Images</TableCell><TableCell sx={{ color: '#fff', width: 90 }}>Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {rows.length === 0 ? <TableRow><TableCell colSpan={6} align="center">No projects</TableCell></TableRow> :
                rows.map((row, i) => (
                  <TableRow key={String(row.id)} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#f5f8ff' }}>
                    <TableCell>{trunc(row.title, 40)}</TableCell><TableCell>{trunc(row.image_url, 40)}</TableCell><TableCell>{trunc(row.description, 50)}</TableCell>
                    <TableCell>{trunc(row.video_url, 30)}</TableCell>
                    <TableCell><Button size="small" startIcon={<Image />} onClick={() => setSelectedProjectId(row.id as number)}>Manage</Button></TableCell>
                    <TableCell><IconButton size="small" color="primary" onClick={() => openEditRow(row)}><Edit /></IconButton><IconButton size="small" color="error" onClick={() => remove(row.id)}><Delete /></IconButton></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={!!selectedProjectId} onClose={() => setSelectedProjectId(null)} maxWidth="md" fullWidth>
        <DialogTitle>Manage Sub‑Images</DialogTitle>
        <DialogContent>{selectedProjectId && <ProjectImagesManager projectId={selectedProjectId} />}</DialogContent>
        <DialogActions><Button onClick={() => setSelectedProjectId(null)}>Close</Button></DialogActions>
      </Dialog>
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Project' : 'Add Project'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}><Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Title" fullWidth value={form.title ?? ''} onChange={e => setForm({ ...form, title: e.target.value })} />
          <TextField label="Image URL" fullWidth value={form.image_url ?? ''} onChange={e => setForm({ ...form, image_url: e.target.value })} />
          <TextField label="Description" fullWidth multiline rows={3} value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} />
          <TextField label="Video URL" fullWidth value={form.video_url ?? ''} onChange={e => setForm({ ...form, video_url: e.target.value })} />
        </Box></DialogContent>
        <DialogActions><Button onClick={() => setOpenEdit(false)}>Cancel</Button><Button variant="contained" onClick={save}>{editing ? 'Update' : 'Add'}</Button></DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}><Alert severity={snack.ok ? 'success' : 'error'}>{snack.msg}</Alert></Snackbar>
    </Box>
  )
}

// ========== MAIN PAGE ==========
const TABS = ['Projects', 'Products & Services', 'Clients', 'Our Company', 'Jobs', 'Contact Submissions', 'Job Applications']

export default function AdminPage() {
  const [tab, setTab] = useState(0)
  return (
    <>
      <AppBar position="static" elevation={1}>
        <Toolbar sx={{ gap: 1 }}>
          <Business />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Loxon Philippines, Inc. — Landing Page Configuration</Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ bgcolor: '#1565C0', borderBottom: '3px solid #0d47a1' }}>
        <Container maxWidth="xl">
          <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="inherit" variant="scrollable" scrollButtons="auto"
            sx={{ '& .MuiTabs-indicator': { backgroundColor: '#fff', height: 3 }, '& .MuiTab-root': { color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'none', fontSize: 14 }, '& .Mui-selected': { color: '#fff' } }}>
            {TABS.map(t => <Tab key={t} label={t} />)}
          </Tabs>
        </Container>
      </Box>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {tab === 0 && <ProjectsManager />}
          {tab === 1 && <CrudSection section={SECTIONS[0]} />}
          {tab === 2 && <CrudSection section={SECTIONS[1]} />}
          {tab === 3 && <OurCompanySection />}
          {tab === 4 && <CrudSection section={SECTIONS[2]} />}
          {tab === 5 && <ContactSubmissions />}
          {tab === 6 && <JobApplications />}
        </Container>
      </Box>
    </>
  )
}