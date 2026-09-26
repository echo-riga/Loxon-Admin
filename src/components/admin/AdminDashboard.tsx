'use client'
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/refs */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert, AppBar, Box, Button, Chip, CircularProgress, Collapse, Container, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, InputAdornment, MenuItem, Paper, Snackbar, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Tabs, TextField,
  Toolbar, Tooltip, Typography,
} from '@mui/material'
import {
  Add, Business, Clear, Delete, Edit, FileDownload, FilterAltOff, ImageOutlined,
  KeyboardArrowDown, KeyboardArrowUp, Search,
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ImageUploadField from './ImageUploadField'

type Row = Record<string, unknown>
type Field = { key: string; label: string; type?: 'text' | 'multiline' | 'select' | 'date' | 'image'; options?: string[]; required?: boolean }
type Section = { id: string; label: string; singular: string; endpoint: string; fields: Field[]; columns: string[]; search: string[] }
type Notice = { open: boolean; message: string; severity: 'success' | 'error' }

const SECTIONS: Section[] = [
  { id: 'projects', label: 'Projects', singular: 'project', endpoint: '/api/projects', search: ['title', 'description', 'location', 'client_name', 'project_type'], columns: ['image_url', 'title', 'description', 'project_type', 'constructed_date', 'location', 'client_name'], fields: [
    { key: 'title', label: 'Title', required: true }, { key: 'image_url', label: 'Main image', type: 'image' },
    { key: 'description', label: 'Description', type: 'multiline' }, { key: 'video_url', label: 'Video URL' },
    { key: 'project_type', label: 'Project type' }, { key: 'constructed_date', label: 'Constructed date', type: 'date' },
    { key: 'location', label: 'Location' }, { key: 'client_name', label: 'Client name' },
  ]},
  { id: 'products-services', label: 'Products & Services', singular: 'product or service', endpoint: '/api/products-services', search: ['title', 'description', 'video_url'], columns: ['image_url', 'title', 'description', 'video_url'], fields: [
    { key: 'title', label: 'Title', required: true }, { key: 'image_url', label: 'Image', type: 'image' },
    { key: 'description', label: 'Description', type: 'multiline' }, { key: 'video_url', label: 'Video URL' },
  ]},
  { id: 'clients', label: 'Clients', singular: 'client', endpoint: '/api/clients', search: ['title', 'description', 'link'], columns: ['image_url', 'title', 'description', 'link', 'entity_type'], fields: [
    { key: 'title', label: 'Company name', required: true }, { key: 'image_url', label: 'Logo or image', type: 'image' },
    { key: 'description', label: 'Description', type: 'multiline' }, { key: 'link', label: 'Website link' },
    { key: 'entity_type', label: 'Entity type', type: 'select', options: ['membership', 'partner'] },
  ]},
  { id: 'jobs', label: 'Jobs', singular: 'job', endpoint: '/api/jobs', search: ['title', 'description'], columns: ['title', 'description'], fields: [
    { key: 'title', label: 'Job title', required: true }, { key: 'description', label: 'Description', type: 'multiline' },
  ]},
]

const TAB_LABELS = ['Projects', 'Products & Services', 'Clients', 'Jobs', 'Contact Submissions', 'Job Applications']
const ROWS_PER_PAGE = [10, 25, 50, 100]
const normalize = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase()
const hasValue = (value: unknown) => Boolean(String(value ?? '').trim())
const labelFor = (key: string) => key.replaceAll('_', ' ').replace(/\b\w/g, value => value.toUpperCase())
const formatDate = (value: unknown) => value && dayjs(String(value)).isValid() ? dayjs(String(value)).format('MMM D, YYYY') : '—'

async function apiError(response: Response) {
  try { const body = await response.json() as { error?: string }; return body.error || `Request failed (${response.status})` }
  catch { return `Request failed (${response.status})` }
}

function exportCsv(rows: Row[], filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0]).filter(key => key !== 'images')
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const blob = new Blob([[headers.join(','), ...rows.map(row => headers.map(key => quote(row[key])).join(','))].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${filename}.csv`; anchor.click(); URL.revokeObjectURL(url)
}

function Thumbnail({ src, alt }: { src: unknown; alt: string }) {
  const [broken, setBroken] = useState(false)
  if (!hasValue(src) || broken) return <Box aria-label="No image" sx={{ width: 58, height: 44, borderRadius: 1, bgcolor: '#eef2f7', color: '#8190a5', display: 'grid', placeItems: 'center' }}><ImageOutlined fontSize="small" /></Box>
  return <Box component="img" src={String(src)} alt={alt} onError={() => setBroken(true)} sx={{ width: 58, height: 44, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider', display: 'block' }} />
}

function EmptyRow({ columns, filtered, message }: { columns: number; filtered: boolean; message?: string }) {
  return <TableRow><TableCell colSpan={columns} align="center" sx={{ py: 8 }}><Box sx={{ color: 'text.secondary' }}><FilterAltOff sx={{ fontSize: 34, mb: 1 }} /><Typography variant="subtitle2">{message || (filtered ? 'No records match these filters' : 'No records yet')}</Typography><Typography variant="body2">{filtered ? 'Clear or adjust the filters to see more results.' : 'Add the first record to get started.'}</Typography></Box></TableCell></TableRow>
}

type ToolbarProps = { search: string; onSearch: (value: string) => void; active: boolean; onClear: () => void; count: number; total: number; children?: React.ReactNode; onExport: () => void }
function FilterToolbar({ search, onSearch, active, onClear, count, total, children, onExport }: ToolbarProps) {
  return <Paper variant="outlined" sx={{ p: { xs: 1.25, md: 1.5 }, mb: 2, borderRadius: 2.5 }}>
    <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
      <TextField value={search} onChange={event => onSearch(event.target.value)} placeholder="Search this section" aria-label="Search this section" sx={{ minWidth: { xs: '100%', sm: 270 }, flex: { sm: '1 1 270px', md: '0 1 330px' } }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>, endAdornment: search ? <InputAdornment position="end"><IconButton aria-label="Clear search" size="small" onClick={() => onSearch('')}><Clear fontSize="small" /></IconButton></InputAdornment> : undefined } }} />
      {children}
      <Box sx={{ flexGrow: 1 }} />
      <Button variant="outlined" size="small" startIcon={<FileDownload />} onClick={onExport} disabled={!count}>Export CSV</Button>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: active ? 1.25 : 0, flexWrap: 'wrap' }}>
      {active && <><Chip color="primary" variant="outlined" size="small" label={`Filters active · ${count} of ${total}`} /><Button size="small" startIcon={<FilterAltOff />} onClick={onClear}>Clear all</Button></>}
    </Box>
  </Paper>
}

function ResponsivePagination({ count, page, perPage, setPage, setPerPage }: { count: number; page: number; perPage: number; setPage: (value: number) => void; setPerPage: (value: number) => void }) {
  return <Box sx={{ overflowX: 'auto' }}><TablePagination component="div" count={count} page={Math.min(page, Math.max(0, Math.ceil(count / perPage) - 1))} rowsPerPage={perPage} rowsPerPageOptions={ROWS_PER_PAGE} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={event => { setPerPage(Number(event.target.value)); setPage(0) }} sx={{ minWidth: 360, '.MuiTablePagination-toolbar': { px: { xs: 0.5, sm: 2 } } }} /></Box>
}

function ProjectImages({ projectId }: { projectId: number }) {
  const [rows, setRows] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [open, setOpen] = useState(false)
  const [url, setUrl] = useState(''); const [caption, setCaption] = useState(''); const [notice, setNotice] = useState<Notice>({ open: false, message: '', severity: 'success' })
  const load = useCallback(async () => { setLoading(true); try { const response = await fetch(`/api/projects/${projectId}/images`); if (!response.ok) throw new Error(await apiError(response)); const body = await response.json(); setRows(Array.isArray(body) ? body : []) } catch (error) { setNotice({ open: true, message: error instanceof Error ? error.message : 'Unable to load images.', severity: 'error' }) } finally { setLoading(false) } }, [projectId])
  useEffect(() => { void load() }, [load])
  const add = async () => { if (!url) return; try { const response = await fetch(`/api/projects/${projectId}/images`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_url: url, caption }) }); if (!response.ok) throw new Error(await apiError(response)); setOpen(false); setUrl(''); setCaption(''); await load() } catch (error) { setNotice({ open: true, message: error instanceof Error ? error.message : 'Unable to add image.', severity: 'error' }) } }
  const remove = async (id: unknown) => { if (!confirm('Delete this project image?')) return; const response = await fetch(`/api/projects/${projectId}/images/${id}`, { method: 'DELETE' }); if (!response.ok) return setNotice({ open: true, message: await apiError(response), severity: 'error' }); await load() }
  return <Box sx={{ p: { xs: 1.5, md: 2 }, bgcolor: '#f6f9fd' }}><Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', mb: 1.5 }}><Typography variant="subtitle2">Project gallery</Typography><Button size="small" startIcon={<Add />} onClick={() => setOpen(true)}>Upload image</Button></Box>
    {loading ? <CircularProgress size={24} /> : rows.length ? <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>{rows.map(row => <Box key={String(row.id)} sx={{ width: 112 }}><Box sx={{ position: 'relative' }}><Box component="img" src={String(row.image_url)} alt={String(row.caption || 'Project image')} sx={{ width: 112, height: 82, objectFit: 'cover', borderRadius: 1.25 }} /><Tooltip title="Delete image"><IconButton size="small" aria-label="Delete image" onClick={() => void remove(row.id)} sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'white', '&:hover': { bgcolor: '#fee2e2' } }}><Delete fontSize="small" color="error" /></IconButton></Tooltip></Box><Typography variant="caption" title={String(row.caption || '')} sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(row.caption || 'No caption')}</Typography></Box>)}</Box> : <Typography variant="body2" color="text.secondary">No gallery images yet.</Typography>}
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Add project image</DialogTitle><DialogContent sx={{ display: 'grid', gap: 2, pt: '16px !important' }}><ImageUploadField label="Image" value={url} onChange={setUrl} required /><TextField label="Caption (optional)" value={caption} onChange={event => setCaption(event.target.value)} /></DialogContent><DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" disabled={!url} onClick={() => void add()}>Add image</Button></DialogActions></Dialog>
    <Snackbar open={notice.open} autoHideDuration={4000} onClose={() => setNotice(value => ({ ...value, open: false }))}><Alert severity={notice.severity}>{notice.message}</Alert></Snackbar>
  </Box>
}

function SortableProjectRow({ row, columns, fields, disabled, expanded, onExpand, onEdit, onDelete }: { row: Row; columns: string[]; fields: Field[]; disabled: boolean; expanded: boolean; onExpand: () => void; onEdit: () => void; onDelete: () => void }) {
  const sortable = useSortable({ id: Number(row.id), disabled })
  return <><TableRow ref={sortable.setNodeRef} style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition, opacity: sortable.isDragging ? 0.5 : 1 }} hover>
    <TableCell sx={{ width: 38 }}><Tooltip title={disabled ? 'Reorder is available when filters are clear and all rows are shown.' : 'Drag to reorder'}><Box component="span" {...sortable.attributes} {...sortable.listeners} sx={{ cursor: disabled ? 'not-allowed' : 'grab', color: disabled ? 'text.disabled' : 'text.secondary', fontSize: 20 }}>⋮⋮</Box></Tooltip></TableCell>
    {columns.map(column => <DataCell key={column} column={column} value={row[column]} row={row} field={fields.find(field => field.key === column)} />)}
    <ActionCell><Tooltip title="Edit"><IconButton aria-label="Edit" size="small" color="primary" onClick={onEdit}><Edit fontSize="small" /></IconButton></Tooltip><Tooltip title="Delete"><IconButton aria-label="Delete" size="small" color="error" onClick={onDelete}><Delete fontSize="small" /></IconButton></Tooltip><Tooltip title={expanded ? 'Hide gallery' : 'Manage gallery'}><IconButton aria-label="Manage project gallery" size="small" onClick={onExpand}>{expanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}</IconButton></Tooltip></ActionCell>
  </TableRow><TableRow><TableCell colSpan={columns.length + 2} sx={{ p: 0, border: expanded ? undefined : 0 }}><Collapse in={expanded} unmountOnExit><ProjectImages projectId={Number(row.id)} /></Collapse></TableCell></TableRow></>
}

function DataCell({ column, value, row, field }: { column: string; value: unknown; row: Row; field?: Field }) {
  if (column === 'image_url') return <TableCell><Thumbnail src={value} alt={`${String(row.title || 'Record')} thumbnail`} /></TableCell>
  const text = field?.type === 'date' ? formatDate(value) : String(value || '—')
  if (column === 'link' || column === 'video_url') return <TableCell sx={{ maxWidth: 180 }}><Typography component={hasValue(value) ? 'a' : 'span'} href={hasValue(value) ? String(value) : undefined} target="_blank" rel="noreferrer" variant="body2" title={text} sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: hasValue(value) ? 'primary.main' : 'text.secondary' }}>{hasValue(value) ? 'Open link' : '—'}</Typography></TableCell>
  return <TableCell sx={{ minWidth: column === 'description' ? 240 : 130, maxWidth: column === 'description' ? 360 : 220 }}><Typography variant="body2" title={text} sx={{ display: '-webkit-box', WebkitLineClamp: column === 'description' ? 3 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>{text}</Typography></TableCell>
}

function ActionCell({ children }: { children: React.ReactNode }) { return <TableCell sx={{ position: { xs: 'static', sm: 'sticky' }, right: { sm: 0 }, bgcolor: 'background.paper', boxShadow: { xs: 'none', sm: '-8px 0 12px -12px rgba(15,40,72,.45)' }, whiteSpace: 'nowrap', width: { xs: 'auto', sm: 110 }, zIndex: { sm: 1 } }}>{children}</TableCell> }

function CrudSection({ section, project = false }: { section: Section; project?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const [search, setSearch] = useState(''); const [filters, setFilters] = useState<Record<string, string>>({}); const [page, setPage] = useState(0); const [perPage, setPerPage] = useState(10)
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Row | null>(null); const [form, setForm] = useState<Row>({}); const [expanded, setExpanded] = useState<number | null>(null)
  const [notice, setNotice] = useState<Notice>({ open: false, message: '', severity: 'success' }); const sensors = useSensors(useSensor(PointerSensor))
  const load = useCallback(async () => { setLoading(true); setError(''); try { const response = await fetch(section.endpoint); if (!response.ok) throw new Error(await apiError(response)); const body = await response.json(); setRows(Array.isArray(body) ? body : []) } catch (cause) { setRows([]); setError(cause instanceof Error ? cause.message : 'Unable to load records.') } finally { setLoading(false) } }, [section.endpoint])
  useEffect(() => { void load() }, [load])
  useEffect(() => { setPage(0) }, [search, filters])
  useEffect(() => { const last = Math.max(0, Math.ceil(rows.length / perPage) - 1); setPage(value => Math.min(value, last)) }, [rows.length, perPage])
  const values = (key: string) => [...new Set(rows.map(row => String(row[key] || '').trim()).filter(Boolean))].sort()
  const filtered = useMemo(() => rows.filter(row => {
    const term = normalize(search); if (term && !section.search.some(key => normalize(row[key]).includes(term))) return false
    if (section.id === 'projects') { if (filters.type && String(row.project_type) !== filters.type) return false; if (filters.location && String(row.location) !== filters.location) return false; if (filters.year && dayjs(String(row.constructed_date)).format('YYYY') !== filters.year) return false }
    if (section.id === 'products-services') { const image = hasValue(row.image_url), video = hasValue(row.video_url); if (filters.media === 'image' && !image) return false; if (filters.media === 'video' && !video) return false; if (filters.media === 'both' && !(image && video)) return false; if (filters.media === 'none' && (image || video)) return false }
    if (section.id === 'clients') { if (filters.entity && String(row.entity_type) !== filters.entity) return false; if (filters.image === 'yes' && !hasValue(row.image_url)) return false; if (filters.image === 'no' && hasValue(row.image_url)) return false; if (filters.link === 'yes' && !hasValue(row.link)) return false; if (filters.link === 'no' && hasValue(row.link)) return false }
    return true
  }), [rows, search, filters, section])
  const active = Boolean(search.trim() || Object.values(filters).some(Boolean)); const paged = filtered.slice(page * perPage, page * perPage + perPage)
  const canReorder = project && !active && page === 0 && perPage >= rows.length
  const openForm = (row?: Row) => { setEditing(row || null); setForm(row ? { ...row } : {}); setOpen(true) }
  const save = async () => { try { const response = await fetch(editing ? `${section.endpoint}/${editing.id}` : section.endpoint, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); if (!response.ok) throw new Error(await apiError(response)); setOpen(false); setNotice({ open: true, message: `${section.singular[0].toUpperCase()}${section.singular.slice(1)} ${editing ? 'updated' : 'added'}.`, severity: 'success' }); await load() } catch (cause) { setNotice({ open: true, message: cause instanceof Error ? cause.message : 'Unable to save.', severity: 'error' }) } }
  const remove = async (row: Row) => { if (!confirm(`Delete “${String(row.title || 'this record')}”?`)) return; const response = await fetch(`${section.endpoint}/${row.id}`, { method: 'DELETE' }); if (!response.ok) return setNotice({ open: true, message: await apiError(response), severity: 'error' }); setNotice({ open: true, message: 'Record deleted.', severity: 'success' }); await load() }
  const onDragEnd = async ({ active: source, over }: DragEndEvent) => { if (!canReorder || !over || source.id === over.id) return; const oldIndex = rows.findIndex(row => Number(row.id) === source.id), newIndex = rows.findIndex(row => Number(row.id) === over.id); const reordered = arrayMove(rows, oldIndex, newIndex); setRows(reordered); const response = await fetch('/api/projects/reorder', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderedIds: reordered.map(row => row.id) }) }); if (!response.ok) { setNotice({ open: true, message: await apiError(response), severity: 'error' }); await load() } }
  const renderField = (field: Field) => field.type === 'image' ? <ImageUploadField key={field.key} label={field.label} value={String(form[field.key] || '')} onChange={value => setForm(previous => ({ ...previous, [field.key]: value }))} /> : field.type === 'select' ? <TextField key={field.key} select label={field.label} value={String(form[field.key] || '')} onChange={event => setForm(previous => ({ ...previous, [field.key]: event.target.value }))}>{field.options?.map(option => <MenuItem key={option} value={option}>{labelFor(option)}</MenuItem>)}</TextField> : <TextField key={field.key} required={field.required} type={field.type === 'date' ? 'date' : 'text'} label={field.label} multiline={field.type === 'multiline'} minRows={field.type === 'multiline' ? 3 : undefined} value={String(form[field.key] || '')} onChange={event => setForm(previous => ({ ...previous, [field.key]: event.target.value }))} slotProps={field.type === 'date' ? { inputLabel: { shrink: true } } : undefined} />
  return <SectionShell title={section.label} count={rows.length} action={<Button variant="contained" startIcon={<Add />} onClick={() => openForm()}>Add {section.singular}</Button>}>
    <FilterToolbar search={search} onSearch={setSearch} active={active} onClear={() => { setSearch(''); setFilters({}) }} count={filtered.length} total={rows.length} onExport={() => exportCsv(filtered, section.id)}>{section.id === 'projects' && <><FilterSelect label="Project type" value={filters.type} options={values('project_type')} onChange={value => setFilters(current => ({ ...current, type: value }))} /><FilterSelect label="Location" value={filters.location} options={values('location')} onChange={value => setFilters(current => ({ ...current, location: value }))} /><FilterSelect label="Year" value={filters.year} options={[...new Set(rows.map(row => dayjs(String(row.constructed_date)).isValid() ? dayjs(String(row.constructed_date)).format('YYYY') : '').filter(Boolean))].sort().reverse()} onChange={value => setFilters(current => ({ ...current, year: value }))} /></>}{section.id === 'products-services' && <FilterSelect label="Media" value={filters.media} options={['image', 'video', 'both', 'none']} onChange={value => setFilters(current => ({ ...current, media: value }))} />}{section.id === 'clients' && <><FilterSelect label="Entity type" value={filters.entity} options={values('entity_type')} onChange={value => setFilters(current => ({ ...current, entity: value }))} /><FilterSelect label="Image" value={filters.image} options={['yes', 'no']} onChange={value => setFilters(current => ({ ...current, image: value }))} /><FilterSelect label="Link" value={filters.link} options={['yes', 'no']} onChange={value => setFilters(current => ({ ...current, link: value }))} /></>}</FilterToolbar>
    {project && !canReorder && <Alert severity="info" sx={{ mb: 2 }}>To reorder projects, clear filters, go to the first page, and show all {rows.length} records.</Alert>}
    {error ? <Alert severity="error" action={<Button onClick={() => void load()}>Retry</Button>}>{error}</Alert> : loading ? <LoadingState /> : <>
      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' }, mb: 0.75 }}>
        Swipe horizontally to view every column and row action.
      </Typography>
      {project ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={rows.map(row => Number(row.id))} strategy={verticalListSortingStrategy}>
            <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: '100%', overflowX: 'auto', borderRadius: 2.5 }}>
              <Table stickyHeader size="small" sx={{ minWidth: 1180 }}>
                <TableHead><TableRow><HeaderCell />{section.columns.map(column => <HeaderCell key={column}>{labelFor(column === 'image_url' ? 'image' : column)}</HeaderCell>)}<HeaderCell sticky>Actions</HeaderCell></TableRow></TableHead>
                <TableBody>{!paged.length ? <EmptyRow columns={section.columns.length + 2} filtered={active} /> : paged.map(row => <SortableProjectRow key={String(row.id)} row={row} columns={section.columns} fields={section.fields} disabled={!canReorder} expanded={expanded === Number(row.id)} onExpand={() => setExpanded(value => value === Number(row.id) ? null : Number(row.id))} onEdit={() => openForm(row)} onDelete={() => void remove(row)} />)}</TableBody>
              </Table>
            </TableContainer>
          </SortableContext>
        </DndContext>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: '100%', overflowX: 'auto', borderRadius: 2.5 }}>
          <Table stickyHeader size="small" sx={{ minWidth: section.id === 'jobs' ? 650 : 850 }}>
            <TableHead><TableRow>{section.columns.map(column => <HeaderCell key={column}>{labelFor(column === 'image_url' ? 'image' : column)}</HeaderCell>)}<HeaderCell sticky>Actions</HeaderCell></TableRow></TableHead>
            <TableBody>{!paged.length ? <EmptyRow columns={section.columns.length + 1} filtered={active} /> : paged.map(row => <TableRow key={String(row.id)} hover>{section.columns.map(column => <DataCell key={column} column={column} value={row[column]} row={row} field={section.fields.find(field => field.key === column)} />)}<ActionCell><Tooltip title="Edit"><IconButton aria-label="Edit" size="small" color="primary" onClick={() => openForm(row)}><Edit fontSize="small" /></IconButton></Tooltip><Tooltip title="Delete"><IconButton aria-label="Delete" size="small" color="error" onClick={() => void remove(row)}><Delete fontSize="small" /></IconButton></Tooltip></ActionCell></TableRow>)}</TableBody>
          </Table>
        </TableContainer>
      )}
      <ResponsivePagination count={filtered.length} page={page} perPage={perPage} setPage={setPage} setPerPage={setPerPage} />
    </>}
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm"><DialogTitle>{editing ? 'Edit' : 'Add'} {section.singular}</DialogTitle><DialogContent sx={{ display: 'grid', gap: 2, pt: '18px !important' }}>{section.fields.map(renderField)}</DialogContent><DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={() => void save()}>{editing ? 'Save changes' : 'Add record'}</Button></DialogActions></Dialog>
    <Snackbar open={notice.open} autoHideDuration={4000} onClose={() => setNotice(value => ({ ...value, open: false }))}><Alert severity={notice.severity}>{notice.message}</Alert></Snackbar>
  </SectionShell>
}

function FilterSelect({ label, value = '', options, onChange }: { label: string; value?: string; options: string[]; onChange: (value: string) => void }) { return <TextField select label={label} value={value} onChange={event => onChange(event.target.value)} sx={{ minWidth: { xs: 'calc(50% - 6px)', sm: 140 } }}><MenuItem value="">All</MenuItem>{options.map(option => <MenuItem key={option} value={option}>{labelFor(option)}</MenuItem>)}</TextField> }
function HeaderCell({ children, sticky = false }: { children?: React.ReactNode; sticky?: boolean }) { return <TableCell sx={{ bgcolor: '#123f77 !important', color: 'white', fontWeight: 750, whiteSpace: 'nowrap', ...(sticky ? { position: { xs: 'static', sm: 'sticky' }, right: { sm: 0 }, zIndex: { sm: 4 } } : {}) }}>{children}</TableCell> }
function LoadingState() { return <Paper variant="outlined" sx={{ minHeight: 240, display: 'grid', placeItems: 'center', borderRadius: 2.5 }}><Box sx={{ textAlign: 'center' }}><CircularProgress size={32} /><Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>Loading records…</Typography></Box></Paper> }
function SectionShell({ title, count, action, children }: { title: string; count: number; action?: React.ReactNode; children: React.ReactNode }) { return <Box><Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, mb: 2.5 }}><Box><Typography variant="h5" component="h1">{title}</Typography><Typography variant="body2" color="text.secondary">{count} {count === 1 ? 'record' : 'records'} in this section</Typography></Box>{action}</Box>{children}</Box> }

function DateFilters({ from, to, setFrom, setTo }: { from: Dayjs | null; to: Dayjs | null; setFrom: (value: Dayjs | null) => void; setTo: (value: Dayjs | null) => void }) { return <LocalizationProvider dateAdapter={AdapterDayjs}><DatePicker label="From" value={from} onChange={setFrom} slotProps={{ textField: { sx: { width: { xs: 'calc(50% - 6px)', sm: 150 } } } }} /><DatePicker label="To" value={to} onChange={setTo} slotProps={{ textField: { sx: { width: { xs: 'calc(50% - 6px)', sm: 150 } } } }} /></LocalizationProvider> }
function ReadOnlySection({ kind }: { kind: 'contacts' | 'applications' }) {
  const isContact = kind === 'contacts'; const endpoint = isContact ? '/api/contact-submissions' : '/api/job-applications'; const title = isContact ? 'Contact Submissions' : 'Job Applications'
  const [rows, setRows] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [search, setSearch] = useState(''); const [from, setFrom] = useState<Dayjs | null>(null); const [to, setTo] = useState<Dayjs | null>(null); const [category, setCategory] = useState(''); const [resume, setResume] = useState(''); const [page, setPage] = useState(0); const [perPage, setPerPage] = useState(10)
  const load = useCallback(async () => { setLoading(true); setError(''); try { const response = await fetch(endpoint); if (!response.ok) throw new Error(await apiError(response)); const body = await response.json(); setRows(Array.isArray(body) ? body : []) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load submissions.') } finally { setLoading(false) } }, [endpoint])
  useEffect(() => { void load() }, [load]); useEffect(() => setPage(0), [search, from, to, category, resume])
  const searchKeys = isContact ? ['name', 'email', 'subject', 'message'] : ['full_name', 'email', 'phone', 'job_title', 'cover_letter']
  const categories = [...new Set(rows.map(row => String(row[isContact ? 'inquiry_type' : 'job_title'] || '').trim()).filter(Boolean))].sort()
  const filtered = rows.filter(row => { const term = normalize(search); if (term && !searchKeys.some(key => normalize(row[key]).includes(term))) return false; const created = dayjs(String(row.created_at)); if (from && created.isBefore(from.startOf('day'))) return false; if (to && created.isAfter(to.endOf('day'))) return false; if (category && String(row[isContact ? 'inquiry_type' : 'job_title']) !== category) return false; if (!isContact && resume && (resume === 'yes') !== hasValue(row.resume_url)) return false; return true })
  const active = Boolean(search.trim() || from || to || category || resume); const paged = filtered.slice(page * perPage, page * perPage + perPage)
  const columns = isContact ? ['name', 'email', 'inquiry_type', 'subject', 'message', 'created_at'] : ['full_name', 'email', 'phone', 'job_title', 'cover_letter', 'resume_url', 'created_at']
  return <SectionShell title={title} count={rows.length}><FilterToolbar search={search} onSearch={setSearch} active={active} onClear={() => { setSearch(''); setFrom(null); setTo(null); setCategory(''); setResume('') }} count={filtered.length} total={rows.length} onExport={() => exportCsv(filtered, kind)}><DateFilters from={from} to={to} setFrom={setFrom} setTo={setTo} /><FilterSelect label={isContact ? 'Inquiry type' : 'Job title'} value={category} options={categories} onChange={setCategory} />{!isContact && <FilterSelect label="Resume" value={resume} options={['yes', 'no']} onChange={setResume} />}</FilterToolbar>
    {error ? <Alert severity="error" action={<Button onClick={() => void load()}>Retry</Button>}>{error}</Alert> : loading ? <LoadingState /> : <><TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', borderRadius: 2.5 }}><Table stickyHeader size="small" sx={{ minWidth: isContact ? 1000 : 1160 }}><TableHead><TableRow>{columns.map(column => <HeaderCell key={column}>{labelFor(column === 'created_at' ? 'date received' : column)}</HeaderCell>)}</TableRow></TableHead><TableBody>{paged.length ? paged.map(row => <TableRow key={String(row.id)} hover>{columns.map(column => column === 'created_at' ? <TableCell key={column} sx={{ whiteSpace: 'nowrap' }}>{formatDate(row[column])}</TableCell> : column === 'resume_url' ? <TableCell key={column}>{hasValue(row[column]) ? <Button component="a" href={String(row[column])} target="_blank" rel="noreferrer" size="small">View resume</Button> : '—'}</TableCell> : <DataCell key={column} column={column === 'message' || column === 'cover_letter' ? 'description' : column} value={row[column]} row={row} />)}</TableRow>) : <EmptyRow columns={columns.length} filtered={active} message={active ? undefined : `No ${isContact ? 'contact submissions' : 'job applications'} yet`} />}</TableBody></Table></TableContainer><ResponsivePagination count={filtered.length} page={page} perPage={perPage} setPage={setPage} setPerPage={setPerPage} /></>}
  </SectionShell>
}

export default function AdminDashboard() {
  const [tab, setTab] = useState(0)
  return <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}><AppBar position="sticky" elevation={0} sx={{ bgcolor: '#0c2f5c', borderBottom: '1px solid rgba(255,255,255,.12)' }}><Toolbar sx={{ minHeight: { xs: 58, sm: 64 }, gap: 1.25 }}><Box sx={{ width: 34, height: 34, borderRadius: 1.25, bgcolor: '#1976d2', display: 'grid', placeItems: 'center' }}><Business fontSize="small" /></Box><Box sx={{ minWidth: 0 }}><Typography sx={{ fontWeight: 800, lineHeight: 1.15 }}>Loxon Admin</Typography><Typography variant="caption" sx={{ color: 'rgba(255,255,255,.72)', display: { xs: 'none', sm: 'block' } }}>Landing page content operations</Typography></Box><Chip label={TAB_LABELS[tab]} size="small" sx={{ ml: 'auto', maxWidth: { xs: 150, sm: 240 }, bgcolor: 'rgba(255,255,255,.12)', color: 'white', '.MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} /></Toolbar><Box sx={{ borderTop: '1px solid rgba(255,255,255,.08)', px: { xs: 0.5, md: 2 } }}><Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" aria-label="Admin sections" sx={{ minHeight: 46, '& .MuiTab-root': { minHeight: 46, color: 'rgba(255,255,255,.7)', textTransform: 'none', fontWeight: 650, px: 2 }, '& .Mui-selected': { color: 'white !important' }, '& .MuiTabs-indicator': { bgcolor: '#5fb1ff', height: 3 } }}>{TAB_LABELS.map(label => <Tab key={label} label={label} />)}</Tabs></Box></AppBar>
    <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 4 }, px: { xs: 1.5, sm: 3 } }}>{tab === 0 && <CrudSection section={SECTIONS[0]} project />}{tab === 1 && <CrudSection section={SECTIONS[1]} />}{tab === 2 && <CrudSection section={SECTIONS[2]} />}{tab === 3 && <CrudSection section={SECTIONS[3]} />}{tab === 4 && <ReadOnlySection kind="contacts" />}{tab === 5 && <ReadOnlySection kind="applications" />}</Container>
  </Box>
}
