'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box, Tabs, Tab, Typography, Button, Table, TableHead, TableRow,
  TableCell, TableBody, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, AppBar, Toolbar,
  Container, Paper, CircularProgress, Alert, Snackbar,
  TableContainer, MenuItem, FormControlLabel, Checkbox,
  Collapse, Grid, TablePagination, InputAdornment, Chip,
} from '@mui/material'
import {
  Add, Edit, Delete, Business, Clear,
  KeyboardArrowDown, KeyboardArrowUp, Search, FileDownload,
} from '@mui/icons-material'
import {
  DndContext, closestCenter, KeyboardSensor,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext,
  sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'

// ========== Types ==========
type Row = Record<string, unknown>
interface Field { key: string; label: string; type?: 'text' | 'multiline' | 'select' | 'checkbox'; rows?: number; options?: string[] }
interface Section { id: string; label: string; endpoint: string; reorderEndpoint: string; fields: Field[]; columns: string[] }

// ========== Config ==========
const SECTIONS: Section[] = [
  {
    id: 'projects', label: 'Projects', endpoint: '/api/projects', reorderEndpoint: '/api/projects/reorder',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'image_url', label: 'Image URL' },
      { key: 'description', label: 'Description', type: 'multiline', rows: 3 },
      { key: 'video_url', label: 'Video URL' },
    ],
    columns: ['title', 'image_url', 'description', 'video_url'],
  },
  {
    id: 'products-services', label: 'Products & Services', endpoint: '/api/products-services', reorderEndpoint: '/api/products-services/reorder',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'image_url', label: 'Image URL' },
      { key: 'description', label: 'Description', type: 'multiline', rows: 3 },
      { key: 'video_url', label: 'Video URL' },
    ],
    columns: ['title', 'image_url', 'description', 'video_url'],
  },
  {
    id: 'clients', label: 'Clients', endpoint: '/api/clients', reorderEndpoint: '/api/clients/reorder',
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
    id: 'jobs', label: 'Jobs', endpoint: '/api/jobs', reorderEndpoint: '/api/jobs/reorder',
    fields: [
      { key: 'title', label: 'Job Title' },
      { key: 'description', label: 'Description', type: 'multiline', rows: 4 },
    ],
    columns: ['title', 'description'],
  },
]

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

// ========== Helpers ==========
const trunc = (s: unknown, n = 60) => {
  const str = String(s ?? '')
  return str.length > n ? str.slice(0, n) + '...' : str
}

const colLabel = (c: string) => c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

const fmtDate = (val: unknown): string => {
  if (!val) return ''
  const str = String(val)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str) || /^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str)
    if (!isNaN(d.getTime()))
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  return str
}

