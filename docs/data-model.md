# Data Model

## Firestore Collections

### transactions
```typescript
{
  id: string;              // Auto-generado
  type: 'income' | 'expense' | 'branch_transfer';
  amount: number;          // Positivo siempre
  date: Timestamp;
  description: string;     // Max 100 chars
  category?: 'congregation' | 'worldwide_work' | 'renovation'; // Solo income
  status?: 'Completado' | 'Pendiente de envío' | 'Enviado';
}
```

**Reglas de negocio**:
- `income` con `category: 'congregation'` → status: `'Completado'`
- `income` con otras categorías → status: `'Pendiente de envío'`
- `branch_transfer` → status: `'Completado'` (agrupa ingresos enviados)
- `expense` → status: `'Completado'`

### requests
```typescript
{
  id: string;
  name: string;            // Min 3 chars
  months: string[];        // Meses solicitados (ej. ['Enero', 'Febrero'])
  isContinuous: boolean;   // Servicio continuo
  hours?: 15 | 30;        // Solo si !isContinuous
  requestDate: Timestamp;
  endDate?: Timestamp;      // Cuando se paraliza
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
  year: number;
}
```

### resolutions
```typescript
{
  id: string;
  description: string;
  amount: number;
  startDate: Timestamp;
  isActive: boolean;
}
```

### pioneer_talks
```typescript
{
  id: string;
  year: number;
  date: Timestamp;
  speaker1: string;
  speaker2: string;
  openingPrayer: string;
  closingPrayer: string;
}
```

### special_talks
```typescript
{
  id: string;
  year: number;
  date: Timestamp;
  president: string;
  speaker: string;
  closingPrayer: string;
  auxiliarySpeaker: string;
}
```

### memorials
```typescript
{
  id: string;
  year: number;
  date: Timestamp;
  president: string;
  openingPrayer: string;
  speaker: string;
  breadPrayer: string;
  winePrayer: string;
}
```

### congregations/main (documento único)
```typescript
{
  name: string;  // Nombre de la congregación
}
```

## Conversiones de Fecha

Firestore usa `Timestamp`, el cliente usa `Date`:

```typescript
// Cliente → Firestore
Timestamp.fromDate(new Date(dateString))

// Firestore → Cliente (en componente)
const transaction: Transaction = {
  ...data,
  date: data.date.toDate(),  // Timestamp → Date
}
```
