# Especificación: Contabilidad local con SQLite e importación de informes PDF

## Escenarios de Importación

### Escenario 1: Importar los informes de un mes
- **Dado** que el usuario está en la página de Importar de Finanzas,
- **Cuando** arrastra el S-26 y el S-30 de un mes y pulsa "Confirmar importación",
- **Entonces** el mes se guarda en la base de datos local con sus movimientos, sus líneas de resumen y sus totales, y el histórico de importaciones muestra el nombre del fichero, la fecha y el número de filas.

### Escenario 2: Previsualizar antes de confirmar
- **Dado** que el usuario ha subido varios PDF,
- **Cuando** termina el análisis,
- **Entonces** aparece una vista previa con el mes detectado, el número de movimientos, los totales y los avisos, y **no** se ha escrito nada todavía en la base de datos.

### Escenario 3: Corregir la clasificación de un movimiento
- **Dado** que el usuario está revisando la vista previa y un movimiento aparece con un concepto que no es el correcto,
- **When** cambia el concepto de ese movimiento y confirma,
- **Entonces** el movimiento se guarda con el concepto elegido.

### Escenario 4: Importar un PDF que no es S-26 ni S-30
- **Dado** que el usuario sube un fichero como "Estado de cuentas - 08-2026.pdf" o un acuse de recibo,
- **When** se analiza el PDF,
- **Entonces** el fichero se ignora sin error y el resto de los ficheros se importan con normalidad.

### Escenario 5: PDF sin capa de texto (escaneo)
- **Dado** que el usuario sube un PDF que es una imagen escaneada,
- **When** se analiza el PDF,
- **Entonces** la aplicación avisa "parece un escaneo, no puedo leerlo", no extrae ninguna cifra y no guarda ninguna fila.

### Escenario 6: Mes ya importado
- **Dado** que el usuario ya importó un mes y vuelve a subir sus mismos PDF,
- **When** se analiza el PDF,
- **Entonces** la aplicación avisa de que el mes ya está importado, indica que el fichero es idéntico al anterior y ofrece reemplazar el mes o cancelar.

### Escenario 7: El nombre del fichero no coincide con la cabecera
- **Dado** que el PDF dice "septiembre de 2026" pero el fichero se llama "S-26-agosto2026.pdf",
- **When** se analiza el PDF,
- **Entonces** la aplicación avisa de la discrepancia y usa el mes de la cabecera.

### Escenario 8: Importar una carpeta completa
- **Dado** que el usuario indica la ruta de la carpeta con los informes,
- **When** pulsa "Importar carpeta",
- **Entonces** se analizan todos los PDF de la carpeta y subcarpetas, **sin** copiar, mover ni borrar ningún fichero de ella.

### Escenario 9: Ningún fichero queda en el disco
- **Dado** que el usuario ha importado los informes,
- **When** se revisa el disco y la tabla de importaciones,
- **Entonces** no hay ningún PDF en el disco ni en `tmp`, y en la tabla de importaciones solo constan el hash, el nombre del fichero, la fecha, el número de filas y los avisos.

## Escenarios de Consulta

### Escenario 10: Filtrar los movimientos
- **Dado** que el usuario está en la pantalla de Movimientos,
- **When** combina filtros de año, mes, trimestre, concepto, código CT, cuenta, texto libre y rango de importe,
- **Entonces** la tabla muestra solo los movimientos que cumplen todos los filtros, los totales se recalculan con el filtro aplicado y el periodo activo se muestra en pantalla.

### Escenario 11: Compartir una vista filtrada
- **Dado** que el usuario ha aplicado unos filtros,
- **When** copia la URL de la barra de direcciones y la abre en otro navegador,
- **Entonces** se ve exactamente la misma vista, con los mismos filtros y los mismos totales.

### Escenario 12: Exportar la vista filtrada
- **Dado** que el usuario está en la pantalla de Movimientos con unos filtros aplicados,
- **When** pulsa el botón de exportar a CSV o el de exportar a PDF,
- **Entonces** el fichero exportado contiene únicamente los movimientos de la vista filtrada.

### Escenario 13: Ver el cuadre de un mes
- **Dado** que el usuario está en el panel de Finanzas,
- **When** mira la tabla de cuadre,
- **Entonces** se comparan los ingresos y los gastos del resumen (S-30) con la suma de los movimientos (S-26) y el saldo calculado con el saldo inicial, y cualquier diferencia se muestra en rojo.

### Escenario 14: Un traspaso entre cuentas no es un gasto
- **Dado** que un mes tiene un movimiento con entrada en una cuenta y salida en otra (por ejemplo, un depósito de la caja al banco),
- **When** se calcula el cuadre del mes,
- **Entonces** ese movimiento no cuenta como ingreso ni como gasto, pero sí mueve los fondos, de modo que el saldo final del mes sigue cuadrando.

## Escenarios de Conceptos

### Escenario 15: Crear un concepto
- **Dado** que el usuario está en la pantalla de Conceptos,
- **When** añade un concepto con su nombre, su tipo (ingreso, gasto o traspaso), su categoría y su código CT,
- **Entonces** el concepto queda disponible para clasificar movimientos, tanto al importar como al corregir la vista previa.

### Escenario 16: Crear una regla de asignación
- **Dado** que el usuario está en la pantalla de Conceptos,
- **When** crea una regla que dice que un texto corresponde a un concepto,
- **Entonces** los movimientos cuya descripción contenga ese texto se clasifican con ese concepto.

### Escenario 17: Reaplicar las reglas
- **Dado** que el usuario ha creado una regla nueva y hay movimientos ya importados sin clasificar,
- **When** pulsa "Reaplicar conceptos a todos los movimientos",
- **Entonces** todos los movimientos se vuelven a clasificar con los códigos CT y las reglas actuales, sin necesidad de volver a subir los PDF.

## Escenarios de Datos

### Escenario 18: Borrar el contenido de un mes
- **Dado** que el usuario decide empezar de cero,
- **When** se borra la base de datos local,
- **Entonces** no queda ningún dato de contabilidad y se puede volver a importar todo desde los PDF.

### Escenario 19: La aplicación funciona sin los PDF
- **Dado** que la aplicación está cerrada y los PDF originales ya no están disponibles,
- **When** se vuelve a abrir la aplicación,
- **Entonces** los meses importados, sus movimientos y el histórico siguen disponibles, porque están en la base de datos local.
