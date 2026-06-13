# GymTracker

App de seguimiento de gimnasio para dos personas (Josemi y Alba). Reemplaza una hoja de cálculo compartida: organiza la rutina por días, ejercicios y variantes, y guarda el peso/reps de cada sesión con autoguardado.

Sin autenticación — cualquiera con la URL puede usarla.

## Stack

| Capa | Elección |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Estilos | Tailwind CSS |
| ORM | Prisma |
| Base de datos | SQLite |
| Despliegue | Docker / Docker Swarm (homelab) |

Fuera de alcance (v1): autenticación/login, gráficas de progreso, notificaciones, app móvil.

---

## Conceptos clave

- **User**: `Josemi` y `Alba`, seedeados directamente en la BD. Sin registro.
- **Day**: día de entreno con nombre (p.ej. "Push", "Pull", "Pierna"). Ordenado y configurable desde `/manage`.
- **Exercise**: entidad **global**, compartida entre días mediante la tabla de unión `DayExercise`. El mismo ejercicio (p.ej. "Sentadilla") puede aparecer en varios días, cada uno con su propio orden, pero comparte **las mismas variantes y el mismo historial de peso** en todos ellos. Al añadir un ejercicio desde `/manage`, un desplegable autocompletado permite vincular un ejercicio existente en vez de duplicarlo.
- **ExerciseVariant**: forma de hacer el ejercicio (p.ej. "Barra", "Mancuernas", "Polea", "Máquina"). Cada variante tiene su propio historial de peso independiente.
- **Session**: registro de Variant + User + Fecha, con `weight` y `reps` **cada uno opcional de forma independiente** (pero al menos uno requerido — soporta ejercicios isométricos/de peso corporal). La última sesión por (variante, usuario) es lo que se muestra en la pantalla de entreno, y se autoguarda con debounce mientras se escribe.

---

## Modelo de datos (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id       Int       @id @default(autoincrement())
  name     String    @unique  // "Josemi" | "Alba"
  sessions Session[]
}

model Day {
  id        Int           @id @default(autoincrement())
  name      String        // "Push", "Pull", "Pierna A"...
  order     Int           // display order
  exercises DayExercise[]
}

// Exercises are global and shared between days, so weight history follows
// the exercise wherever it appears.
model Exercise {
  id       Int               @id @default(autoincrement())
  name     String            // "Press Banca", "Sentadilla"...
  variants ExerciseVariant[]
  days     DayExercise[]
}

// Join table linking a Day to a (shared) Exercise, with a per-day order.
model DayExercise {
  id         Int      @id @default(autoincrement())
  order      Int      // display order within the day
  dayId      Int
  exerciseId Int
  day        Day      @relation(fields: [dayId], references: [id], onDelete: Cascade)
  exercise   Exercise @relation(fields: [exerciseId], references: [id], onDelete: Cascade)

  @@unique([dayId, exerciseId])
}

model ExerciseVariant {
  id         Int       @id @default(autoincrement())
  name       String    // "Barra", "Mancuernas", "Smith", "Máquina"...
  exerciseId Int
  exercise   Exercise  @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
  sessions   Session[]
}

model Session {
  id        Int             @id @default(autoincrement())
  weight    Float?          // kg — null para ejercicios de peso corporal/estáticos
  reps      Int?            // null para holds estáticos; al menos uno de weight/reps debe existir
  date      DateTime        @default(now())
  variantId Int
  variant   ExerciseVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  userId    Int
  user      User            @relation(fields: [userId], references: [id])

  @@index([variantId, userId, date])
}
```

### Decisiones de diseño

**Ejercicios globales, días enlazan vía `DayExercise`**
Un `Exercise` no pertenece a un único `Day`. `DayExercise` registra qué ejercicios aparecen en qué días y en qué orden. El mismo ejercicio puede vincularse a varios días compartiendo variantes e historial completo.
- Añadir desde el autocompletado de `/manage` **vincula** un `Exercise` existente (por `exerciseId`) o crea uno nuevo y lo vincula.
- Quitar un ejercicio de un día solo borra su fila `DayExercise` (lo desvincula). El `Exercise` (con variantes/sesiones) solo se borra del todo cuando ya no queda vinculado a ningún día.
- Renombrar un `Exercise` lo renombra en todos los días donde aparece.
- `@@unique([dayId, exerciseId])` evita vincular el mismo ejercicio dos veces en el mismo día.

**El peso vive en `Session`, no en `ExerciseVariant`**
"Press Banca con Barra" y "Press Banca con Mancuernas" tienen historiales de peso totalmente independientes. Al cambiar de variante en la pantalla de entreno, los inputs se recargan con el último peso de esa variante.

**`weight` y `reps` son independientemente opcionales**
Ambos campos son nullable, pero la API exige que **al menos uno** esté presente. Soporta ejercicios de peso corporal/estáticos/isométricos.

**Cascade deletes / sin soft deletes**
Borrar un Day borra sus enlaces `DayExercise`. Borrar un Exercise borra sus enlaces, variantes y (vía variantes) sesiones. Borrar una Variant borra sus sesiones. v1 usa hard deletes — el historial se pierde si un ejercicio/variante se elimina por completo.

### Datos de seed

`prisma/seed.ts` (dev) y `prisma/seed.js` (prod, ejecutado al arrancar el contenedor — idéntico pero idempotente, se salta si ya existe algún `User`):

```
Users: "Josemi", "Alba"

