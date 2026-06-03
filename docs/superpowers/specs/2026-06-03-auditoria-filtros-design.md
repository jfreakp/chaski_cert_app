# Filtros de Auditoría — Spec de Diseño

**Fecha:** 2026-06-03

---

## Objetivo

Agregar un formulario de búsqueda a `/dashboard/audit` con filtros de rango de fecha y acción (requeridos) y usuario (opcional). La tabla no carga hasta que se apliquen los filtros.

---

## Comportamiento

- Al entrar a `/dashboard/audit` sin params en la URL: se muestra el formulario + estado vacío "Aplicá los filtros para ver resultados". No se ejecuta query a la DB.
- Al completar `from`, `to`, `action` y hacer click en **Buscar**: el formulario navega a la misma URL con los params (`?from=&to=&action=&user=&page=1`). La tabla carga los logs filtrados.
- `user` es opcional — si está vacío no aplica filtro por usuario.
- La paginación preserva todos los params del filtro activo.
- El botón **Limpiar** navega a `/dashboard/audit` sin params (vuelve al estado vacío).

---

## URL Params

| Param | Tipo | Requerido | Ejemplo |
|-------|------|----------|---------|
| `from` | `YYYY-MM-DD` | Sí | `2026-01-01` |
| `to` | `YYYY-MM-DD` | Sí | `2026-06-03` |
| `action` | string | Sí | `USER_LOGIN` |
| `user` | string | No | `admin` |
| `page` | number | No (default 1) | `2` |

---

## Query Prisma con filtros

```ts
const where: Prisma.AuditLogWhereInput = {
  createdAt: {
    gte: new Date(from),
    lte: new Date(`${to}T23:59:59.999Z`),
  },
  action,
  ...(userFilter ? {
    user: {
      OR: [
        { name: { contains: userFilter, mode: 'insensitive' } },
        { email: { contains: userFilter, mode: 'insensitive' } },
      ],
    },
  } : {}),
}
```

---

## Archivos

| Acción | Archivo |
|--------|---------|
| Crear | `app/(dashboard)/dashboard/audit/audit-filters.tsx` |
| Modificar | `app/(dashboard)/dashboard/audit/page.tsx` |

---

## AuditFilters (Client Component)

**Archivo:** `app/(dashboard)/dashboard/audit/audit-filters.tsx`

- `'use client'`
- Props: `defaultValues: { from: string; to: string; action: string; user: string }`
- Usa `useRouter` para navegar al submit
- Campos:
  - `from`: `<input type="date" required />`
  - `to`: `<input type="date" required />`
  - `action`: `<select required>` con opción placeholder vacía + las 5 opciones
  - `user`: `<input type="text" placeholder="Nombre o email" />`
- Al submit: construye `URLSearchParams` con los valores y llama `router.push('/dashboard/audit?' + params.toString())`
- Botón **Buscar** + botón **Limpiar** que llama `router.push('/dashboard/audit')`

---

## Cambios en page.tsx

- `searchParams` type: `{ from?: string; to?: string; action?: string; user?: string; page?: string }`
- Determinar si hay filtros activos: `const hasFilters = !!(from && to && action)`
- Si `!hasFilters`: no ejecutar query, renderizar estado vacío
- Si `hasFilters`: ejecutar query con `where` + paginación
- Pasar `defaultValues={{ from, to, action, user }}` a `<AuditFilters />`
- Los links de paginación preservan todos los params activos: `?from=&to=&action=&user=&page=N`
- Estado vacío: `"Completá los filtros y hacé click en Buscar para ver los resultados."`
- El header ya no muestra el total global — muestra el total de resultados del filtro activo (o nada si no hay filtros)
