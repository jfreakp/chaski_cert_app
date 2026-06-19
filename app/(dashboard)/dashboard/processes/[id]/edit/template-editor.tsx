'use client'

import { useState, useEffect, useTransition, useActionState } from 'react'
import { uploadProcessTemplate, removeProcessTemplate, updateTemplateSettings } from '@/app/actions/process-template'
import { Upload, Trash2, Save, Loader2 } from 'lucide-react'

type Template = {
  pdfWidth:       number
  pdfHeight:      number
  nameX:          number
  nameY:          number
  nameFontSize:   number
  nameFontFamily: string
  nameColor:      string
}

const FONT_OPTIONS = [
  { value: 'Helvetica',      label: 'Helvetica' },
  { value: 'Helvetica-Bold', label: 'Helvetica Negrita' },
  { value: 'Times-Roman',    label: 'Times Roman' },
  { value: 'Times-Bold',     label: 'Times Negrita' },
  { value: 'Courier',        label: 'Courier' },
  { value: 'Courier-Bold',   label: 'Courier Negrita' },
]

const MAX_DISPLAY_WIDTH = 800

export default function TemplateEditor({
  processId,
  template: initialTemplate,
}: {
  processId:       string
  template: Template | null
}) {
  const [template,    setTemplate]    = useState<Template | null>(initialTemplate)
  const [nameX,       setNameX]       = useState(initialTemplate?.nameX       ?? 0)
  const [nameY,       setNameY]       = useState(initialTemplate?.nameY       ?? 0)
  const [fontSize,    setFontSize]    = useState(initialTemplate?.nameFontSize   ?? 28)
  const [fontFamily,  setFontFamily]  = useState(initialTemplate?.nameFontFamily ?? 'Helvetica-Bold')
  const [color,       setColor]       = useState(initialTemplate?.nameColor      ?? '#0d0d1e')
  const [saveMsg,     setSaveMsg]     = useState<string | null>(null)
  const [saving,      startSave]      = useTransition()
  const [removing,    startRemove]    = useTransition()

  const boundUpload = uploadProcessTemplate.bind(null, processId)
  const [uploadState, uploadAction, uploading] = useActionState(boundUpload, undefined)

  // Sincronizar estado local tras upload exitoso
  useEffect(() => {
    if (uploadState?.pdfWidth && uploadState?.pdfHeight) {
      const t: Template = {
        pdfWidth:       uploadState.pdfWidth,
        pdfHeight:      uploadState.pdfHeight,
        nameX:          uploadState.nameX ?? uploadState.pdfWidth / 2,
        nameY:          uploadState.nameY ?? uploadState.pdfHeight / 3,
        nameFontSize:   28,
        nameFontFamily: 'Helvetica-Bold',
        nameColor:      '#0d0d1e',
      }
      setTemplate(t)
      setNameX(t.nameX)
      setNameY(t.nameY)
      setFontSize(28)
      setFontFamily('Helvetica-Bold')
      setColor('#0d0d1e')
    }
  }, [uploadState])

  const pdfWidth     = template?.pdfWidth  ?? 595
  const pdfHeight    = template?.pdfHeight ?? 842
  const displayWidth = Math.min(MAX_DISPLAY_WIDTH, pdfWidth)
  const displayScale = displayWidth / pdfWidth
  const displayHeight = pdfHeight * displayScale

  function handlePickerClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const pdfX = (e.clientX - rect.left)  / displayScale
    const pdfY = pdfHeight - (e.clientY - rect.top) / displayScale
    setNameX(Math.round(pdfX * 10) / 10)
    setNameY(Math.round(pdfY * 10) / 10)
  }

  function handleSave() {
    startSave(async () => {
      const result = await updateTemplateSettings(processId, {
        nameX, nameY, nameFontSize: fontSize, nameFontFamily: fontFamily, nameColor: color,
      })
      setSaveMsg(result.success ? '¡Configuración guardada!' : 'Error al guardar.')
      setTimeout(() => setSaveMsg(null), 3000)
    })
  }

  function handleRemove() {
    if (!confirm('¿Eliminar la plantilla PDF de este proceso?')) return
    startRemove(async () => {
      await removeProcessTemplate(processId)
      setTemplate(null)
    })
  }

  // ── Sin plantilla ─────────────────────────────────────────────────────────
  if (!template) {
    return (
      <form action={uploadAction} className="space-y-4">
        <div className="border-2 border-dashed border-surface-container rounded-xl p-8 text-center">
          <Upload size={32} strokeWidth={1} className="mx-auto text-outline/40 mb-3" />
          <p className="text-sm font-medium text-secondary mb-4">
            Sube un PDF como plantilla del certificado
          </p>
          <input
            type="file"
            name="file"
            accept=".pdf,application/pdf"
            required
            className="w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary-container file:text-white hover:file:bg-primary cursor-pointer"
          />
        </div>
        {uploadState?.message && (
          <p className="text-xs text-error">{uploadState.message}</p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-all disabled:opacity-60"
          >
            {uploading
              ? <><Loader2 size={14} strokeWidth={2} className="animate-spin" />Subiendo...</>
              : <><Upload size={14} strokeWidth={1.75} />Subir plantilla</>}
          </button>
        </div>
      </form>
    )
  }

  // ── Con plantilla: preview + controles ────────────────────────────────────
  const previewLeft   = (nameX / pdfWidth)  * displayWidth   // px desde izquierda del overlay
  const previewBottom = (nameY / pdfHeight) * displayHeight   // px desde abajo del overlay
  const previewFontSize = fontSize * displayScale

  return (
    <div className="space-y-4">
      {/* Zona de preview */}
      <div
        className="rounded-lg overflow-hidden border border-surface-container mx-auto"
        style={{ width: displayWidth, height: displayHeight, position: 'relative' }}
      >
        <object
          data={`/api/processes/${processId}/template#toolbar=0&navpanes=0&scrollbar=0`}
          type="application/pdf"
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        >
          <p className="text-xs text-secondary p-4">
            Tu navegador no soporta la vista previa del PDF.
          </p>
        </object>

        {/* Overlay de captura de clicks */}
        <div
          style={{ position: 'absolute', inset: 0, cursor: 'crosshair', zIndex: 10 }}
          onClick={handlePickerClick}
          title="Clic para posicionar el nombre del estudiante"
        />

        {/* Preview del nombre */}
        <div
          style={{
            position:    'absolute',
            left:        previewLeft,
            bottom:      previewBottom,
            transform:   'translateX(-50%)',
            fontSize:    previewFontSize,
            color,
            fontWeight:  fontFamily.includes('Bold') ? 'bold' : 'normal',
            fontFamily:  fontFamily.includes('Times')
              ? 'serif'
              : fontFamily.includes('Courier')
              ? 'monospace'
              : 'sans-serif',
            pointerEvents: 'none',
            zIndex:        20,
            whiteSpace:    'nowrap',
            userSelect:    'none',
            lineHeight:    1,
          }}
        >
          Nombre del Estudiante
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
            Tipo de letra
          </label>
          <select
            value={fontFamily}
            onChange={e => setFontFamily(e.target.value)}
            className="py-2 px-3 bg-surface-container-low border border-transparent rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary-container outline-none appearance-none"
          >
            {FONT_OPTIONS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
            Tamaño (pt)
          </label>
          <input
            type="number"
            value={Math.round(fontSize)}
            onChange={e => setFontSize(Number(e.target.value))}
            min={8}
            max={120}
            className="w-24 py-2 px-3 bg-surface-container-low border border-transparent rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary-container outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
            Color
          </label>
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="h-[38px] w-16 rounded-lg border border-surface-container cursor-pointer bg-surface-container-low p-0.5"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">X (pt)</label>
          <input
            type="number"
            value={Math.round(nameX)}
            onChange={e => setNameX(Number(e.target.value))}
            className="w-24 py-2 px-3 bg-surface-container-low border border-transparent rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary-container outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Y (pt)</label>
          <input
            type="number"
            value={Math.round(nameY)}
            onChange={e => setNameY(Number(e.target.value))}
            className="w-24 py-2 px-3 bg-surface-container-low border border-transparent rounded-lg text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary-container outline-none"
          />
        </div>

        <div className="flex items-end gap-3 ml-auto">
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="inline-flex items-center gap-1.5 py-2 px-4 rounded-lg text-sm font-bold text-error hover:bg-error-container/10 transition-all disabled:opacity-60"
          >
            {removing
              ? <Loader2 size={14} strokeWidth={2} className="animate-spin" />
              : <Trash2 size={14} strokeWidth={1.75} />}
            Eliminar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-all disabled:opacity-60"
          >
            {saving
              ? <><Loader2 size={14} strokeWidth={2} className="animate-spin" />Guardando...</>
              : <><Save size={14} strokeWidth={1.75} />Guardar</>}
          </button>
        </div>
      </div>

      {saveMsg && (
        <p className={`text-xs font-medium ${saveMsg.startsWith('¡') ? 'text-emerald-600' : 'text-error'}`}>
          {saveMsg}
        </p>
      )}
    </div>
  )
}
