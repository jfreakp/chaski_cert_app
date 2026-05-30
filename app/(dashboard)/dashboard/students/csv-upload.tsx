'use client'

import { useActionState } from 'react'
import { importStudentsFromCSV } from '@/app/actions/students'
import { Upload, FileDown, Loader2, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react'

type Career = { id: string; name: string }

export default function CsvUpload({ careers }: { careers: Career[] }) {
  const [state, action, pending] = useActionState(importStudentsFromCSV, undefined)

  const downloadTemplate = () => {
    const csv = [
      'nombre,cedula,email',
      'Juan Pérez,1234567890,juan@mail.com',
      'María López,0987654321,maria@mail.com',
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla_estudiantes.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-xl border border-surface-container p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-on-surface">Importar desde CSV</h3>
          <p className="text-xs text-secondary mt-0.5">Columnas: nombre, cédula, email</p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-container hover:underline"
        >
          <FileDown size={14} strokeWidth={1.75} />
          Descargar plantilla
        </button>
      </div>

      <form action={action} className="space-y-3">
        {/* Carrera — se aplica a todos los del lote */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
            Carrera del lote *
          </label>
          <div className="relative">
            <BookOpen size={15} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            {careers.length > 0 ? (
              <select
                name="careerId"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none text-sm font-medium text-on-surface transition-all appearance-none cursor-pointer"
              >
                <option value="">Selecciona una carrera...</option>
                {careers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <div className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-lg text-sm text-outline">
                No hay carreras registradas —{' '}
                <a href="/dashboard/careers/new" className="text-primary-container font-bold hover:underline">crear una</a>
              </div>
            )}
          </div>
        </div>

        {/* Archivo CSV */}
        <div className="flex items-center gap-3">
          <label className="flex-1 flex items-center gap-3 px-4 py-3 bg-surface-container-low rounded-lg cursor-pointer hover:bg-surface-container transition-all border-2 border-dashed border-outline/20 hover:border-primary-container/40">
            <Upload size={16} strokeWidth={1.75} className="text-secondary shrink-0" />
            <span className="text-sm text-secondary font-medium truncate" id="file-label">
              Seleccionar archivo .csv
            </span>
            <input
              name="file"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const label = document.getElementById('file-label')
                if (label) label.textContent = e.target.files?.[0]?.name ?? 'Seleccionar archivo .csv'
              }}
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-5 rounded-lg transition-all text-sm disabled:opacity-60 shrink-0"
          >
            {pending ? <Loader2 size={15} strokeWidth={2} className="animate-spin" /> : <Upload size={15} strokeWidth={1.75} />}
            Importar
          </button>
        </div>

        {state?.success && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg">
            <CheckCircle2 size={14} strokeWidth={2} />
            {state.message}
          </div>
        )}
        {state?.message && !state.success && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-error-container text-on-error-container text-xs font-medium rounded-lg">
            <AlertCircle size={14} strokeWidth={2} />
            {state.message}
          </div>
        )}
        {state?.errors && state.errors.length > 0 && (
          <ul className="space-y-1">
            {state.errors.map((e, i) => (
              <li key={i} className="text-xs text-error">• {e}</li>
            ))}
          </ul>
        )}
      </form>
    </div>
  )
}
