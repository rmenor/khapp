# KH App

Aplicación Next.js para la gestión de finanzas y asignaciones anuales de una congregación.

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack)
- **React 18** + **TypeScript**
- **Tailwind CSS 3** + **shadcn/ui** (Radix UI)
- **SQLite local** (`node:sqlite`) para el dominio de contabilidad
- **Firebase Firestore** para el resto de dominios
- **unpdf** (pdf.js) para la extracción del texto de los informes PDF
- **Recharts** para los gráficos
- **Genkit** + Google AI (funciones IA)
- **PWA** vía `next-pwa`

> **Requisito de Node:** 22.5 o superior (`node:sqlite` es un módulo integrado y
> necesita esa versión o posterior). Hay un `.nvmrc` en el repositorio.

## Estructura

```
src/
├── app/           # Páginas (App Router)
├── components/    # UI Components
│   └── finance/   # Componentes del módulo de contabilidad
├── lib/
│   ├── db/        # Cliente SQLite, esquema y consultas de contabilidad
│   ├── finance/   # Importación de PDF, parsers y normalizadores
│   ├── ai/        # Genkit flows
│   └── hooks/     # Custom hooks
```

## Contabilidad: importación de informes PDF

El módulo de finanzas lee los informes mensuales de la congregación (formularios
**S-26** "Hoja de cuentas" y **S-30** "Informe mensual de las cuentas") y los
convierte en datos consultables.

Puntos importantes:

- **Los PDF nunca se guardan.** Se procesan en memoria y se descartan. En el
  registro de importaciones solo queda el hash, el nombre, la fecha y el número
  de filas.
- **El mes se lee de la cabecera del PDF**, no del nombre del fichero. Si no
  coinciden, se avisa.
- **Los ficheros que no son S-26 ni S-30 se ignoran** sin romper la importación
  (por ejemplo, "Estado de cuentas", "Acuse de recibo de donaciones", "TO-62").
- **Un PDF escaneado se detecta y se avisa**: "parece un escaneo, no puedo
  leerlo". No se inventa ninguna cifra.
- Los importes con dos cifras en una misma fila (entrada en una cuenta y salida
  en otra) **se conservan por separado**; nunca se suman a ciegas.

### La contabilidad es local: dónde se ejecuta

La contabilidad guarda sus datos en un fichero SQLite en el disco del servidor
que la ejecuta. Por eso **la parte de finanzas se usa en local**, ejecutando la
aplicación en tu propio equipo:

```bash
npm install
npm run db:init          # crea data/contabilidad.db con el esquema vacío
npm run dev              # http://localhost:3000
```

Es la única forma en que el "importar en lote desde una carpeta" tiene
sentido: la carpeta del vault está en tu equipo, y la aplicación lee de ella
**en modo lectura**, sin copiar, mover ni borrar nada.

En el despliegue en **Firebase App Hosting** (Cloud Run) el sistema de ficheros
es de solo lectura, así que ahí no se puede crear la base de datos. `/finance`
lo detecta y lo explica con un aviso; el resto de la aplicación (publicadores,
grupos, privilegios, solicitudes) funciona con normalidad. Si en algún momento
se despliega en un servidor con disco, la contabilidad funciona tal cual, sin
cambios de código.

La ruta de la base de datos se puede cambiar con `CONTABILIDAD_DB_PATH`.

### Importar informes

1. Entra en **Finanzas → Importar**.
2. Arrastra los PDF (o usa el selector). También puedes indicar una carpeta
   local para importarla en lote **en modo lectura**: no se copia, mueve ni
   borra nada de ella.
3. Revisa la **vista previa**: mes detectado, número de movimientos, totales,
   avisos y la tabla de movimientos. Puedes corregir el concepto de cada
   movimiento antes de confirmar.
4. Pulsa **Confirmar importación**. Si el mes ya estaba importado, se ofrece
   reemplazarlo.

El **cuadre S-30 / S-26** aparece en el panel de finanzas: cuando algo no
cuadra, la diferencia se muestra en rojo.

### Comandos de utilidad

| Comando | Descripción |
|---------|-------------|
| `npm run db:init` | Crea la base de datos con el esquema vacío |
| `npm run db:demo` | Genera `data/contabilidad.demo.db` con 3 meses de ejemplo (sin datos personales) |
| `npm run finance:inspect -- <pdf>` | Diagnóstico de un PDF: líneas, columnas, movimientos y avisos |
| `npm run finance:report` | Lista los meses importados y los que han fallado, con su motivo |
| `npm test` | Tests (vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run dev` | Desarrollo con Turbopack |
| `npm run build` | Build de producción |

Para probar la interfaz sin datos reales:

```bash
npm run db:demo
CONTABILIDAD_DB_PATH=data/contabilidad.demo.db npm run dev
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo con Turbopack |
| `npm run build` | Build producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Tests con vitest |
| `npm run genkit:dev` | Genkit dev server |

## Documentación

Ver `docs/` para detalles de arquitectura:
- `docs/architecture.md` — Stack y patrones
- `docs/project-structure.md` — Estructura y convenciones
- `docs/data-model.md` — Modelo de datos
- `docs/contabilidad.md` — Módulo de contabilidad: importación, esquema y cuadre
- `docs/setup.md` — Configuración de desarrollo
- `docs/workflows.md` — Flujos de trabajo

## Estado Actual

- ✅ Contabilidad local con SQLite e importación de informes PDF
- ✅ Panel, movimientos con filtros combinables, estadísticas y conceptos
- ✅ Asignaciones anuales (charlas, conmemoración)
- ✅ PWA instalable
- ⚠️ Autenticación propia con cookie HMAC (`__session`)