Day "Push" (order 1)
  Press Banca   → Barra, Mancuernas
  Press Inclinado → Mancuernas, Máquina
  Aperturas     → Polea, Mancuernas

Day "Pull" (order 2)
  Dominadas     → Peso corporal, Lastradas
  Remo          → Barra, Mancuernas, Polea baja

Day "Pierna" (order 3)
  Sentadilla    → Barra, Smith
  Prensa        → Máquina
  Curl femoral  → Máquina tumbado, Polea
```

---

## API routes

Todas bajo `app/api/`, Route Handlers de Next.js. Respuestas JSON; errores como `{ error: string }` con el status HTTP correspondiente.

### Days

- **`GET /api/days`** — todos los días ordenados por `order`, con sus ejercicios y variantes. `exercises` se construye a partir de las filas `DayExercise` de cada día (ordenadas por `DayExercise.order`), aplanadas a `{id, name, order, variants}`.
  ```json
  [
    {
      "id": 1, "name": "Push", "order": 1,
      "exercises": [
        { "id": 1, "name": "Press Banca", "order": 1,
          "variants": [{ "id": 1, "name": "Barra" }, { "id": 2, "name": "Mancuernas" }] }
      ]
    }
  ]
  ```
- **`POST /api/days`** — crea un día. Body `{ name: string }`
- **`PATCH /api/days/[id]`** — Body `{ name?: string, order?: number }`
- **`DELETE /api/days/[id]`** — borra el día y sus enlaces (cascade)
- **`PATCH /api/days/reorder`** — Body `{ ids: number[] }` (array ordenado de IDs de día)

### Exercises

Entidades globales compartidas vía `DayExercise`.

- **`POST /api/exercises`** — vincula o crea+vincula un ejercicio en un día.
  - Body `{ dayId, exerciseId }` → vincula un ejercicio existente (usado por el autocompletado).
  - Body `{ dayId, name, variants?: string[] }` → crea uno nuevo y lo vincula; si ya existe un ejercicio con ese nombre (case-insensitive), se reutiliza/vincula en su lugar.
  - `order` se autoasigna como `(max order del día) + 1`.
  - Devuelve `409` si el ejercicio ya está vinculado a ese día.
- **`PATCH /api/exercises/[id]`** — Body `{ name: string }`. Renombra en **todos** los días donde está vinculado.
- **`DELETE /api/exercises/[id]?dayId=[dayId]`** — desvincula del día dado (borra su fila `DayExercise`). Si ya no queda vinculado a ningún día, se borra del todo (cascade variantes/sesiones). Respuesta `{ ok: true, deletedEverywhere: boolean }`. Sin `?dayId=`, borra el ejercicio entero directamente (comportamiento legacy, no usado por la UI).
- **`PATCH /api/exercises/reorder`** — Body `{ dayId: number, ids: number[] }`. Reordena los `DayExercise` de ese día.

### Variants

- **`POST /api/variants`** — Body `{ exerciseId: number, name: string }`
- **`PATCH /api/variants/[id]`** — Body `{ name: string }`
- **`DELETE /api/variants/[id]`** — borra la variante y sus sesiones

### Sessions

- **`GET /api/sessions?dayId=[id]&userId=[id]`** — últimas 2 sesiones por variante del día, para ese usuario. Fetch principal de la pantalla de entreno.
  ```json
  {
    "variantSessions": {
      "1": [
        { "id": 10, "weight": 80, "reps": 8, "date": "2025-06-10T..." },
        { "id": 7,  "weight": 77.5, "reps": 8, "date": "2025-05-28T..." }
      ],
      "2": [{ "id": 11, "weight": null, "reps": 12, "date": "2025-06-10T..." }]
    }
  }
  ```
  Clave = `variantId` (string). Primer elemento = sesión más reciente. `weight`/`reps` nullable.
- **`POST /api/sessions`** — crea/actualiza la sesión de hoy (llamado por el autoguardado con debounce).
  - Body `{ variantId, userId, weight, reps }` — `weight`/`reps` opcionales/nullable pero al menos uno requerido. `400` si faltan ambos o si un valor presente no es válido (`weight >= 0`, `reps` entero `>= 1`).
  - **Upsert**: si ya existe una sesión de hoy (`date >= inicio del día`) para esa variante+usuario, se **actualiza** (weight, reps, date) en lugar de crear una nueva. Si no existe, se crea.

### Users

- **`GET /api/users`** — `[{ "id": 1, "name": "Josemi" }, { "id": 2, "name": "Alba" }]`

### Notas de implementación

- `lib/prisma.ts` — singleton `PrismaClient` (patrón estándar para hot-reload en dev) + helper `getErrorCode(error: unknown)` para manejar códigos de error de Prisma sin `any`.
- Todos los handlers son `async`, envueltos en try/catch con status HTTP apropiados.
- Los endpoints de reorder usan `$transaction` para actualizar todos los `order` atómicamente.

---

## UI / Pantallas

### Paleta (tema oscuro, estética de gimnasio)

| Uso | Color |
|---|---|
| Fondo | `#0f0f0f` |
| Superficie (cards) | `#1a1a1a` |
| Borde | `#2a2a2a` |
| Acento principal | `#e8ff47` (única zona con color — pills activas, etc.) |
| Texto primario | `#f5f5f5` |
| Texto muted | `#666` |
| Subida (↑) | `#4ade80` |
| Bajada (↓) | `#f87171` |

