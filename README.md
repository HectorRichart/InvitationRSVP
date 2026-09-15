# Sofía & Héctor · 7 de noviembre de 2026

Invitación estática en español, sin compilación ni dependencias de Node para publicar.

## Publicar en GitHub Pages

Sube `index.html`, `assets/`, las dos fotografías, `boda-sofia-hector.ics` y `.nojekyll`. En **Settings → Pages → Deploy from a branch**, selecciona tu rama y **/(root)**. Activa **Enforce HTTPS** cuando esté disponible. Las rutas son relativas y funcionan también en `usuario.github.io/SaveTheDate/`.

Documentación: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

Para previsualizar: `python3 -m http.server 8765`, y abre `http://localhost:8765`.

## Editar

- Contenido, nombres, direcciones y horarios: `index.html`.
- Colores y diseño: `assets/styles.css`.
- Endpoint y fecha de cuenta regresiva: `CONFIG` al principio de `assets/app.js`.
- Calendario descargable: `boda-sofia-hector.ics`. Si cambias horarios, actualiza también `calendarUrl()` en JavaScript y las fechas visibles en HTML. El archivo usa UTC: 17:00 en Ciudad Juárez el 7 de noviembre corresponde a 00:00 UTC del día 8.
- Enlaces privados: se generan en la pestaña `Invitaciones` de Google siguiendo `apps-script/README.md`.

## Confirmaciones seguras

El servidor corregido está en `apps-script/Code.gs`. Sigue [la instalación y
migración](apps-script/README.md) para configurar Google, activar la generación automática de enlaces
y actualizar la implementación existente.

Tú escribes nombre y pases en Sheets. La automatización genera enlace, mensaje
para copiar y estado de confirmación. El formulario usa `?i=token`: el invitado
solo indica Sí o No y recibe exactamente los pases asignados; no hay selector. Los enlaces
antiguos `?n=...&p=...` dejan de autorizar el RSVP. La lista privada y la clave del
personal se guardan en Google, nunca en este repositorio.

Las confirmaciones no se sobrescriben por nombre. Los pases se recuperan desde
el servidor y el personal necesita su clave para registrar una entrada. No se
publican estadísticas. La primera confirmación requiere el enlace privado y
respeta el cierre del 7 de octubre de 2026, inclusive, hora de Ciudad Juárez.

La CSP permite scripts del propio sitio, mapas de Google y las fuentes existentes.
`no-referrer` evita enviar los tokens a otros sitios como referencia. `noindex`
no hace privada la página: no publiques la lista de invitados ni las claves.

Referencia CSP: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP

## Bibliotecas

Copias locales de QRCode.js 1.0.0 y html2canvas 1.4.1, ambas MIT. Consulta `assets/vendor/README.md` y sus licencias. No hace falta instalarlas para publicar. Si no carga QRCode, el pase muestra el folio; si no carga html2canvas, indica guardar una captura.

## Validación

`node tests/apps-script.test.cjs` ejecuta las pruebas del servidor con servicios
de Google simulados: autorización, cupos, reintentos, fechas, ingreso protegido,
HTML, fórmulas y migración. No consulta la hoja real. La página también se verifica
en Chrome con respuestas de API simuladas. Confirma permisos y CORS con una
invitación de prueba en el despliegue real antes de compartir enlaces.

## Fotos casuales integradas

- `portada.jpeg`: fotografía de bienvenida, al lado del sobre en escritorio y encima en móvil.
- `foto_principal_inicio_pagina.jpeg`: retrato principal al entrar.
- `carrusel1`, `2`, `3`, `5`, `6`, `7` y `8`: galería en ese orden. No se añadió
  un archivo ficticio para el número 4, que no estaba entre las fotos recibidas.

Los originales están en `assets/fotos_casuales/`. La página carga únicamente las
copias optimizadas de `assets/fotos_web/`, con versiones de 800 y 1600 píxeles en
el lado largo. Publica esa carpeta junto con el resto del sitio. No necesitas
subir los originales para que la invitación funcione.

El orden, los textos alternativos y los pies de foto se editan en `assets/photos.js`.
El retrato inicial también está en `index.html` para mostrarlo sin esperar a
JavaScript; si lo cambias, actualiza su `src`, `srcset`, dimensiones y descripción.
La fotografía de bienvenida está en `index.html`; la disposición de la apertura se define al final de `assets/styles.css`.

El carrusel muestra fotos verticales y horizontales completas, con carga diferida,
controles, gestos y teclado, sin reproducción automática. Sin JavaScript siguen
visibles el retrato principal y las fotos históricas del compromiso y el civil.
