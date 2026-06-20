# Diseño: Solicitud de Cuenta

**Fecha:** 2026-06-19  
**Estado:** Aprobado

## Resumen

Flujo que permite a usuarios externos solicitar acceso al sistema desde la página de login. Las solicitudes se guardan en BD y el administrador las ve desde el dashboard con notificación visual en la campana.

---

## Modelo de datos

Nueva tabla `AccountRequest` en `prisma/schema.prisma`:

```prisma
model AccountRequest {
  id          String   @id @default(uuid())
  name        String
  email       String
  phone       String
  institution String
  message     String
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

- `isRead` se pone `true` al cargar la página de admin — el badge solo cuenta los `isRead = false`.
- No hay relación con `User` ni `Institution` (institución es texto libre).

---

## Formulario público `/solicitar-cuenta`

- Nueva ruta en `app/(auth)/solicitar-cuenta/page.tsx` (dentro del grupo auth para heredar estilos).
- Campos: nombre, email, celular, institución (texto libre), mensaje.
- Server action `createAccountRequest` en `app/actions/account-requests.ts`.
- Al enviar con éxito: muestra mensaje de confirmación en la misma página, no redirige.
- El link en `app/(auth)/login/page.tsx:107` cambia de `href="#"` a `href="/solicitar-cuenta"`.
- Validación con Zod: email válido, todos los campos requeridos, mensaje mínimo 10 caracteres.

---

## Notificación — Bell icon

- El layout ya tiene la variable `isAdmin`. Solo para ADMIN: la campana se convierte en `<Link href="/dashboard/account-requests">` y muestra el badge.
- Para usuarios UNIVERSITY: la campana queda como `<button>` estático sin badge (comportamiento actual).
- El layout consulta `prisma.accountRequest.count({ where: { isRead: false } })` solo si `isAdmin === true`.
- Si el conteo > 0, badge rojo pequeño con el número sobre el ícono Bell.
- Si el conteo es 0, campana sin badge.

---

## Vista admin `/dashboard/account-requests`

- Nueva ruta en `app/(dashboard)/dashboard/account-requests/page.tsx`.
- Page Server Component: al cargar ejecuta `prisma.accountRequest.updateMany({ where: { isRead: false }, data: { isRead: true } })` y luego fetcha todas las solicitudes ordenadas por `createdAt DESC`.
- Tabla con columnas: Solicitante (nombre + email), Celular, Institución, Mensaje (truncado a 80 chars, expandible con clic), Fecha.
- Si no hay solicitudes: estado vacío con icono y texto "Sin solicitudes aún".
- Enlace en el menú lateral solo para ADMIN (misma lógica que `AdminMenu`).

---

## Archivos a crear / modificar

| Acción | Ruta |
|--------|------|
| Crear  | `prisma/schema.prisma` — nuevo model `AccountRequest` |
| Crear  | `app/actions/account-requests.ts` |
| Crear  | `app/(auth)/solicitar-cuenta/page.tsx` |
| Crear  | `app/(auth)/solicitar-cuenta/request-form.tsx` |
| Crear  | `app/(dashboard)/dashboard/account-requests/page.tsx` |
| Crear  | `app/(dashboard)/dashboard/account-requests/requests-table.tsx` |
| Modificar | `app/(dashboard)/layout.tsx` — campana con badge y link |
| Modificar | `app/(auth)/login/page.tsx` — link "Solicite una cuenta" |
| Modificar | `app/(dashboard)/components/admin-menu.tsx` — nuevo ítem |

---

## Fuera de alcance

- Aprobación/rechazo de solicitudes (el admin crea la cuenta manualmente desde `/dashboard/users`).
- Notificaciones por email al solicitante.
- Rate limiting del formulario público.