Tipografía: Inter. Números (peso/reps) con `font-variant-numeric: tabular-nums`.

### Estructura

```
app/
  layout.tsx          — layout raíz, fondo oscuro, nav bar
  page.tsx            — redirige a /routine
  routine/page.tsx    — selección de día
  routine/[dayId]/page.tsx — pantalla de entreno
  manage/page.tsx     — gestión de rutina
```

### `/routine` — Selección de día
Título "¿Qué toca hoy?", grid de tarjetas de día (2 cols móvil, 3–4 desktop), cada una con nombre y nº de ejercicios. Click → `/routine/[dayId]`.

### `/routine/[dayId]` — Pantalla de entreno
- Toggle de usuario (Josemi/Alba), por defecto Josemi. Cambiar de usuario recarga los inputs con sus últimos pesos.
- Una tarjeta por ejercicio: pills de variantes, inputs de peso (kg, step 0.5) y reps (step 1), indicador de progreso, estado de guardado.
- **Pills de variante**: click cambia de variante, recarga inputs con el último peso/reps de esa variante+usuario; cualquier edición pendiente de la variante anterior se guarda inmediatamente antes de cambiar.
- **Ambos campos son opcionales** de forma independiente (ejercicios estáticos/isométricos pueden dejar uno vacío). Se requiere al menos uno para autoguardar.
- **Indicador de progreso**: compara con la sesión anterior → `↑ +2.5kg`, `↓ -5kg`, `= sin cambio`, o nada si no hay dato previo.
- **Autoguardado con debounce (800ms), sin botones**: al editar peso/reps se programa un guardado; se reinicia con cada pulsación. Al disparar (si hay al menos un valor), `POST /api/sessions`. Muestra "Guardando…" y luego "✓ Guardado". Las ediciones pendientes se vuelcan inmediatamente al desmontar el componente, cambiar de variante o cambiar de usuario, para no perder datos.

### `/manage` — Gestión de rutina
Dos columnas en desktop (lista de días / detalle de ejercicios), una columna en móvil.

- **Panel izquierdo**: lista ordenada de días, editar/borrar/reordenar (flechas), "+ Añadir día".
- **Panel derecho** (día seleccionado): lista de ejercicios ordenados.
  - Renombrar (renombra el ejercicio compartido en todos los días donde aparece).
  - Borrar: desvincula del día; si no queda en ningún otro día, se borra junto con su historial (diálogo de confirmación lo explica).
  - Reordenar con flechas arriba/abajo.
  - Expandir para gestionar variantes (chips con ×, input para añadir).
  - **"+ Añadir ejercicio"** → input con **autocompletado**: desplegable filtrado (substring, case-insensitive) con ejercicios que existen en *otros* días pero no en este, mostrando sus variantes. Seleccionar uno **vincula** ese ejercicio exacto (mismas variantes, mismo historial de peso). Escribir un nombre nuevo crea el ejercicio (o lo reutiliza si ya existe uno con ese nombre exacto en cualquier día).

### Componentes

