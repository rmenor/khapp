# Propuesta de Cambio: Sistema de Grupos, Privilegios y Publicadores

## Goal (Objetivo)
Implementar una sección independiente de **Publicadores** (con CRUD básico), una sección de **Grupos** (con superintendente, auxiliar y miembros), y una sección de **Privilegios** (nombre del privilegio y múltiples publicadores asociados).

## Scope (Alcance)

### En el alcance (In-Scope)
- **Modelos de datos**:
  - `Publisher`: `id`, `name`.
  - `Group`: `id`, `name`, `superintendentId` (referencia a Publisher), `auxiliaryId` (referencia a Publisher), `publisherIds` (array de referencias a Publisher).
  - `Privilege`: `id`, `name`, `publisherIds` (array de referencias a Publisher).
- **Base de datos (Firestore)**:
  - Colección `publishers`.
  - Colección `groups`.
  - Colección `privileges`.
- **Server Actions**:
  - CRUD para `publishers` (`addPublisherAction`, `updatePublisherAction`, `deletePublisherAction`).
  - CRUD para `groups` (`addGroupAction`, `updateGroupAction`, `deleteGroupAction`).
  - CRUD para `privileges` (`addPrivilegeAction`, `updatePrivilegeAction`, `deletePrivilegeAction`).
- **Navegación**:
  - Añadir enlaces a `/publishers` ("Publicadores"), `/groups` ("Grupos") y `/privileges` ("Privilegios") en la barra lateral (`Sidebar`) y en el menú móvil (`layout`).
- **Interfaz de Usuario (UI)**:
  - Página `/publishers` con listado y modal CRUD.
  - Página `/groups` con listado/tarjetas y modal CRUD con campos para superintendente, auxiliar y multiselección de publicadores.
  - Página `/privileges` con listado/tarjetas de privilegios y modal CRUD para asignar múltiples publicadores asociados.

### Fuera del alcance (Out-of-Scope)
- Asignación de roles de administrador de la app basados en estos privilegios.

## Technical Approach (Enfoque Técnico)
1. **Tipos de datos**: Modificar `src/lib/types.ts` para definir `Publisher`, `Group` y `Privilege`, y sus respectivas versiones de Firestore.
2. **Acciones de Firebase**: Implementar acciones de servidor en `src/lib/actions.ts` usando Zod para validar las entradas de la UI y los métodos de Firestore.
3. **Navegación**: Modificar `src/app/(app)/layout.tsx` y `src/components/sidebar.tsx` usando iconos correspondientes de Lucide (ej. `Users`, `Layers`, `Award`).
4. **Vistas de UI**:
   - `/publishers`: Crear carpeta `src/app/(app)/publishers` con su `page.tsx`.
   - `/groups`: Crear carpeta `src/app/(app)/groups` con su `page.tsx`.
   - `/privileges`: Crear carpeta `src/app/(app)/privileges` con su `page.tsx`.

## Rollback Plan (Plan de Retorno)
Si este cambio causa inestabilidad:
- Revertir los archivos modificados a su estado inicial en Git.
- Eliminar las carpetas de páginas creadas (`src/app/(app)/groups`, `src/app/(app)/publishers`, `src/app/(app)/privileges`).
- Eliminar las colecciones de Firestore creadas (`publishers`, `groups` y `privileges`).

## Impacted Files / Modules
- `src/lib/types.ts` (modificación)
- `src/lib/actions.ts` (modificación)
- `src/app/(app)/layout.tsx` (modificación)
- `src/components/sidebar.tsx` (modificación)
- `src/app/(app)/publishers/page.tsx` (nuevo)
- `src/app/(app)/groups/page.tsx` (nuevo)
- `src/app/(app)/privileges/page.tsx` (nuevo)
- `src/components/add-publisher-dialog.tsx` (nuevo)
- `src/components/publisher-actions.tsx` (nuevo)
- `src/components/add-group-dialog.tsx` (nuevo)
- `src/components/group-actions.tsx` (nuevo)
- `src/components/add-privilege-dialog.tsx` (nuevo)
- `src/components/privilege-actions.tsx` (nuevo)
