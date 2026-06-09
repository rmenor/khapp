# Especificación: Sistema de Grupos y Publicadores

## Escenarios de Publicadores (Publishers)

### Escenario 1: Crear un Publicador
- **Dado** que un usuario está en la página de Publicadores,
- **Cuando** hace clic en "Añadir Publicador", ingresa el nombre "Juan Pérez" y hace clic en "Guardar",
- **Entonces** se crea un nuevo publicador con el nombre "Juan Pérez" en Firestore y se actualiza el listado.

### Escenario 2: Validar Nombre del Publicador
- **Dado** que un usuario intenta crear un publicador,
- **Cuando** deja el nombre vacío o con menos de 2 caracteres,
- **Entonces** el sistema debe mostrar un error de validación indicando que el nombre es obligatorio.

### Escenario 3: Editar un Publicador
- **Dado** que existe un publicador con nombre "Juan Pérez",
- **Cuando** el usuario edita el nombre a "Juan Pérez Gómez" y hace clic en "Guardar",
- **Entonces** el nombre del publicador se actualiza en Firestore y en el listado de publicadores.

### Escenario 4: Eliminar un Publicador
- **Dado** que existe un publicador en la lista,
- **Cuando** el usuario hace clic en "Eliminar" y confirma la acción,
- **Entonces** el publicador se elimina de Firestore y desaparece de la vista.

---

## Escenarios de Grupos (Groups)

### Escenario 1: Crear un Grupo con Asignaciones
- **Dado** que existen los publicadores "Juan Pérez", "María López" y "Pedro Gómez" guardados,
- **Cuando** el usuario crea un grupo con nombre "Grupo Norte", asigna como superintendente a "Juan Pérez", como auxiliar a "María López" y añade como miembro a "Pedro Gómez", y hace clic en "Guardar",
- **Entonces** se crea el grupo en Firestore con las referencias correctas de los publicadores y se muestra en el listado.

### Escenario 2: Editar un Grupo
- **Dado** que existe el grupo "Grupo Norte",
- **Cuando** el usuario cambia el nombre a "Grupo Norte Central" y remueve a "Pedro Gómez" de la lista de miembros,
- **Entonces** el grupo se actualiza en Firestore con los nuevos datos.

### Escenario 3: Eliminar un Grupo
- **Dado** que existe un grupo,
- **Cuando** el usuario hace clic en "Eliminar" y confirma,
- **Entonces** el grupo se elimina de Firestore y desaparece de la lista. El borrado de un grupo NO debe eliminar a los publicadores asociados en la colección `publishers`.
