# Especificación: Sistema de Privilegios

## Escenarios de Privilegios (Privileges)

### Escenario 1: Crear un Privilegio con Publicadores Asociados
- **Dado** que existen los publicadores "Juan Pérez" y "María López" guardados,
- **Cuando** el usuario crea un privilegio con el nombre "Micrófono" y selecciona a "Juan Pérez" y "María López" como publicadores con ese privilegio, y hace clic en "Guardar",
- **Entonces** el privilegio se crea en Firestore y aparece en el listado mostrando que tiene 2 publicadores asociados.

### Escenario 2: Validar Campos de Privilegio
- **Dado** que el usuario intenta crear un privilegio,
- **Cuando** deja el nombre del privilegio vacío o con menos de 2 caracteres,
- **Entonces** el sistema debe mostrar un error indicando que el nombre del privilegio es obligatorio.

### Escenario 3: Editar un Privilegio
- **Dado** que existe el privilegio "Micrófono" con "Juan Pérez" y "María López",
- **Cuando** el usuario cambia el nombre a "Sonido" y elimina a "Juan Pérez" de la lista de publicadores asociados,
- **Entonces** el privilegio se actualiza en Firestore con los nuevos datos ("Sonido" y solo "María López" asociado).

### Escenario 4: Eliminar un Privilegio
- **Dado** que existe un privilegio en la lista,
- **Cuando** el usuario hace clic en "Eliminar" y confirma la acción,
- **Entonces** el privilegio se elimina de Firestore y desaparece de la vista. Esto NO debe borrar a los publicadores asociados de la colección de `publishers`.
