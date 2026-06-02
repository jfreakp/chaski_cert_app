# requiresCareer en CertificateType — Spec

**Goal:** Permitir que cada tipo de certificado indique si los procesos de ese tipo requieren una carrera específica. El formulario de proceso muestra el campo carrera solo cuando el tipo seleccionado lo requiere.

**Context:** Actualmente el campo carrera en el proceso siempre es visible. La distinción es: Título de Grado → requiere carrera; Congreso, Curso, Seminario → no requiere carrera. Esta lógica debe ser configurable desde el admin, no hardcodeada.

---

## Schema

Agregar campo a `CertificateType`:

```prisma
requiresCareer Boolean @default(false)
```

Default `false` para no romper tipos existentes. La migración incluye un `UPDATE` que setea `requiresCareer = true` para el tipo "Título de Grado".

---

## Server Actions — certificate-types.ts

Agregar `requiresCareer` al Zod schema (coerce boolean desde FormData):

```ts
requiresCareer: z.coerce.boolean().default(false),
```

Incluirlo en `prisma.create` y `prisma.update`.

---

## UI — Tipos de Certificado

### certificate-type-form.tsx y edit-certificate-type-form.tsx

Agregar toggle entre el campo descripción y el botón guardar:

- Label: "Requiere carrera específica"
- Descripción: "Al crear un proceso de este tipo, el campo carrera será obligatorio."
- Input: `<input type="checkbox" name="requiresCareer" value="true" />`
- En el form de edición, inicializar con `defaultChecked={defaultRequiresCareer}`

### certificate-type-table.tsx

Agregar columna "Carrera req." después del nombre, con un ícono verde (`GraduationCap`) si `requiresCareer = true`, guión si false.

---

## UI — Formularios de Proceso

### processes/new/page.tsx

El query de `certTypes` incluye `requiresCareer`:

```ts
select: { id: true, name: true, requiresCareer: true }
```

Pasa el array completo al form.

### processes/new/process-form.tsx

- Prop: `certTypes: { id: string; name: string; requiresCareer: boolean }[]`
- Estado local: `const [selectedTypeId, setSelectedTypeId] = useState('')`
- El campo carrera se renderiza condicionalmente:

```tsx
{certTypes.find(c => c.id === selectedTypeId)?.requiresCareer && (
  <div>...campo carrera...</div>
)}
```

- Al cambiar el tipo, el select de carrera vuelve a su valor vacío por defecto (React re-monta o se controla con key).

### processes/[id]/edit/page.tsx y edit-process-form.tsx

Misma lógica. El estado inicial de `selectedTypeId` es `defaultCertificateTypeId` (el tipo ya guardado del proceso).

---

## Flujo completo

1. Admin crea "Título de Grado" con "Requiere carrera" activado.
2. Universidad crea proceso → selecciona tipo → si requiere carrera, aparece el select de carrera; si no, el campo no existe en el DOM (no se envía en el form).
3. Al guardar, `careerId` llega vacío para tipos sin carrera — el action ya maneja `careerId: null`.
