'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { importParticipants, type ImportResult } from '@/app/actions/processes'
import { Upload, Loader2, CheckCircle2, AlertCircle, Download, FileDown } from 'lucide-react'

function downloadTemplate() {
  const csv = [
    'DNI',
    '1234567890',
    '0987654321',
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla_participantes.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function downloadErrorReport(errores: ImportResult['errores'], processId: string) {
  const header = 'Fila,DNI,Nombre,Motivo'
  const rows = errores.map(e => `${e.fila},"${e.dni}","${e.nombre}","${e.motivo}"`)
  const csv = ['﻿' + header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `errores-importacion-${processId}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ImportForm({ processId }: { processId: string }) {
  const boundAction = importParticipants.bind(null, processId)
  const [state, action, pending] = useActionState(boundAction, undefined)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
        <form action={action} className="space-y-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Archivo CSV *</label>
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-container hover:underline"
              >
                <FileDown size={14} strokeWidth={1.75} />
                Descargar plantilla
              </button>
            </div>
            <input
              type="file"
              name="file"
              accept=".csv,.txt"
              required
              className="w-full px-4 py-3 bg-surface-container-low border border-transparent rounded-lg text-sm text-on-surface file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-primary-container file:text-white hover:file:bg-primary cursor-pointer"
            />
            <p className="text-xs text-secondary">
              Columna requerida: <code className="font-mono bg-surface-container px-1 rounded">DNI</code>.
              El estudiante debe existir en el sistema y estar matriculado en la carrera del proceso.
            </p>
          </div>

          {state?.message && (
            <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg flex items-center gap-2">
              <AlertCircle size={16} strokeWidth={2} />
              {state.message}
            </div>
          )}

          <div className="flex justify-end items-center gap-4 pt-2">
            <Link href={`/dashboard/processes/${processId}`}
              className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">
              Cancelar
            </Link>
            <button type="submit" disabled={pending}
              className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm">
              {pending
                ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Importando...</>
                : <><Upload size={16} strokeWidth={1.75} />Importar</>}
            </button>
          </div>
        </form>
      </div>

      {state?.result && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-surface-container space-y-4">
          <div className="flex items-center gap-2 text-emerald-700 font-bold">
            <CheckCircle2 size={18} strokeWidth={2} />
            Importación completada
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-2xl font-extrabold text-emerald-700">{state.result.agregados}</p>
              <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mt-1">Agregados</p>
            </div>
            <div className="bg-surface-container rounded-lg p-4">
              <p className="text-2xl font-extrabold text-secondary">{state.result.duplicados}</p>
              <p className="text-xs text-secondary font-bold uppercase tracking-wider mt-1">Ya en proceso</p>
            </div>
            <div className="bg-error-container/20 rounded-lg p-4">
              <p className="text-2xl font-extrabold text-error">{state.result.errores.length}</p>
              <p className="text-xs text-error font-bold uppercase tracking-wider mt-1">No agregados</p>
            </div>
          </div>

          {state.result.errores.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-error">
                  Estudiantes no agregados ({state.result.errores.length}):
                </p>
                <button
                  type="button"
                  onClick={() => downloadErrorReport(state.result!.errores, processId)}
                  className="inline-flex items-center gap-2 text-sm font-bold text-primary-container hover:underline"
                >
                  <Download size={14} strokeWidth={2} />
                  Descargar reporte
                </button>
              </div>
              <div className="rounded-lg border border-error/20 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-error-container/10 border-b border-error/20">
                      <th className="text-left px-4 py-2 font-bold text-error uppercase tracking-wider">Fila</th>
                      <th className="text-left px-4 py-2 font-bold text-error uppercase tracking-wider">DNI</th>
                      <th className="text-left px-4 py-2 font-bold text-error uppercase tracking-wider">Nombre</th>
                      <th className="text-left px-4 py-2 font-bold text-error uppercase tracking-wider">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-error/10">
                    {state.result.errores.map((e, i) => (
                      <tr key={i} className="hover:bg-error-container/5">
                        <td className="px-4 py-2 text-secondary">{e.fila}</td>
                        <td className="px-4 py-2 font-mono text-on-surface">{e.dni || '—'}</td>
                        <td className="px-4 py-2 text-on-surface">{e.nombre || '—'}</td>
                        <td className="px-4 py-2 text-error">{e.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Link href={`/dashboard/processes/${processId}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-primary-container hover:underline">
            ← Ver el proceso
          </Link>
        </div>
      )}
    </div>
  )
}
