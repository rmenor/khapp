# Key Workflows

## Flujo de Ingresos

1. Usuario abre `AddIncomeDialog` → selecciona categoría + monto + fecha
2. Server Action `addIncomeAction()` valida con Zod
3. Si `category === 'congregation'` → status: `'Completado'`
4. Si no → status: `'Pendiente de envío'`
5. Firestore `addDoc(collection('transactions'), {...})`
6. `revalidatePath('/finance')` → UI actualiza

### Ingreso por Lotes (Batch)
`/finance` → "Añadir Ingresos" → múltiples cantidades para una fecha
- Usa `writeBatch()` para atomicidad
- Todas las transacciones comparten la misma fecha

## Flujo de Envío a Sucursal (Branch Transfer)

1. Seleccionar ingresos con status `'Pendiente de envío'`
2. `addBranchTransferAction()`:
   - `writeBatch()` actualiza status a `'Enviado'` en cada transacción
   - Crea nueva transacción tipo `'branch_transfer'`
3. `revalidatePath('/finance')`

## Flujo de Solicitudes de Precursoría

### Crear Solicitud
1. `AddRequestDialog` → nombre, año, tipo (continuo/mensual)
2. Si mensual: seleccionar meses + horas (15 o 30)
3. `addRequestAction()` → status inicial: `'Pendiente'`

### Aprobar/Rechazar
1. `RequestActions` component → botones en la tabla
2. `updateRequestStatusAction(id, 'Aprobado' | 'Rechazado')`

### Paralizar Servicio Continuo
1. `updateRequestStatusAction()` + `paralyzeRequestAction()`
2. Establece `endDate: Timestamp.now()`

## Flujo PWA

```
Build → next-pwa genera service worker en /public
→ manifest.json registrado
→ Navegador instala como app nativa
→ Funciona offline (según cache strategy)
```

## Navegación

| Ruta | Descripción | Auth |
|------|-------------|------|
| `/` | Redirect → `/dashboard` | ✅ |
| `/dashboard` | Gráficas de ingresos/gastos | ✅ |
| `/finance` | CRUD transacciones + resoluciones | ✅ |
| `/requests` | Gestión solicitudes precursoría | ✅ |
| `/requests/pub` | Formulario público (sin auth) | ❌ |
| `/annual-assignments` | Charlas y conmemoración | ✅ |
| `/settings` | Nombre congregación | ✅ |
| `/login` | Login mock | ❌ |

**Auth check**: `(app)/layout.tsx` verifica `localStorage.isAuthenticated` en `useEffect`
