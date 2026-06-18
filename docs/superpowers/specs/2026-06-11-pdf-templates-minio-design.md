# Diseño: Plantillas PDF por Proceso + Almacenamiento MinIO

**Fecha:** 2026-06-11
**Estado:** Aprobado

---

## Resumen

Cada `CertificateProcess` puede tener una plantilla PDF opcional. Cuando existe, los certificados se generan insertando solo el nombre del estudiante en coordenadas X/Y fijas dentro de esa plantilla. Si no existe plantilla, el sistema sigue usando el generador programático actual. Las plantillas se almacenan en MinIO (S3-compatible), desplegado en Docker.

---

## 1. Modelo de datos

Se agregan 3 campos opcionales a `CertificateProcess` en Prisma:

```prisma
templateKey  String?  // clave del archivo en MinIO (ej: "templates/proc-uuid.pdf")
nameX        Float?   // coordenada X en puntos PDF donde se escribe el nombre
nameY        Float?   // coordenada Y en puntos PDF donde se escribe el nombre
```

Los tres campos son todos-o-ninguno: si `templateKey` tiene valor, `nameX` y `nameY` también deben tenerlo.

---

## 2. Almacenamiento (MinIO)

- **Bucket:** `chaski-templates`
- **Clave por plantilla:** `templates/{processId}.pdf`
- **Acceso:** privado — solo el backend accede vía SDK
- **SDK:** `@aws-sdk/client-s3` (compatible con MinIO)

### Módulo `app/lib/storage.ts`

Encapsula todas las operaciones de MinIO:

- `uploadTemplate(key: string, buffer: Buffer): Promise<void>`
- `downloadTemplate(key: string): Promise<Buffer>`
- `deleteTemplate(key: string): Promise<void>`

### Variables de entorno

```
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=chaskicert
MINIO_SECRET_KEY=chaskicert_pass
MINIO_BUCKET=chaski-templates
```

---

## 3. Infraestructura Docker

Se agrega el servicio `minio` al `docker-compose.yml` existente:

```yaml
minio:
  image: minio/minio:latest
  container_name: chaskicert_minio
  restart: unless-stopped
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: chaskicert
    MINIO_ROOT_PASSWORD: chaskicert_pass
  ports:
    - "9000:9000"   # API S3
    - "9001:9001"   # Consola web admin
  volumes:
    - minio_data:/data
  healthcheck:
    test: ["CMD", "mc", "ready", "local"]
    interval: 5s
    timeout: 5s
    retries: 5
```

Se agrega `minio_data` al bloque `volumes` del compose.

En VPS, las variables de entorno apuntan al contenedor MinIO interno de la misma red Docker.

---

## 4. UX — Carga de plantilla

La plantilla se puede subir en dos momentos:

### Al crear el proceso (`/dashboard/processes/new`)
- Campo de archivo PDF opcional al final del formulario
- Inputs numéricos para X e Y (en puntos PDF)
- Botón **"Previsualizar"** que activa la previsualización antes de guardar

### Al editar el proceso (`/dashboard/processes/[id]/edit`)
- Misma sección de plantilla
- Muestra si hay plantilla activa (nombre del archivo y coordenadas guardadas)
- Permite reemplazar o eliminar la plantilla

---

## 5. Previsualización

Flujo:
1. Usuario selecciona archivo PDF + ingresa X/Y
2. Hace clic en **"Previsualizar"**
3. Server Action `previewTemplate(file, x, y)`:
   - Recibe el archivo como `ArrayBuffer`
   - Usa `pdf-lib` para escribir `"Juan Pérez (ejemplo)"` en las coordenadas X/Y
   - Fuente: Helvetica Bold, 28pt, color negro
   - Devuelve el PDF como string base64
4. El PDF se muestra en un `<iframe>` embebido en la página (~400px de alto)
5. El usuario puede ajustar X/Y y volver a previsualizar antes de guardar

---

## 6. Server Actions

| Acción | Descripción |
|--------|-------------|
| `createProcess` | Extendida para aceptar template + X/Y opcionales |
| `updateProcess` | Extendida igual; si se sube nueva plantilla, elimina la anterior de MinIO |
| `previewTemplate` | Recibe file + X/Y, devuelve PDF base64 sin guardar en DB |
| `deleteProcessTemplate` | Elimina plantilla de MinIO y limpia campos en DB |

---

## 7. Generación de certificados

Cambio en `generateCertificates` (`app/actions/processes.ts`):

```
si proceso.templateKey existe:
  → descargar plantilla de MinIO
  → insertar nombre del estudiante en (nameX, nameY) con pdf-lib
  → fuente: Helvetica Bold, 28pt, negro
  → devolver PDF generado

si proceso.templateKey es null:
  → usar generateCertificatePdf() existente (sin cambios)
```

Los certificados generados **no se persisten** en MinIO — se generan al vuelo cada vez que el estudiante descarga desde el portal, igual que hoy.

---

## 8. Restricciones y validaciones

- Solo se acepta `.pdf` (validado en cliente y servidor)
- Tamaño máximo: 10 MB
- X/Y deben ser números positivos
- Si se actualiza la plantilla, la anterior se elimina de MinIO antes de subir la nueva
- Si se elimina el proceso, la plantilla se elimina de MinIO dentro de la Server Action `deleteProcess` antes de eliminar el registro de la DB

---

## 9. Fuera de alcance

- Múltiples campos de texto por plantilla (solo el nombre del estudiante)
- Personalización de fuente, tamaño o color
- Almacenamiento de certificados generados en MinIO
- Preview en tiempo real mientras se escribe (solo bajo demanda con botón)