```
components/
  layout/NavBar.tsx
  routine/
    DayGrid.tsx, DayCard.tsx, UserToggle.tsx
    ExerciseCard.tsx      — tarjeta principal: variantes + inputs + autoguardado debounced
    VariantPills.tsx, WeightInput.tsx, RepsInput.tsx, ProgressIndicator.tsx
  manage/
    DayList.tsx, DayRow.tsx
    ExerciseList.tsx, ExerciseRow.tsx, VariantChips.tsx
    AddDayForm.tsx
    AddExerciseForm.tsx   — incluye el desplegable de autocompletado
    AddVariantForm.tsx
```

---

## Desarrollo local

```bash
npm install
npx prisma migrate dev   # crea/actualiza gymtracker.db local
npx prisma db seed       # datos de ejemplo (Josemi/Alba + rutina demo)
npm run dev              # http://localhost:3000
```

`npx prisma studio` abre un explorador visual de la BD en http://localhost:5555.

### Variables de entorno

```env
# .env
DATABASE_URL="file:./gymtracker.db"
```

---

## Producción (Docker)

```bash
docker compose up -d --build
```

La app queda en http://localhost:3333 (puerto configurable en `docker-compose.yml`). Los datos se persisten en el volumen `gymtracker_data`.

### Dockerfile (resumen)

Build multi-stage (`node:20-alpine`), `output: 'standalone'` en `next.config.js`. La imagen final instala `openssl` (necesario para el motor de Prisma en Alpine), copia `.next/standalone`, `.next/static`, `prisma/` y `node_modules/.prisma`, crea un directorio de datos escribible `/app/data`, y arranca con:

```
CMD ["sh", "-c", "node prisma/init-db.js && node prisma/seed.js && node server.js"]
```

La imagen de runtime **no incluye el CLI de Prisma** (sus dependencias transitivas, como el paquete `effect`, no resuelven bien con el output standalone). En su lugar, `prisma/init-db.js` aplica el SQL de las migraciones directamente vía `@prisma/client`.

### docker-compose.yml

```yaml
version: "3.8"

services:
  gymtracker:
    build: .
    ports:
      - "3333:3000"
    volumes:
      - gymtracker_data:/app/data
    environment:
      - DATABASE_URL=file:/app/data/gymtracker.db
    restart: unless-stopped

volumes:
  gymtracker_data:
```

---

## Migraciones — cómo funcionan

**Se aplican automáticamente en cada arranque del contenedor**, vía `prisma/init-db.js`. No hace falta ejecutar nada a mano:

1. Existe una tabla `_migrations` (`name TEXT PRIMARY KEY`) que registra qué migraciones ya se aplicaron a esa BD.
2. Al arrancar, `init-db.js` lista `prisma/migrations/*/` (orden alfabético = orden por timestamp), compara con `_migrations`, y para cada carpeta no aplicada ejecuta su `migration.sql` (dividido por `;`) vía `prisma.$executeRawUnsafe`, y la registra.
3. Para BDs creadas antes de que existiera este sistema (tienen tabla `User` pero no `_migrations`), se bootstrapea `_migrations` con la primera migración (`20260612071304_init`) para no reaplicarla.
4. Después corre `prisma/seed.js` — idempotente, se salta si ya hay algún `User`.
5. Por último arranca `node server.js`.

Esto significa que reconstruir/reiniciar el contenedor sobre el volumen `gymtracker_data` existente **preserva todos los datos** y solo aplica las migraciones nuevas. En los logs se ve algo como `Migration ... already applied` / `Applied migration ...` / `Seed skipped: database already has data`.

### Añadir una migración nueva

1. Editar `prisma/schema.prisma`.
2. Crear a mano (o generar localmente con `prisma migrate dev --name <nombre> --create-only` contra una BD de prueba) una carpeta `prisma/migrations/<timestamp>_<nombre>/migration.sql` con el SQL necesario. El timestamp debe ser mayor que el de la última migración existente.
3. Ejecutar `npx prisma migrate deploy` y `npx prisma generate` localmente para aplicarla en dev y regenerar los tipos del cliente.
4. Reconstruir/reiniciar el contenedor — `init-db.js` la detecta y aplica sola en el próximo arranque.

---

## Docker Swarm (homelab)

SQLite es un único fichero, así que el servicio debe fijarse a **un solo nodo** (1 réplica, sin failover automático salvo con almacenamiento compartido).

```yaml
# stack.yml
version: "3.8"
services:
  gymtracker:
    image: tu-registro/gymtracker:latest
    ports:
      - "3333:3000"
    volumes:
      - gymtracker_data:/app/data
    environment:
      - DATABASE_URL=file:/app/data/gymtracker.db
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.hostname == tu-nodo
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 30s

volumes:
  gymtracker_data:
    external: true
```

```bash
docker volume create gymtracker_data
docker stack deploy -c stack.yml gymtracker
```

Las migraciones y el seed se ejecutan igual que en Docker Compose, automáticamente al arrancar el contenedor.