const exportToCSV = (data: Row[], filename: string) => {
  if (!data.length) return
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str) || /^\d{4}-\d{2}-\d{2}/.test(str)) {
      const d = new Date(str)
      if (!isNaN(d.getTime()))
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    }
    if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`
    return str
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

// ========== Shared Date Filter (reusable) ==========
function DateRangeFilter({
  dateFrom, dateTo,
  onFromChange, onToChange,
  onClear,
}: {
  dateFrom: Dayjs | null
  dateTo: Dayjs | null
  onFromChange: (v: Dayjs | null) => void
  onToChange: (v: Dayjs | null) => void
  onClear: () => void
}) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <DatePicker
          label="From"
          value={dateFrom}
          onChange={onFromChange}
          slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
        />
        <DatePicker
          label="To"
          value={dateTo}
          onChange={onToChange}
          slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
        />
        {(dateFrom || dateTo) && (
          <IconButton size="small" title="Clear dates" onClick={onClear}>
            <Clear fontSize="small" />
          </IconButton>
        )}
      </Box>
    </LocalizationProvider>
  )
}

// ========== Shared Search + Pagination Bar ==========
interface FilterBarProps {
  searchTerm: string
  onSearch: (v: string) => void
  totalFiltered: number
  totalAll: number
  page: number
  rowsPerPage: number
  onPageChange: (p: number) => void
  onRowsPerPageChange: (r: number) => void
  onExport: () => void
  extraFilters?: React.ReactNode
}

function FilterBar({
  searchTerm, onSearch, totalFiltered, totalAll,
  page, rowsPerPage, onPageChange, onRowsPerPageChange,
  onExport, extraFilters,
}: FilterBarProps) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
      <TextField
        size="small"
        placeholder="Search…"
        value={searchTerm}
        onChange={e => { onSearch(e.target.value); onPageChange(0) }}
        sx={{ width: 260 }}
        slotProps={{
          input: {
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
            endAdornment: searchTerm
              ? <InputAdornment position="end">
                  <IconButton size="small" onClick={() => { onSearch(''); onPageChange(0) }}>
                    <Clear fontSize="small" />
                  </IconButton>
                </InputAdornment>
              : null,
          },
        }}
      />

      {extraFilters}

      <Box sx={{ flex: 1 }} />

      {(searchTerm || totalFiltered !== totalAll) && totalFiltered !== totalAll && (
        <Chip
          size="small"
          label={`${totalFiltered} of ${totalAll} records`}
          color="primary"
          variant="outlined"
        />
      )}

      <Button
        size="small"
        variant="outlined"
        startIcon={<FileDownload />}
        onClick={onExport}
      >
        Export CSV
      </Button>

      <TablePagination
        component="div"
        count={totalFiltered}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        onPageChange={(_, p) => onPageChange(p)}
        onRowsPerPageChange={e => { onRowsPerPageChange(Number(e.target.value)); onPageChange(0) }}
        sx={{ '.MuiTablePagination-toolbar': { minHeight: 36, p: 0 }, border: 'none' }}
      />
    </Paper>
  )
}

// ========== Project Images Manager ==========
function ProjectImagesManager({ projectId }: { projectId: number }) {
  const [images, setImages] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [openAdd, setOpenAdd] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newCaption, setNewCaption] = useState('')
  const [snack, setSnack] = useState({ open: false, msg: '', ok: true })
  const notify = (msg: string, ok = true) => setSnack({ open: true, msg, ok })

  const loadImages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/images`)
      const data = await res.json()
      setImages(Array.isArray(data) ? data : [])
    } catch { setImages([]) } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { loadImages() }, [loadImages])

  const addImage = async () => {
    if (!newImageUrl.trim()) return notify('Image URL required', false)
    try {
      const res = await fetch(`/api/projects/${projectId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: newImageUrl, caption: newCaption }),
      })
      if (!res.ok) throw new Error()
      notify('Image added')
      setNewImageUrl(''); setNewCaption(''); setOpenAdd(false)
      loadImages()
    } catch { notify('Failed to add image', false) }
  }

  const deleteImage = async (imageId: number) => {
    if (!confirm('Delete this sub-image?')) return
    try {
      const res = await fetch(`/api/projects/${projectId}/images/${imageId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      notify('Image deleted')
      loadImages()
    } catch { notify('Failed to delete', false) }
  }

  return (
    <Box sx={{ p: 2, bgcolor: '#f5f8ff', borderTop: '1px solid #dde3f0' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1565C0' }}>
          Sub-Images for this Project
        </Typography>
        <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => setOpenAdd(true)}>
          Add Image
        </Button>
      </Box>

      {loading ? <CircularProgress size={20} /> : images.length === 0 ? (
        <Typography variant="body2" color="textSecondary">No sub-images yet.</Typography>
      ) : (
        <Grid container spacing={1.5}>
          {images.map(img => (
            <Grid key={String(img.id)} size="auto">
              <Box sx={{ position: 'relative', width: 100, height: 100, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden', bgcolor: '#fff' }}>
                <img src={String(img.image_url)} alt={String(img.caption || '')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <IconButton
                  size="small"
                  sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(255,255,255,0.85)', '&:hover': { bgcolor: '#ffebee' } }}
                  onClick={() => deleteImage(Number(img.id))}
                >
                  <Delete fontSize="small" color="error" />
                </IconButton>
              </Box>
              {String(img.caption) && (
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', maxWidth: 100, mt: 0.5 }}>
                  {trunc(img.caption, 20)}
                </Typography>
              )}
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1565C0', color: '#fff' }}>Add Sub-Image</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Image URL" fullWidth value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} autoFocus />
            <TextField label="Caption (optional)" fullWidth value={newCaption} onChange={e => setNewCaption(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenAdd(false); setNewImageUrl(''); setNewCaption('') }}>Cancel</Button>
          <Button variant="contained" onClick={addImage}>Add</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.ok ? 'success' : 'error'}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}

// ========== Sortable Table Row ==========
function SortableTableRow({
  row, columns, onEdit, onDelete, dragDisabled,
  expandable, expanded, onToggleExpand,
}: {
  row: Row; columns: string[]
  onEdit: (row: Row) => void; onDelete: (id: unknown) => void
  dragDisabled: boolean
  expandable?: boolean; expanded?: boolean; onToggleExpand?: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: Number(row.id), disabled: dragDisabled,
  })

  return (
    <>
      <TableRow
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
        sx={{ '&:hover': { bgcolor: '#f0f0f0' }, bgcolor: expanded ? '#e8f0fe' : 'inherit' }}
      >
        <TableCell
          sx={{ width: 32, cursor: dragDisabled ? 'not-allowed' : 'grab', color: dragDisabled ? '#ccc' : '#999', fontSize: 18, userSelect: 'none', px: 1 }}
          {...attributes} {...listeners}
          title={dragDisabled ? 'Clear search to reorder' : 'Drag to reorder'}
        >⠿</TableCell>

        {columns.map(c => (
          <TableCell key={c} sx={{ maxWidth: 220 }}>
            {trunc(row[c])}
          </TableCell>
        ))}

        <TableCell>
          <IconButton size="small" color="primary" onClick={() => onEdit(row)}><Edit fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => onDelete(row.id)}><Delete fontSize="small" /></IconButton>
          {expandable && (
            <IconButton
              size="small"
              onClick={() => onToggleExpand?.(Number(row.id))}
              title={expanded ? 'Hide sub-images' : 'Manage sub-images'}
              sx={{ color: expanded ? '#1565C0' : 'inherit' }}
            >
              {expanded ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
            </IconButton>
          )}
        </TableCell>
      </TableRow>

      {expandable && (
        <TableRow>
          <TableCell colSpan={columns.length + 2} sx={{ p: 0, border: expanded ? undefined : 'none' }}>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <ProjectImagesManager projectId={Number(row.id)} />
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ========== Generic CRUD Section ==========
function CrudSection({ section, expandable = false }: { section: Section; expandable?: boolean }) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form, setForm] = useState<Row>({})
  const [snack, setSnack] = useState({ open: false, msg: '', ok: true })
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const dragDisabled = searchTerm.trim() !== ''

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(section.endpoint)
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch { setRows([]) } finally { setLoading(false) }
  }, [section.endpoint])

  useEffect(() => { load() }, [load])

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows
    const term = searchTerm.toLowerCase()
    return rows.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(term)))
  }, [rows, searchTerm])

  const pagedRows = useMemo(() =>
    filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredRows, page, rowsPerPage]
  )

  const notify = (msg: string, ok = true) => setSnack({ open: true, msg, ok })
  const openAdd = () => { setEditing(null); setForm({}); setOpen(true) }
  const openEdit = (row: Row) => { setEditing(row); setForm({ ...row }); setOpen(true) }

  const save = async () => {
    try {
      const url = editing ? `${section.endpoint}/${editing.id}` : section.endpoint
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      notify(editing ? 'Updated' : 'Added')
      setOpen(false)
      load()
    } catch { notify('Something went wrong', false) }
  }

  const remove = async (id: unknown) => {
    if (!confirm('Delete this record?')) return
    try {
      await fetch(`${section.endpoint}/${id}`, { method: 'DELETE' })
      notify('Deleted')
      load()
    } catch { notify('Failed to delete', false) }
  }

  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    if (!over || String(active.id) === String(over.id)) return
    const oldIndex = rows.findIndex(r => Number(r.id) === Number(active.id))
    const newIndex = rows.findIndex(r => Number(r.id) === Number(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    const newOrder = arrayMove(rows, oldIndex, newIndex)
    setRows(newOrder)
    try {
      const res = await fetch(section.reorderEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: newOrder.map(r => Number(r.id)) }),
      })
      if (!res.ok) throw new Error()
      notify('Order updated')
    } catch { notify('Reorder failed — reverting', false); load() }
  }

  const renderField = (field: Field) => {
    const value = form[field.key] ?? ''
    const handleChange = (v: unknown) => setForm(p => ({ ...p, [field.key]: v }))
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

      <FilterBar
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        totalFiltered={filteredRows.length}
        totalAll={rows.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onExport={() => exportToCSV(filteredRows, section.id)}
      />

      {dragDisabled && (
        <Alert severity="info" sx={{ mb: 1, py: 0 }}>
          Clear the search to enable drag-and-drop reordering.
        </Alert>
      )}

      {loading ? <CircularProgress /> : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={rows.map(r => Number(r.id))} strategy={verticalListSortingStrategy}>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#1565C0' }}>
                    <TableCell sx={{ color: '#fff', width: 32 }} />
                    {section.columns.map(c => (
                      <TableCell key={c} sx={{ color: '#fff', fontWeight: 700 }}>{colLabel(c)}</TableCell>
                    ))}
                    <TableCell sx={{ color: '#fff', fontWeight: 700, width: expandable ? 130 : 90 }}>
                      Actions{expandable ? ' / Images' : ''}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={section.columns.length + 2} align="center">No records found</TableCell>
                    </TableRow>
                  ) : pagedRows.map(row => (
                    <SortableTableRow
                      key={Number(row.id)}
                      row={row}
                      columns={section.columns}
                      onEdit={openEdit}
                      onDelete={remove}
                      dragDisabled={dragDisabled}
                      expandable={expandable}
                      expanded={expandedId === Number(row.id)}
                      onToggleExpand={id => setExpandedId(prev => prev === id ? null : id)}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1565C0', color: '#fff' }}>
          {editing ? `Edit ${section.label}` : `Add ${section.label}`}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {section.fields.map(f => renderField(f))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>{editing ? 'Update' : 'Add'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.ok ? 'success' : 'error'}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}

// ========== Our Company Section ==========
function OurCompanySection() {
  const [sections, setSections] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [compForm, setCompForm] = useState({ cover_pic: '', description: '' })
  const [secOpen, setSecOpen] = useState(false)
  const [editSec, setEditSec] = useState<Row | null>(null)
  const [secForm, setSecForm] = useState({ title: '', description: '', image_url: '' })
  const [snack, setSnack] = useState({ open: false, msg: '', ok: true })
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const notify = (msg: string, ok = true) => setSnack({ open: true, msg, ok })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/our-company')
      const data = await res.json()
      setSections(data.sections || [])
      setCompForm({ cover_pic: String(data.cover_pic ?? ''), description: String(data.description ?? '') })
    } catch { } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const filteredSections = useMemo(() => {
    if (!searchTerm) return sections
    const term = searchTerm.toLowerCase()
    return sections.filter(s => Object.values(s).some(v => String(v).toLowerCase().includes(term)))
  }, [sections, searchTerm])

  const pagedSections = useMemo(() =>
    filteredSections.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredSections, page, rowsPerPage]
  )

  const saveCompany = async () => {
    try {
      await fetch('/api/our-company', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(compForm) })
      notify('Company info saved'); load()
    } catch { notify('Failed to save', false) }
  }

  const openAddSec = () => { setEditSec(null); setSecForm({ title: '', description: '', image_url: '' }); setSecOpen(true) }
  const openEditSec = (s: Row) => {
    setEditSec(s)
    setSecForm({ title: String(s.title ?? ''), description: String(s.description ?? ''), image_url: String(s.image_url ?? '') })
    setSecOpen(true)
  }
  const saveSec = async () => {
    try {
      const url = editSec ? `/api/our-company/sections/${editSec.id}` : '/api/our-company/sections'
      await fetch(url, { method: editSec ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(secForm) })
      notify(editSec ? 'Section updated' : 'Section added')
      setSecOpen(false); load()
    } catch { notify('Failed', false) }
  }
  const deleteSec = async (id: unknown) => {
    if (!confirm('Delete this section?')) return
    await fetch(`/api/our-company/sections/${id}`, { method: 'DELETE' })
    notify('Section deleted'); load()
  }

  if (loading) return <CircularProgress />
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>Our Company</Typography>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Cover Picture URL" fullWidth value={compForm.cover_pic} onChange={e => setCompForm(p => ({ ...p, cover_pic: e.target.value }))} />
          <TextField label="Description" fullWidth multiline rows={4} value={compForm.description} onChange={e => setCompForm(p => ({ ...p, description: e.target.value }))} />
          <Button variant="contained" onClick={saveCompany} sx={{ alignSelf: 'flex-start' }}>Save Company Info</Button>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>Sections</Typography>
        <Button variant="contained" size="small" startIcon={<Add />} onClick={openAddSec}>Add Section</Button>
      </Box>

      <FilterBar
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        totalFiltered={filteredSections.length}
        totalAll={sections.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onExport={() => exportToCSV(filteredSections, 'our-company-sections')}
      />

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#1565C0' }}>
              {['Title', 'Description', 'Image URL', 'Actions'].map(h => (
                <TableCell key={h} sx={{ color: '#fff', fontWeight: 700 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedSections.length === 0 ? (
              <TableRow><TableCell colSpan={4} align="center">No records found</TableCell></TableRow>
            ) : pagedSections.map((s, i) => (
              <TableRow key={String(s.id)} sx={{ bgcolor: i % 2 === 0 ? '#fff' : '#f5f8ff' }}>
                <TableCell>{trunc(s.title, 40)}</TableCell>
                <TableCell>{trunc(s.description)}</TableCell>
                <TableCell>{trunc(s.image_url)}</TableCell>
                <TableCell>
                  <IconButton size="small" color="primary" onClick={() => openEditSec(s)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => deleteSec(s.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={secOpen} onClose={() => setSecOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1565C0', color: '#fff' }}>{editSec ? 'Edit Section' : 'Add Section'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Title" fullWidth value={secForm.title} onChange={e => setSecForm(p => ({ ...p, title: e.target.value }))} />
            <TextField label="Description" fullWidth multiline rows={3} value={secForm.description} onChange={e => setSecForm(p => ({ ...p, description: e.target.value }))} />
            <TextField label="Image URL" fullWidth value={secForm.image_url} onChange={e => setSecForm(p => ({ ...p, image_url: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSecOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveSec}>{editSec ? 'Update' : 'Add'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.ok ? 'success' : 'error'}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}

// ========== Contact Submissions ==========
function ContactSubmissions() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState<Dayjs | null>(null)
  const [dateTo, setDateTo] = useState<Dayjs | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/contact-submissions')
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch { setRows([]) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const filteredRows = useMemo(() => {
    let result = rows
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(term)))
    }
    if (dateFrom) {
      result = result.filter(row => dayjs(String(row.created_at)).isAfter(dateFrom.startOf('day').subtract(1, 'ms')))
    }
    if (dateTo) {
      result = result.filter(row => dayjs(String(row.created_at)).isBefore(dateTo.endOf('day').add(1, 'ms')))
    }
    return result
  }, [rows, searchTerm, dateFrom, dateTo])

  const pagedRows = useMemo(() =>
    filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredRows, page, rowsPerPage]
  )

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>Contact Submissions</Typography>

      <FilterBar
        searchTerm={searchTerm}
        onSearch={v => { setSearchTerm(v); setPage(0) }}
        totalFiltered={filteredRows.length}
        totalAll={rows.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={v => { setRowsPerPage(v); setPage(0) }}
        onExport={() => exportToCSV(filteredRows, 'contact_submissions')}
        extraFilters={
          <DateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onFromChange={v => { setDateFrom(v); setPage(0) }}
            onToChange={v => { setDateTo(v); setPage(0) }}
            onClear={() => { setDateFrom(null); setDateTo(null); setPage(0) }}
          />
        }
      />

      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#1565C0' }}>
                {['ID', 'Name', 'Email', 'Subject', 'Message', 'Date'].map(h => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 700 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedRows.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">No records found</TableCell></TableRow>
              ) : pagedRows.map(row => (
                <TableRow key={String(row.id)}>
                  <TableCell>{String(row.id)}</TableCell>
                  <TableCell>{String(row.name ?? '')}</TableCell>
                  <TableCell>{String(row.email ?? '')}</TableCell>
                  <TableCell>{String(row.subject ?? '-')}</TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>{trunc(row.message, 80)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(row.created_at)}</TableCell>
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
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState<Dayjs | null>(null)
  const [dateTo, setDateTo] = useState<Dayjs | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/job-applications')
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch { setRows([]) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const filteredRows = useMemo(() => {
    let result = rows
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(term)))
    }
    if (dateFrom) {
      result = result.filter(row => dayjs(String(row.created_at)).isAfter(dateFrom.startOf('day').subtract(1, 'ms')))
    }
    if (dateTo) {
      result = result.filter(row => dayjs(String(row.created_at)).isBefore(dateTo.endOf('day').add(1, 'ms')))
    }
    return result
  }, [rows, searchTerm, dateFrom, dateTo])

  const pagedRows = useMemo(() =>
    filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredRows, page, rowsPerPage]
  )

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>Job Applications</Typography>

      <FilterBar
        searchTerm={searchTerm}
        onSearch={v => { setSearchTerm(v); setPage(0) }}
        totalFiltered={filteredRows.length}
        totalAll={rows.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={v => { setRowsPerPage(v); setPage(0) }}
        onExport={() => exportToCSV(filteredRows, 'job_applications')}
        extraFilters={
          <DateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onFromChange={v => { setDateFrom(v); setPage(0) }}
            onToChange={v => { setDateTo(v); setPage(0) }}
            onClear={() => { setDateFrom(null); setDateTo(null); setPage(0) }}
          />
        }
      />

      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#1565C0' }}>
                {['ID', 'Full Name', 'Email', 'Phone', 'Job Title', 'Cover Letter', 'Resume', 'Date'].map(h => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 700 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedRows.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center">No records found</TableCell></TableRow>
              ) : pagedRows.map(row => (
                <TableRow key={String(row.id)}>
                  <TableCell>{String(row.id)}</TableCell>
                  <TableCell>{String(row.full_name ?? '')}</TableCell>
                  <TableCell>{String(row.email ?? '')}</TableCell>
                  <TableCell>{String(row.phone ?? '-')}</TableCell>
                  <TableCell>{String(row.job_title ?? '-')}</TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>{trunc(row.cover_letter, 60)}</TableCell>
                  <TableCell>
                    {row.resume_url
                      ? <a href={String(row.resume_url)} target="_blank" rel="noreferrer">Link</a>
                      : '-'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(row.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
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
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Loxon Philippines, Inc. — Landing Page Configuration
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ bgcolor: '#1565C0', borderBottom: '3px solid #0d47a1' }}>
        <Container maxWidth="xl">
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            textColor="inherit"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTabs-indicator': { backgroundColor: '#fff', height: 3 },
              '& .MuiTab-root': { color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'none', fontSize: 14 },
              '& .Mui-selected': { color: '#fff' },
            }}
          >
            {TABS.map(t => <Tab key={t} label={t} />)}
          </Tabs>
        </Container>
      </Box>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {tab === 0 && <CrudSection section={SECTIONS[0]} expandable={true} />}
          {tab === 1 && <CrudSection section={SECTIONS[1]} />}
          {tab === 2 && <CrudSection section={SECTIONS[2]} />}
          {tab === 3 && <OurCompanySection />}
          {tab === 4 && <CrudSection section={SECTIONS[3]} />}
          {tab === 5 && <ContactSubmissions />}
          {tab === 6 && <JobApplications />}
        </Container>
      </Box>
    </>
  )
}