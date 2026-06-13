# GymTracker

App de seguimiento de gimnasio para dos personas (Josemi y Alba). Reemplaza una hoja de cálculo compartida: organiza la rutina por días, ejercicios y variantes, y guarda el peso/reps de cada sesión con autoguardado.

Especificación completa en los archivos `../01-overview.md` a `../06-tasks.md`.

## Desarrollo local

```bash
npm install
npx prisma migrate dev   # crea/actualiza gymtracker.db local
npx prisma db seed       # datos de ejemplo (Josemi/Alba + rutina demo)
npm run dev              # http://localhost:3000
```

`npx prisma studio` abre un explorador visual de la base de datos en http://localhost:5555.

## Producción (Docker)

```bash
docker compose up -d --build
```

La app queda en http://localhost:3333 (puerto configurable en `docker-compose.yml`). Los datos se persisten en el volumen `gymtracker_data`.

Las migraciones se aplican automáticamente al arrancar el contenedor (`prisma/init-db.js`), preservando los datos existentes — no es necesario ejecutar nada manualmente. Ver `../05-setup-docker.md` para el detalle del mecanismo y cómo añadir nuevas migraciones.

## Modelo de datos

Los ejercicios son entidades globales compartidas entre días (tabla de unión `DayExercise`): vincular el mismo ejercicio en varios días comparte sus variantes e historial de peso. Ver `../02-data-model.md`.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Prisma + SQLite.
