'use client'

import { useRef, useState } from 'react'
import { Alert, Box, Button, CircularProgress, FormHelperText, Typography } from '@mui/material'
import { CloudUpload, Delete, ImageOutlined } from '@mui/icons-material'

import { IMAGE_ACCEPT } from '@/lib/image-upload-policy'
import { uploadImage } from '@/lib/upload-image'

type Props = {
  label: string
  value: string
  onChange: (url: string) => void
  helperText?: string
  required?: boolean
}

export default function ImageUploadField({ label, value, onChange, helperText, required }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadPending = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const upload = async (file?: File) => {
    if (!file || uploadPending.current) return
    setError('')
    uploadPending.current = true
    setUploading(true)
    try {
      onChange(await uploadImage(file))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Image upload failed.')
    } finally {
      uploadPending.current = false
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <Box>
      <Typography component="label" variant="subtitle2" sx={{ display: 'block', mb: 0.75, color: 'text.primary' }}>
        {label}{required ? ' *' : ''}
      </Typography>
      <Box
        role="button"
        tabIndex={0}
        aria-label={`${label}. Select an image to upload.`}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={event => {
          if ((event.key === 'Enter' || event.key === ' ') && !uploading) inputRef.current?.click()
        }}
        onDragOver={event => { event.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files[0]) }}
        sx={{
          border: '1.5px dashed', borderColor: dragging ? 'primary.main' : error ? 'error.main' : 'divider',
          bgcolor: dragging ? 'primary.50' : '#f8fafc', borderRadius: 2, p: 1.5, cursor: uploading ? 'wait' : 'pointer',
          display: 'flex', gap: 1.5, alignItems: 'center', minHeight: 104,
          transition: 'border-color 150ms, background-color 150ms',
          '&:hover, &:focus-visible': { borderColor: 'primary.main', outline: 'none', bgcolor: '#f2f7ff' },
        }}
      >
        {value ? (
          <Box component="img" src={value} alt="Selected image preview" sx={{ width: 104, height: 76, objectFit: 'cover', borderRadius: 1.25, bgcolor: '#e8eef7', flex: '0 0 auto' }} />
        ) : (
          <Box sx={{ width: 78, height: 70, borderRadius: 1.25, bgcolor: '#e8eef7', display: 'grid', placeItems: 'center', color: 'primary.main', flex: '0 0 auto' }}>
            <ImageOutlined />
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          {uploading ? <CircularProgress size={24} /> : <CloudUpload color="primary" />}
          <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.25 }}>{uploading ? 'Uploading image…' : value ? 'Replace image' : 'Drop an image here or browse'}</Typography>
          <Typography variant="caption" color="text.secondary">Image files up to 8 MB</Typography>
        </Box>
      </Box>
      <input ref={inputRef} hidden type="file" accept={IMAGE_ACCEPT} onChange={event => void upload(event.target.files?.[0])} />
      {value && !uploading && (
        <Button size="small" color="error" startIcon={<Delete />} onClick={() => { onChange(''); setError('') }} sx={{ mt: 0.5 }}>
          Remove image
        </Button>
      )}
      {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
      {error && <Alert severity="error" sx={{ mt: 1, py: 0 }}>{error}</Alert>}
    </Box>
  )
}
