# Checklist de Tareas: Sistema de Grupos, Privilegios y Publicadores

## Fase 1: Modelos y Tipos de Datos
- [ ] 1.1 Definir los tipos de datos `Publisher`, `FirestorePublisher`, `Group`, `FirestoreGroup`, `Privilege` y `FirestorePrivilege` en `src/lib/types.ts`.

## Fase 2: Acciones del Servidor (Server Actions)
- [ ] 2.1 Definir Zod schemas para validación de publicadores, grupos y privilegios en `src/lib/actions.ts`.
- [ ] 2.2 Implementar Server Actions para la colección de publicadores (`addPublisherAction`, `updatePublisherAction`, `deletePublisherAction`) en `src/lib/actions.ts`.
- [ ] 2.3 Implementar Server Actions para la colección de grupos (`addGroupAction`, `updateGroupAction`, `deleteGroupAction`) en `src/lib/actions.ts`.
- [ ] 2.4 Implementar Server Actions para la colección de privilegios (`addPrivilegeAction`, `updatePrivilegeAction`, `deletePrivilegeAction`) en `src/lib/actions.ts`.

## Fase 3: Navegación de la Aplicación
- [ ] 3.1 Añadir enlaces para `/publishers`, `/groups` y `/privileges` con sus respectivos iconos de Lucide en `src/app/(app)/layout.tsx`.
- [ ] 3.2 Añadir los mismos enlaces e iconos en el menú lateral de escritorio `src/components/sidebar.tsx`.

## Fase 4: Componentes de Interfaz de Usuario (Diálogos y Acciones)
- [ ] 4.1 Crear el diálogo para añadir/editar publicador `src/components/add-publisher-dialog.tsx`.
- [ ] 4.2 Crear el dropdown de acciones para publicadores `src/components/publisher-actions.tsx`.
- [ ] 4.3 Crear el diálogo para añadir/editar grupo `src/components/add-group-dialog.tsx`.
- [ ] 4.4 Crear el dropdown de acciones para grupos `src/components/group-actions.tsx`.
- [ ] 4.5 Crear el diálogo para añadir/editar privilegio `src/components/add-privilege-dialog.tsx`.
- [ ] 4.6 Crear el dropdown de acciones para privilegios `src/components/privilege-actions.tsx`.

## Fase 5: Páginas de Listado
- [ ] 5.1 Crear la página de administración de publicadores `src/app/(app)/publishers/page.tsx` con listado ordenado.
- [ ] 5.2 Crear la página de administración de grupos `src/app/(app)/groups/page.tsx`.
- [ ] 5.3 Crear la página de administración de privilegios `src/app/(app)/privileges/page.tsx`.
