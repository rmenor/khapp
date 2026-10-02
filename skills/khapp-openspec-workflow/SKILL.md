---
name: khapp-openspec-workflow
description: >
  Enforces the spec-driven change workflow used by KH App. Five-phase flow (proposal → specs → design → tasks → verify), Given/When/Then scenario format, archive convention, and the strict_tdd:false manual verification policy.
  Trigger: Adding a new feature or significant change to KH App, creating a new openspec/changes/<date>-<feature>/ folder, writing spec.md or proposal.md, or implementing an archived spec.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- When the user asks for a new feature, refactor, or domain addition that touches more than one file.
- When creating any folder under `openspec/changes/<date>-<feature>/`.
- When writing a `proposal.md`, `specs/<feature>/spec.md`, `design.md`, `tasks.md`, or `verify-report.md`.
- When implementing an already-archived spec (look at `openspec/changes/archive/<date>-<feature>/` for the canonical example).

## Critical Patterns

### 1. KH App Uses Spec-Driven Changes

This project does NOT use the standard "just code it" workflow. Every non-trivial change goes through [openspec/](file:///Users/ramonmenor/trabajo/github/khapp/openspec/), which mirrors the [OpenSpec](https://github.com/Fission-AI/OpenSpec) convention but with project-specific tweaks defined in [openspec/config.yaml](file:///Users/ramonmenor/trabajo/github/khapp/openspec/config.yaml).

When in doubt, look at [openspec/changes/archive/2026-06-09-groups-system/](file:///Users/ramonmenor/trabajo/github/khapp/openspec/changes/archive/2026-06-09-groups-system/) — it is the canonical example of a complete change.

### 2. The Five-Phase Flow

The change lifecycle is **proposal → specs → design → tasks → apply → verify**:

| Phase | File | Owner | Output |
|-------|------|-------|--------|
| 1. Proposal | `proposal.md` | Planner | Goal, scope, approach, rollback plan, impacted files |
| 2. Specs | `specs/<feature>/spec.md` | Spec writer | User scenarios in Given/When/Then |
| 3. Design | `design.md` | Architect | Data model, schemas, actions, UI components |
| 4. Tasks | `tasks.md` | Implementer | Checklist of files to create/modify |
| 5. Apply | (code) | Implementer | The actual changes in `src/` |
| 6. Verify | `verify-report.md` | QA | Automated checks + manual browser steps |

After verify, the entire folder is moved to `openspec/changes/archive/<date>-<feature>/` and the `state.yaml` is updated.

### 3. The `config.yaml` Rules Are Binding

[openspec/config.yaml](file:///Users/ramonmenor/trabajo/github/khapp/openspec/config.yaml) defines rules per phase. Read it before writing any spec. Key rules to honor:

- **proposal**: "Define clear schema requirements for Publishers and Groups" (replace with your feature's entities)
- **specs**: "Specify user scenarios for X management (CRUD)" and "for Y management (CRUD, member assignment)"
- **design**: "Design Firestore data structures (collections)" and "Document Next.js Server Actions and UI layout"
- **tasks**: "Break down tasks into model additions, server actions, navigation, and frontend page layouts"
- **apply**: "Follow clean Next.js patterns, use shadcn/ui components, and zod validation" with `strict_tdd: false`
- **verify**: "Manual verification via browser page testing" + "Run linter and type-checker"

**Anti-pattern**: do NOT write a `tasks.md` that includes a "Tests" section — the project runs with `strict_tdd: false`. There is no test runner in this repo.

### 4. Spec Format: Given/When/Then (Spanish)

Scenarios in `spec.md` use the **Given/When/Then** structure, written in Spanish. Each scenario is a single, testable user behavior. Cover the happy path AND at least the validation-failure path AND the cascade-deletion path if applicable. Reference: [openspec/specs/groups/spec.md](file:///Users/ramonmenor/trabajo/github/khapp/openspec/specs/groups/spec.md) and [openspec/specs/privileges/spec.md](file:///Users/ramonmenor/trabajo/github/khapp/openspec/specs/privileges/spec.md).

```markdown
### Escenario 1: Crear un Publicador
- **Dado** que un usuario está en la página de Publicadores,
- **Cuando** hace clic en "Añadir Publicador", ingresa el nombre "Juan Pérez" y hace clic en "Guardar",
- **Entonces** se crea un nuevo publicador con el nombre "Juan Pérez" en Firestore y se actualiza el listado.
```

### 5. Folder Naming Convention

`openspec/changes/<ISO-date>-<feature-name>/`

- Date is **ISO format**: `YYYY-MM-DD` (e.g. `2026-06-09`).
- Feature name is **kebab-case**, short and descriptive (e.g. `groups-system`, `annual-meeting`).
- After verify, the folder is moved as-is to `openspec/changes/archive/`.

### 6. Proposal.md Has a Fixed Shape

Every `proposal.md` MUST have these sections, in this order:

1. **Goal** — one paragraph, in Spanish.
2. **Scope** — In-Scope (bulleted) and Out-of-Scope (bulleted).
3. **Technical Approach** — numbered list of high-level steps.
4. **Rollback Plan** — what to undo if it breaks.
5. **Impacted Files / Modules** — bulleted list of files to modify or create.

Reference: [proposal.md](file:///Users/ramonmenor/trabajo/github/khapp/openspec/changes/archive/2026-06-09-groups-system/proposal.md).

### 7. Design.md Has a Fixed Shape

Every `design.md` MUST have these sections:

1. **Modelo de Datos (Firestore)** — collections and their fields.
2. **Tipos de Datos TypeScript** — full TypeScript code blocks for client + Firestore shapes.
3. **Acciones de Servidor** — Zod schemas + action signatures.
4. **Diseño de Interfaz de Usuario (UI)** — navigation changes + per-page component layout.

Reference: [design.md](file:///Users/ramonmenor/trabajo/github/khapp/openspec/changes/archive/2026-06-09-groups-system/design.md).

### 8. Tasks.md is a Phase-Grouped Checklist

Group tasks by phase, in this order:

- **Fase 1**: Modelos y Tipos de Datos
- **Fase 2**: Acciones del Servidor (Server Actions)
- **Fase 3**: Navegación de la Aplicación
- **Fase 4**: Componentes de Interfaz de Usuario (Diálogos y Acciones)
- **Fase 5**: Páginas de Listado

Each task has a checkbox `- [ ]` and a file path. Mark checkboxes as done during `apply`. Reference: [tasks.md](file:///Users/ramonmenor/trabajo/github/khapp/openspec/changes/archive/2026-06-09-groups-system/tasks.md).

### 9. Verify-Report.md Has a Fixed Shape

Every `verify-report.md` MUST include:

1. **Pruebas Automatizadas** — output of `npm run typecheck` and `npm run lint`, both expected to pass.
2. **Plan de Verificación Manual (Pasos en el Navegador)** — numbered browser steps covering the happy path AND the edge cases defined in the spec.

Reference: [verify-report.md](file:///Users/ramonmenor/trabajo/github/khapp/openspec/changes/archive/2026-06-09-groups-system/verify-report.md).

### 10. Specs Live Under the Change Folder, Not at the Repo Root

`openspec/specs/<feature>/spec.md` at the **repo root** is for specs that have been **promoted** out of a change (i.e. they describe a stable, shipped feature). The new `specs/<feature>/spec.md` inside `openspec/changes/<date>-<feature>/` is for the in-progress change. After archive, the spec may be promoted to the root.

Currently at the root: `openspec/specs/groups/spec.md` and `openspec/specs/privileges/spec.md` (both promoted from the 2026-06-09 change).

## Code Examples

### Canonical Change Folder Layout

```
openspec/
  config.yaml
  specs/                                  # Promoted (shipped) specs
    groups/spec.md
    privileges/spec.md
  changes/
    archive/
      2026-06-09-groups-system/           # ← The complete example
        proposal.md
        specs/
          groups/spec.md                  # Was promoted → moved to /specs/groups/
          privileges/spec.md              # Was promoted → moved to /specs/privileges/
        design.md
        tasks.md
        verify-report.md
        state.yaml                        # Change state machine (draft|applied|archived)
    <NEW> 2026-MM-DD-<feature-name>/
      proposal.md
      specs/
        <feature>/
          spec.md
      design.md
      tasks.md
      (no verify-report.md yet — created at verify phase)
```

### Minimal `proposal.md` Skeleton

```markdown
# Propuesta de Cambio: <Título>

## Goal
<Un párrafo describiendo el objetivo>

## Scope

### En el alcance (In-Scope)
- **Modelos de datos**: ...
- **Base de datos (Firestore)**: ...
- **Server Actions**: ...
- **Navegación**: ...
- **Interfaz de Usuario (UI)**: ...

### Fuera del alcance (Out-of-Scope)
- ...

## Technical Approach
1. **Tipos de datos**: Modificar `src/lib/types.ts` para definir ...
2. **Acciones de Firebase**: Implementar acciones de servidor en `src/lib/actions.ts` ...
3. ...

## Rollback Plan
- Revertir los archivos modificados a su estado inicial en Git.
- Eliminar las carpetas de páginas creadas.
- Eliminar las colecciones de Firestore creadas.

## Impacted Files / Modules
- `src/lib/types.ts` (modificación)
- `src/lib/actions.ts` (modificación)
- `src/app/(app)/...` (nuevo)
- `src/components/...` (nuevo)
```

### Minimal `spec.md` Scenario Block

```markdown
# Especificación: <Nombre de la Feature>

## Escenarios de <Entidad 1>

### Escenario 1: <Acción>
- **Dado** que <precondición>,
- **Cuando** <acción del usuario>,
- **Entonces** <resultado esperado>.

### Escenario 2: Validar <Campo>
- **Dado** que <precondición>,
- **Cuando** <entrada inválida>,
- **Entonces** <mensaje de error esperado>.
```

## Commands

```bash
# Inside the change folder, after writing all docs:
npm run typecheck    # Must pass before verify-report.md is written
npm run lint         # Must pass before verify-report.md is written

# Manual browser steps listed in verify-report.md must be executed
# before moving the folder to /archive/.

# After verify:
mv openspec/changes/<date>-<feature>/ openspec/changes/archive/
# Update state.yaml inside the archived folder to "archived"
```

## Anti-Patterns (Read Before Modifying)

- ❌ **Do not** start coding a non-trivial feature without first writing a `proposal.md`. The spec-driven flow is the project's contract.
- ❌ **Do not** write tests in `tasks.md` — `strict_tdd: false` and there is no test runner.
- ❌ **Do not** write the spec in English. KH App specs are in Spanish.
- ❌ **Do not** skip the `Rollback Plan` in `proposal.md`. It's required.
- ❌ **Do not** archive a change before `verify-report.md` is filled in. The archive is the audit trail.
- ❌ **Do not** move the spec out of the change folder unless it's been promoted to "shipped" status.
- ❌ **Do not** omit the cascading-deletion scenario when the feature involves a "parent" entity that owns references (groups own publisher references, etc.).
