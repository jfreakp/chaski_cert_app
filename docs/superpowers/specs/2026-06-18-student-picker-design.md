# Student Picker — Diseño

**Fecha:** 2026-06-18
**Rama:** dev

## Resumen

Reemplazar el flujo de agregar participantes (actualmente un `<select>` de un solo estudiante + importación por CSV) por un componente de tabla con checkboxes, buscador y filtros. El picker se muestra al crear un proceso, al editar un proceso, y al entrar al link "Agregar Estudiante" desde el detalle del proceso.

---

## Puntos de entrada

| Acción del usuario | Destino tras guardar |
|---|---|
| Crear proceso (`/processes/new`) | Redirect a `/processes/[id]/participants/new` |
| Editar proceso (`/processes/[id]/edit`) | Redirect a `/processes/[id]/participants/new` |
| Botón "Agregar Estudiante" en detalle del proceso | Ya apunta a `/processes/[id]/participants/new` (sin cambios) |

---

## Componentes nuevos

### `student-picker-filters.tsx` (Client Component)

- Input de búsqueda por nombre o DNI (actualiza query param `?q=`)
- Dropdown de carrera (actualiza query param `?career=`):
  - Solo visible si `requiresCareer = false` (tipos sin titulación)
  - Cuando `requiresCareer = true`, la carrera del proceso se muestra como etiqueta fija (no editable)
- Cada cambio hace `router.push` con los nuevos params → re-render del Server Component

### `student-picker-table.tsx` (Client Component)

- Tabla con columnas: checkbox, Nombre, DNI, Carrera
- Checkbox "Seleccionar todos" en el header (selecciona solo los visibles en la página actual)
- Contador de seleccionados: "X estudiantes seleccionados"
- Botón "Agregar seleccionados" (disabled si 0 seleccionados, muestra spinner durante submit)
- Botón "Omitir por ahora" (link de vuelta al detalle del proceso)
- Envía un `<form>` con múltiples inputs hidden `studentId` al server action `addParticipants`
- Si no hay estudiantes disponibles, muestra estado vacío: "Todos los estudiantes ya están en este proceso"

---

## Page actualizada: `participants/new/page.tsx` (Server Component)

Lee `searchParams` (`q`, `career`) y construye el query Prisma:

```
requiresCareer = true  → filtra por careerId del proceso (fijo), excluye ya-participantes, aplica búsqueda
requiresCareer = false → muestra todos los activos de la institución, filtra por career si hay ?career=, excluye ya-participantes, aplica búsqueda
```

Pasa a los Client Components:
- `students[]` — lista filtrada
- `careers[]` — para el dropdown (solo cuando `requiresCareer = false`)
- `fixedCareerName` — nombre de la carrera fija (cuando `requiresCareer = true`)
- `processId`, `processName`

---

## Server Actions modificadas

### `createProcess` (modificar)

Actualmente: `redirect('/dashboard/processes')`
Nuevo: `redirect('/dashboard/processes/[newId]/participants/new')`

### `updateProcess` (modificar)

Actualmente: `return { success: true }`
Nuevo: `redirect('/dashboard/processes/[id]/participants/new')`

### `addParticipants` (nueva)

```ts
addParticipants(processId: string, _: unknown, formData: FormData)
  → valida que studentIds[] pertenezcan a la institución
  → prisma.processParticipant.createMany({ skipDuplicates: true })
  → redirect(`/dashboard/processes/[processId]`)
```

---

## Eliminaciones

| Qué | Dónde |
|---|---|
| Botón "Importar CSV" | `processes/[id]/page.tsx` |
| Página y form de importación | `participants/import/page.tsx` + `participants/import/import-form.tsx` |
| Server action `importParticipants` | `actions/processes.ts` |
| Componente `participant-form.tsx` | `participants/new/participant-form.tsx` |

---

## Archivos afectados

```
app/
  actions/
    processes.ts                                          MODIFY
  (dashboard)/dashboard/processes/
    [id]/
      page.tsx                                            MODIFY (quitar botón Importar CSV)
      participants/
        new/
          page.tsx                                        REWRITE
          participant-form.tsx                            DELETE
          student-picker-filters.tsx                      NEW
          student-picker-table.tsx                        NEW
        import/
          page.tsx                                        DELETE
          import-form.tsx                                 DELETE
```

---

## Reglas de negocio

- Un estudiante ya participante del proceso nunca aparece en la tabla (excluido en la query).
- Para `requiresCareer = true`: solo se muestran estudiantes matriculados en la carrera del proceso. El filtro de carrera no existe en la UI.
- Para `requiresCareer = false`: se muestran todos los estudiantes activos de la institución. El dropdown de carrera es opcional (puede quedar en "Todas").
- `addParticipants` usa `createMany` con `skipDuplicates: true` como seguridad adicional contra race conditions.
- Si el usuario llega al picker con 0 estudiantes disponibles, puede hacer clic en "Omitir por ahora" para ir directo al detalle del proceso.
