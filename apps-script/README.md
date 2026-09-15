# Invitaciones automáticas y pases asignados

**Tu trabajo habitual: escribir nombre y pases en la hoja y copiar el mensaje.**
El invitado únicamente responde Sí o No. No puede elegir la cantidad de pases.

## Activar esta actualización una sola vez

Como ya configuraste el Apps Script anterior:

1. Sustituye su código por el nuevo `Code.gs` de esta carpeta.
2. Guarda el código y recarga la hoja. En **Boda → Activar o reparar automatización**,
   acepta los permisos. Si el menú no aparece, ejecuta **`onOpen`** desde el editor
   vinculado a la hoja. Las funciones terminadas en `_` no aparecen en el selector.
   Conserva las propiedades `URL_INVITACION` y `SPREADSHEET_ID`
   que ya tenías. Si falta el ID, se toma de la hoja vinculada al editor.
3. Actualiza la implementación existente a una **Nueva versión**. Así mantienes
   la misma URL `/exec`. Publica también `index.html`, `assets/app.js` y
   `assets/styles.css` actualizados en GitHub Pages.
4. Vuelve a abrir Google Sheets. Aparecerá el menú **Boda**.

Puedes activar la automatización antes de publicar: si falta `URL_INVITACION`,
prepara los identificadores y estados dejando los enlaces nuevos vacíos.
Cuando publiques, usa **Boda → Configurar dirección de la invitación** y pega
la dirección del sitio. Se generan todos los enlaces y mensajes de una vez,
conservando los identificadores. No hace falta editar las propiedades a mano.

No necesitas ejecutar funciones cada vez que agregas invitados. La instalación
crea dos disparadores: al editar la hoja y al abrirla. Ejecutarla otra vez no
crea duplicados de esos disparadores para tu cuenta. Instálalos solo desde la
cuenta propietaria, no desde varias cuentas colaboradoras.

## Uso diario

En la pestaña **Invitaciones**, completa las columnas A y B:

| Nombre | Maximo |
| --- | ---: |
| Familia Rosales | 4 |
| Ana García | 1 |

**`Maximo` ahora significa pases asignados exactos.** Conservamos ese encabezado
para no romper tu hoja existente. Se permiten de 1 a 9; una familia de cuatro
confirma cuatro pases si responde Sí, o cero si responde No.

Al terminar de escribir o pegar una lista, se completan automáticamente:

| Columna | Contenido |
| --- | --- |
| C · Token | Identificador privado; no editar. |
| D · Enlace | Invitación individual lista para compartir. |
| E · Folio anterior | Solo para migrar pases del primer script; normalmente vacía. |
| F · Mensaje para enviar | Texto con nombre, pases y enlace. Cópialo en WhatsApp. |
| G · Estado | Pendiente, Confirmado, No asistirá o Ya ingresó. |
| H · Pases confirmados | Pases del grupo si confirmó; cero si no asistirá. |

**Copia el mensaje de F y envíalo a la persona correspondiente.** Preparar el
mensaje no lo envía automáticamente. No se necesita WhatsApp Business ni otro servicio.
El enlace sigue siendo el mismo si vuelves a actualizar la fila.

Las confirmaciones actualizan G y H directamente desde el servidor. Los detalles
(teléfono, mensaje, fecha, folio y entrada) siguen en la pestaña **Hoja 1**.
No hace falta abrir el editor para consultarlos.

## Cambiar algo o corregir un problema

- **Cambiar pases o nombre:** edita A/B en `Invitaciones`. Se actualiza también
  la confirmación existente. Si ya descargaron el pase, pídeles abrir el mismo
  enlace y descargarlo otra vez; al escanear siempre se consulta la hoja actual.
- **Solo asistirá parte de la familia:** te lo comunica y tú ajustas B. El invitado
  no puede cambiar esa cantidad desde la página.
- **Cambiar Sí por No o viceversa:** edita Asiste (D) de `Hoja 1`, usando exactamente
  `Sí` o `No`. La automatización asigna los pases de B o cero, respectivamente.
- **Pausar una invitación:** coloca `0` en B. Se bloquean su enlace de confirmación
  y el registro de entrada. Restaura un número válido para habilitarla nuevamente.
  Sus datos históricos permanecen; H conserva el último registro hasta reactivarla.
- **Fila incompleta:** la columna Estado te pide completar nombre y pases. No
  impide generar enlaces para otras filas completas.
- **No se actualizó:** usa **Boda → Actualizar enlaces y confirmaciones**. Revisa
  tokens duplicados, encabezados cambiados, folios anteriores o configuración si falla.
  El menú **Activar o reparar automatización** reinstala los disparadores faltantes.

La automatización responde a ediciones manuales y pegado de filas en Sheets.
Cambios realizados por otros scripts, importaciones automáticas o fórmulas no
activan el disparador de edición: después usa el menú de actualización. Evita
fórmulas en los nombres y columnas de control.

## Confirmaciones anteriores

Las invitaciones con token del script anterior conservan sus enlaces. Al actualizar,
una confirmación positiva se ajusta a los pases que tengas asignados en B; revisa
esa columna antes de activar la automatización si antes alguien eligió menos pases.

Para registros del primer script con folios cortos, haz un respaldo y coloca el
folio exacto anterior en E de la familia correspondiente. La automatización
vincula la fila y emite un folio largo; no empareja por nombres. Se conservan la
asistencia y la entrada registrada. Los QR cortos quedan invalidados: reenvía el
enlace nuevo para descargar el pase. No borres filas antiguas para migrarlas.

## Configuración inicial, si falta alguna propiedad

En Configuración del proyecto → Propiedades de la secuencia de comandos:

- `SPREADSHEET_ID`: ID de la hoja. Puede detectarse al ejecutar la activación desde su editor vinculado.
- `URL_INVITACION`: URL HTTPS final de GitHub Pages, sin parámetros ni `#`.

La implementación debe ejecutarse como el propietario y permitir abrir los enlaces
sin iniciar sesión en Google. No publiques la lista privada en GitHub.

Al escanear el QR se muestran el nombre y los pases. Recepción pulsa **Registrar
entrada**, sin contraseña. Abrir el QR no registra automáticamente la entrada.
El botón está disponible para quien tenga el QR; úsalo al llegar al evento.
Si ya existe un ingreso, se muestra su hora sin volver a registrarlo.
La antigua propiedad `CLAVE_ENTRADA` ya no se utiliza y puedes eliminarla.

## Comprobación y límites

Verifica una invitación de prueba desde el sitio publicado antes de enviar la lista:
nombre/cupo fijo, confirmación, actualización de G/H, descarga y entrada sin clave.
Los tests locales usan servicios simulados y no modifican tu hoja.

El plazo incluye el 1 de noviembre de 2026, hora de Ciudad Juárez. Después se pueden
recuperar confirmaciones pero no crear nuevas. El registro de entrada corresponde
al grupo completo, no a accesos parciales. La validación necesita internet.
El enlace es privado: quien lo reciba puede confirmar esa invitación. Apps Script
sigue sujeto a sus cuotas y no hay envío masivo ni protección contra saturación.

Referencias de Google: [disparadores instalables](https://developers.google.com/apps-script/guides/triggers/installable),
[propiedades](https://developers.google.com/apps-script/guides/properties),
[implementación web](https://developers.google.com/apps-script/guides/web).
