# Diseño Técnico: Sistema de Grupos, Privilegios y Publicadores

Este diseño técnico detalla la arquitectura de base de datos, lógica de negocio y componentes visuales para la implementación de las secciones de Publicadores, Grupos y Privilegios.

## 1. Modelo de Datos (Firestore)

### Colección: `publishers`
Cada documento representa un publicador guardado.
- **ID**: Autogenerado por Firestore.
- **Campos**:
  - `name`: `string`

### Colección: `groups`
Cada documento representa un grupo de la congregación.
- **ID**: Autogenerado por Firestore.
- **Campos**:
  - `name`: `string`
  - `superintendentId`: `string` (opcional, referencia al ID del publicador)
  - `auxiliaryId`: `string` (opcional, referencia al ID del publicador)
  - `publisherIds`: `string[]` (array de IDs de publicadores asociados)

### Colección: `privileges`
Cada documento representa un privilegio de servicio (ej: Micrófonos, Sonido, Acomodador).
- **ID**: Autogenerado por Firestore.
- **Campos**:
  - `name`: `string`
  - `publisherIds`: `string[]` (array de IDs de publicadores que tienen este privilegio)

---

## 2. Tipos de Datos TypeScript (`src/lib/types.ts`)

```typescript
export type Publisher = {
    id: string;
    name: string;
};

export type FirestorePublisher = Omit<Publisher, 'id'>;

export type Group = {
    id: string;
    name: string;
    superintendentId?: string;
    auxiliaryId?: string;
    publisherIds: string[];
};

export type FirestoreGroup = Omit<Group, 'id'>;

export type Privilege = {
    id: string;
    name: string;
    publisherIds: string[];
};

export type FirestorePrivilege = Omit<Privilege, 'id'>;
```

---

## 3. Acciones de Servidor (`src/lib/actions.ts`)

### Zod Schemas de Validación
```typescript
const PublisherSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
});

const UpdatePublisherSchema = PublisherSchema.extend({
  id: z.string().min(1),
});

const DeletePublisherSchema = z.object({
  id: z.string().min(1),
});

const GroupSchema = z.object({
  name: z.string().min(2, { message: 'El nombre del grupo debe tener al menos 2 caracteres.' }),
  superintendentId: z.string().optional().nullable(),
  auxiliaryId: z.string().optional().nullable(),
  publisherIds: z.array(z.string()).default([]),
});

const UpdateGroupSchema = GroupSchema.extend({
  id: z.string().min(1),
});

const DeleteGroupSchema = z.object({
  id: z.string().min(1),
});

const PrivilegeSchema = z.object({
  name: z.string().min(2, { message: 'El nombre del privilegio debe tener al menos 2 caracteres.' }),
  publisherIds: z.array(z.string()).default([]),
});

const UpdatePrivilegeSchema = PrivilegeSchema.extend({
  id: z.string().min(1),
});

const DeletePrivilegeSchema = z.object({
  id: z.string().min(1),
});
```

### Funciones (Server Actions)
Se añadirán y exportarán las siguientes funciones:
- `addPublisherAction(data: z.infer<typeof PublisherSchema>)`
- `updatePublisherAction(data: z.infer<typeof UpdatePublisherSchema>)`
- `deletePublisherAction(data: z.infer<typeof DeletePublisherSchema>)`
- `addGroupAction(data: z.infer<typeof GroupSchema>)`
- `updateGroupAction(data: z.infer<typeof UpdateGroupSchema>)`
- `deleteGroupAction(data: z.infer<typeof DeleteGroupSchema>)`
- `addPrivilegeAction(data: z.infer<typeof PrivilegeSchema>)`
- `updatePrivilegeAction(data: z.infer<typeof UpdatePrivilegeSchema>)`
- `deletePrivilegeAction(data: z.infer<typeof DeletePrivilegeSchema>)`

Cada función realizará la validación de campos correspondientes y operaciones CRUD en Firestore (`addDoc`, `updateDoc`, `deleteDoc`). Después, llamará a `revalidatePath('/publishers')`, `revalidatePath('/groups')` y `revalidatePath('/privileges')`.

---

## 4. Diseño de Interfaz de Usuario (UI)

### Navegación (`src/app/(app)/layout.tsx` y `src/components/sidebar.tsx`)
Añadiremos los nuevos enlaces:
- `/publishers` con la etiqueta "Publicadores" y el icono de Lucide `Users`.
- `/groups` con la etiqueta "Grupos" y el icono de Lucide `Layers`.
- `/privileges` con la etiqueta "Privilegios" y el icono de Lucide `Award` o `CheckSquare`.

### Vista de Publicadores (`src/app/(app)/publishers/page.tsx`)
- Tabla simple con el nombre del publicador.
- Acciones: Añadir (Dialog), Editar/Eliminar (Dropdown).

### Vista de Grupos (`src/app/(app)/groups/page.tsx`)
- Grid de Tarjetas (`Card`) que muestran: Nombre del grupo, Superintendente (nombre completo), Auxiliar (nombre completo), Miembros del grupo (recuento y listado).
- Formulario de creación/edición con selects para superintendente y auxiliar, y multiselect o checklist para miembros.

### Vista de Privilegios (`src/app/(app)/privileges/page.tsx`)
- Grid de Tarjetas (`Card`) que muestran: Nombre del privilegio (ej: Sonido) y los nombres de los publicadores que lo poseen.
- Formulario de creación/edición con input para el nombre, y multiselect o checklist para asociar publicadores.

### Diálogos de Formulario (`src/components/`)
1. **`AddPublisherDialog`**: Formulario con campo `name`.
2. **`AddGroupDialog`**: Formulario con input de nombre, selects para superintendente y auxiliar, y multiselect para publicadores.
3. **`AddPrivilegeDialog`**: Formulario con input de nombre y multiselect para publicadores.
