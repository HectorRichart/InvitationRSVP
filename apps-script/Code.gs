/** Sofía y Héctor. Copiar en Google Apps Script, NO ejecutar en GitHub Pages.
 * Instalación y migración: apps-script/README.md.
 * onOpen solo muestra el menú. Los auxiliares administrativos terminan en _.
 */
var AJUSTES = {
  HOJA: 'Hoja 1', INVITACIONES: 'Invitaciones', MAX_PASES: 9,
  TZ: 'America/Ciudad_Juarez', CIERRE: '2026-11-01'
};
// G conserva comentarios históricos para no desplazar folios e ingresos.
// Las nuevas confirmaciones dejan G vacía; no se reciben ni guardan comentarios.
var CABECERAS = ['Fecha','Folio','Nombre','Asiste','Pases','WhatsApp','Mensaje','Ingreso','Invitacion','Solicitud'];
var CAB_INV = ['Nombre','Maximo','Token','Enlace','Folio anterior','Mensaje para enviar','Estado','Pases confirmados'];

function doPost(e) {
  var lock;
  try {
    var raw = e && e.postData && e.postData.contents;
    if (typeof raw !== 'string' || raw.length > 6000) fallo_('DATOS');
    var d;
    try { d = JSON.parse(raw); } catch (_) { fallo_('DATOS'); }
    validarDatos_(d);
    lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) fallo_('OCUPADO');
    var invitacion = invitacion_(d.invitacion);
    if (!invitacion) fallo_('INVITACION');
    var sheet = hoja_();
    var rows = sheet.getDataRange().getValues();
    var existing = filaUnica_(rows, 8, d.invitacion);
    // Una invitación solo crea una confirmación. Los cambios posteriores se gestionan con los novios.
    // También recupera un envío guardado cuya respuesta se perdió, incluso tras la fecha límite.
    if (existing) { actualizarEstadoSeguro_(d.invitacion, existing.valores); return json_({ok:true, pase:pase_(existing.valores), existente:true}); }
    if (cerrado_()) fallo_('CERRADO');
    // La cantidad procede exclusivamente de la lista privada del organizador.
    var cantidad = d.asiste === 'Sí' ? invitacion.maximo : 0;
    if (filaUnica_(rows, 9, d.folio)) fallo_('SOLICITUD');
    var folio = nuevoFolio_(rows);
    var row = [new Date(), folio, textoHoja_(invitacion.nombre), d.asiste, cantidad,
      textoHoja_(d.tel), '', '', d.invitacion, d.folio];
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    actualizarEstadoSeguro_(d.invitacion, row);
    // El nombre proviene de la lista privada, nunca del formulario público.
    return json_({ok:true, pase:{folio:folio,nombre:invitacion.nombre,asiste:d.asiste,pases:cantidad}});
  } catch (err) {
    return errorJson_(err);
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var q = (e && e.parameter) || {};
    if (q.i !== undefined) {
      var invite = invitacion_(q.i);
      if (!invite) fallo_('INVITACION');
      var saved = filaUnica_(hoja_().getDataRange().getValues(), 8, q.i);
      return json_({ok:true, nombre:invite.nombre, maximo:invite.maximo,
        cerrado:cerrado_(), pase:saved ? pase_(saved.valores) : null});
    }
    if (q.f !== undefined) {
      if (!folioValido_(q.f)) return pagina_('Pase no válido', 'Contacta a los novios.', 'malo', null);
      var found = filaUnica_(hoja_().getDataRange().getValues(), 1, q.f);
      if (!found) return pagina_('Pase no válido', 'Contacta a los novios.', 'malo', null);
      var row = found.valores;
      if (!admitido_(row)) return pagina_('Pase no disponible', 'Este pase no autoriza el acceso.', 'malo', null);
      if (row[7]) return pagina_(row[2], 'Entrada ya registrada a las ' + hora_(row[7]), 'repetido', null);
      return pagina_(row[2], row[4] + (row[4] === 1 ? ' pase confirmado' : ' pases confirmados'), 'bueno', row[1]);
    }
    // Sin identificador no se publican estadísticas ni nombres.
    return json_({ok:true, servicio:'RSVP Sofía y Héctor'});
  } catch (err) {
    return errorJson_(err);
  }
}

function registrarEntrada(folio) {
  var lock;
  try {
    if (!folioValido_(folio)) fallo_('PASE');
    lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) fallo_('OCUPADO');
    var sheet = hoja_();
    var found = filaUnica_(sheet.getDataRange().getValues(), 1, folio);
    if (!found || !admitido_(found.valores)) fallo_('PASE');
    if (found.valores[7]) return {ok:true, repetido:true, mensaje:'Entrada ya registrada a las ' + hora_(found.valores[7])};
    var now = new Date();
    sheet.getRange(found.numero, 8).setValue(now);
    found.valores[7] = now;
    actualizarEstadoSeguro_(found.valores[8], found.valores);
    SpreadsheetApp.flush();
    return {ok:true, repetido:false, mensaje:found.valores[4] + ' pase(s) · entrada registrada a las ' + hora_(now)};
  } catch (err) {
    return errorObjeto_(err);
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function validarDatos_(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) fallo_('DATOS');
  if (!tokenValido_(d.invitacion) || !/^HS-[A-F0-9]{32}$/.test(d.folio || '')) fallo_('INVITACION');
  if (d.asiste !== 'Sí' && d.asiste !== 'No') fallo_('DATOS');
  // d.pases se ignora, incluso si alguien manipula el navegador.
  if (d.nombre !== undefined && (typeof d.nombre !== 'string' || d.nombre.length > 100)) fallo_('DATOS');
  if (typeof d.tel !== 'string' || !d.tel.trim() || d.tel.length > 25) fallo_('DATOS');
  if (d.tel && (!/^[+\d\s().-]+$/.test(d.tel) || d.tel.replace(/\D/g,'').length < 7)) fallo_('DATOS');
}
function cerrado_() { return Utilities.formatDate(new Date(), AJUSTES.TZ, 'yyyy-MM-dd') > AJUSTES.CIERRE; }
function tokenValido_(s) { return typeof s === 'string' && /^[a-f0-9]{32}$/.test(s); }
function folioValido_(s) { return typeof s === 'string' && /^HS-[A-F0-9]{32}$/.test(s); }
function token_() { return Utilities.getUuid().replace(/-/g,'').toLowerCase(); }
function nuevoFolio_(rows) {
  for (var i=0; i<5; i++) {
    var f='HS-'+token_().toUpperCase();
    if (!rows.some(function(r){return r[1]===f;})) return f;
  }
  fallo_('CONFIGURACION');
}
function libro_() {
  var id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) fallo_('CONFIGURACION');
  return SpreadsheetApp.openById(id);
}
function hojaConCabeceras_(name, headers) {
  var sheet=libro_().getSheetByName(name);
  if (!sheet) fallo_('CONFIGURACION');
  var actual=sheet.getRange(1,1,1,headers.length).getValues()[0];
  if (!headers.every(function(h,i){return actual[i]===h;})) fallo_('CONFIGURACION');
  return sheet;
}
function hoja_() { return hojaConCabeceras_(AJUSTES.HOJA,CABECERAS); }
function invitacion_(token) {
  if (!tokenValido_(token)) return null;
  var rows=hojaConCabeceras_(AJUSTES.INVITACIONES,CAB_INV).getDataRange().getValues();
  var found=filaUnica_(rows,2,token);
  if (!found) return null;
  var r=found.valores;
  if (r[1] === 0) return null; // El organizador puede pausar una invitación.
  if (typeof r[0]!=='string' || r[0].trim().length<3 || r[0].length>100
      || !Number.isInteger(r[1]) || r[1]<1 || r[1]>AJUSTES.MAX_PASES) fallo_('CONFIGURACION');
  return {nombre:r[0].trim(),maximo:r[1]};
}
function filaUnica_(rows, col, value) {
  var found=null;
  for(var i=1;i<rows.length;i++) if(rows[i][col]===value) {
    if(found) fallo_('CONFIGURACION');
    found={numero:i+1,valores:rows[i]};
  }
  return found;
}
function pase_(r) {
  if (!folioValido_(r[1]) || typeof r[2]!=='string' || !['Sí','No'].includes(r[3])
      || !Number.isInteger(r[4]) || (r[3]==='Sí' ? r[4]<1 || r[4]>AJUSTES.MAX_PASES : r[4]!==0)) fallo_('CONFIGURACION');
  return {folio:r[1],nombre:r[2],asiste:r[3],pases:r[4]};
}
function admitido_(r) {
  var invite=invitacion_(r[8]);
  return !!invite && r[3]==='Sí' && Number.isInteger(r[4]) && r[4]>=1 && r[4]<=invite.maximo;
}
function textoHoja_(s) {
  // El apóstrofo hace que Sheets trate la entrada como texto, incluyendo exports comunes.
  return /^[\s\u0000-\u001f]*[=+@-]/.test(s) ? "'"+s : s;
}
function hora_(date) { return Utilities.formatDate(new Date(date),AJUSTES.TZ,'HH:mm'); }
function fallo_(code) { var e=new Error(code); e.publicCode=code; throw e; }
function errorObjeto_(e) {
  var messages={DATOS:'Revisa los datos enviados.',INVITACION:'Abre el enlace privado que te enviaron los novios.',
    CUPO:'La cantidad de pases no corresponde a tu invitación.',CERRADO:'El plazo de confirmación terminó. Contacta a los novios.',
    OCUPADO:'Estamos procesando otras confirmaciones. Intenta de nuevo.',SOLICITUD:'No se pudo validar la solicitud.',
    CONFIGURACION:'El servicio necesita revisión de los novios.',PASE:'Este pase no autoriza el acceso.'};
  var code=e && e.publicCode;
  return {ok:false,code:messages[code]?code:'SERVIDOR',error:messages[code]||'No se pudo completar la operación. Intenta de nuevo.'};
}
function errorJson_(e) { return json_(errorObjeto_(e)); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function escapeHtml_(v) {
  return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
}
function pagina_(nombre, detalle, estado, folio) {
  var color=estado==='bueno'?'#1f7a4d':estado==='repetido'?'#a8761b':'#8c2b38';
  var form=folio ? '<form id="entry"><p>Recepción: pulsa el botón cuando llegue el grupo.</p><button id="go">Registrar entrada</button></form>' : '';
  // Solo se inserta un folio validado; los textos se escapan antes de formar HTML.
  var script=folio && folioValido_(folio) ? '<script>document.getElementById("entry").addEventListener("submit",function(e){e.preventDefault();var b=document.getElementById("go"),m=document.getElementById("msg");if(b.disabled)return;b.disabled=true;google.script.run.withSuccessHandler(function(r){m.textContent=r.mensaje||r.error;if(r.ok){document.getElementById("entry").hidden=true;document.getElementById("state").style.background=r.repetido?"#a8761b":"#1f7a4d";}else b.disabled=false;}).withFailureHandler(function(){b.disabled=false;m.textContent="No se pudo verificar la entrada. Intenta de nuevo.";}).registrarEntrada('+JSON.stringify(folio)+');});</script>' : '';
  return HtmlService.createHtmlOutput('<!doctype html><html lang="es"><head><meta name="referrer" content="no-referrer"><style>body{margin:0;background:#171d18;color:#fbf6ee;font:16px/1.6 system-ui;min-height:100svh;display:grid;place-items:center}main{padding:2rem;max-width:420px;text-align:center;overflow-wrap:anywhere}h1{font-weight:400}#state{width:60px;height:60px;border-radius:50%;margin:auto}label{display:block;margin-top:2rem}input,button{box-sizing:border-box;width:100%;padding:1rem;margin-top:.8rem;border:1px solid #ceb58a;border-radius:6px;font:inherit}button{background:#ceb58a;color:#171d18;cursor:pointer}button:disabled{opacity:.5}</style></head><body><main><div id="state" style="background:'+color+'"></div><p>Sofía &amp; Héctor · Pase de acceso</p><h1>'+escapeHtml_(nombre)+'</h1><p id="msg" role="status" aria-live="polite">'+escapeHtml_(detalle)+'</p>'+form+'</main>'+script+'</body></html>')
    .setTitle('Pase · Sofía y Héctor').addMetaTag('viewport','width=device-width, initial-scale=1');
}

/** Ejecutar desde el editor. No borra registros y no acepta cabeceras desconocidas. */
function prepararHojas_() {
  var ss=libro_();
  [[AJUSTES.HOJA,CABECERAS],[AJUSTES.INVITACIONES,CAB_INV]].forEach(function(pair){
    var sheet=ss.getSheetByName(pair[0]) || ss.insertSheet(pair[0]);
    var actual=sheet.getRange(1,1,1,pair[1].length).getValues()[0];
    if(actual.some(function(v,i){return v!=='' && v!==pair[1][i];})) throw new Error('Revisa encabezados de '+pair[0]);
    sheet.getRange(1,1,1,pair[1].length).setValues([pair[1]]);
    sheet.setFrozenRows(1);
    if(pair[0]===AJUSTES.HOJA) sheet.hideColumns(7);
  });
}

/** Completa Tokens/Enlaces. E permite vincular EXPLÍCITAMENTE un folio anterior.
 * Rota ese folio inseguro y conserva confirmación/ingreso; no empareja nombres.
 */
function generarEnlaces_() {
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(5000)) throw new Error('Intenta de nuevo');
  try {
    var base=PropertiesService.getScriptProperties().getProperty('URL_INVITACION');
    if(base && !/^https:\/\/[^?#]+$/.test(base)) throw new Error('Configura URL_INVITACION HTTPS sin parámetros');
    var sheet=hojaConCabeceras_(AJUSTES.INVITACIONES,CAB_INV), data=sheet.getDataRange().getValues();
    var responses=hoja_(), rows=responses.getDataRange().getValues(), used={}, plans=[];
    for(var i=1;i<data.length;i++) {
      var r=data[i]; if(r.every(function(v){return v==='';})) continue;
      if(typeof r[0]!=='string'||r[0].trim().length<3||r[0].length>100||!Number.isInteger(r[1])||r[1]<1||r[1]>AJUSTES.MAX_PASES) {
        sheet.getRange(i+1,7).setValue(r[1]===0?'Pausada':'Completa nombre y pases (1–'+AJUSTES.MAX_PASES+')');
        continue;
      }
      var token=r[2]||token_();
      if(!tokenValido_(token)||used[token]) throw new Error('Token inválido o repetido, fila '+(i+1));
      used[token]=true;
      var existing=filaUnica_(rows,8,token), legacy=null;
      if(r[4] && !existing) {
        legacy=filaUnica_(rows,1,r[4]);
        if(!legacy || legacy.valores[8]) throw new Error('Folio anterior inválido o vinculado, fila '+(i+1));
        if(!['Sí','No'].includes(legacy.valores[3]) || !Number.isInteger(legacy.valores[4]) || (legacy.valores[3]==='Sí' ? legacy.valores[4]<1 || legacy.valores[4]>r[1] : legacy.valores[4]!==0)) throw new Error('Revisa asistencia/cupo anterior, fila '+(i+1));
        legacy.valores[1]=nuevoFolio_(rows); legacy.valores[2]=textoHoja_(r[0].trim());legacy.valores[8]=token;legacy.valores[9]='';
      }
      var confirmation=existing||legacy;
      var writeResponse=!!legacy || !!existing && (existing.valores[2]!==textoHoja_(r[0].trim()) || existing.valores[4] !== (existing.valores[3]==='Sí'?r[1]:0));
      if(confirmation) {
        if(!['Sí','No'].includes(confirmation.valores[3])) throw new Error('Revisa la asistencia de la fila '+confirmation.numero);
        confirmation.valores[2]=textoHoja_(r[0].trim());
        confirmation.valores[4]=confirmation.valores[3]==='Sí'?r[1]:0;
      }
      // Permite preparar la lista antes de publicar, sin crear enlaces ficticios.
      var url=base ? base+'?i='+token : (r[3]||'');
      var message=base ? 'Hola, '+r[0].trim()+'. Queremos compartir contigo nuestra boda. Reservamos '+r[1]+(r[1]===1?' pase':' pases')+' para tu invitación. Confirma si nos acompañas aquí: '+url+' · Con cariño, Sofía y Héctor' : (r[5]||'');
      plans.push({row:i+1,token:token,url:url,legacy:confirmation,message:message,original:r,writeResponse:writeResponse});
    }
    plans.forEach(function(p){
      if(p.original[2]!==p.token || p.original[3]!==p.url) sheet.getRange(p.row,3,1,2).setValues([[p.token,p.url]]);
      if(p.writeResponse) responses.getRange(p.legacy.numero,1,1,10).setValues([p.legacy.valores]);
      var display=[p.message,estado_(p.legacy && p.legacy.valores),p.legacy?p.legacy.valores[4]:0];
      if(display.some(function(v,i){return v!==p.original[i+5];})) sheet.getRange(p.row,6,1,3).setValues([display]);
    });
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
}

function estado_(row) {
  if(!row) return 'Pendiente';
  if(row[3]==='No') return 'No asistirá';
  return row[7]?'Ya ingresó':'Confirmado';
}
function actualizarEstadoSeguro_(token, row) {
  // El pase ya está guardado: un fallo del tablero no debe simular un fallo del RSVP.
  try {
    var sheet=hojaConCabeceras_(AJUSTES.INVITACIONES,CAB_INV);
    var found=filaUnica_(sheet.getDataRange().getValues(),2,token);
    if(found) sheet.getRange(found.numero,7,1,2).setValues([[estado_(row),row[4]]]);
  } catch (_) { console.warn('Tablero pendiente de actualizar desde el menú Boda.'); }
}

/** Ejecutar una vez desde el editor vinculado a Google Sheets. */
function activarAutomatizacion_() {
  var props=PropertiesService.getScriptProperties();
  if(!props.getProperty('SPREADSHEET_ID')) {
    var active=SpreadsheetApp.getActiveSpreadsheet();
    if(!active) throw new Error('Abre Apps Script desde tu hoja de invitados.');
    props.setProperty('SPREADSHEET_ID',active.getId());
  }
  prepararHojas_();
  generarEnlaces_();
  var id=props.getProperty('SPREADSHEET_ID');
  var triggers=ScriptApp.getProjectTriggers();
  [{name:'alEditarInvitaciones_',type:ScriptApp.EventType.ON_EDIT},{name:'menuBoda_',type:ScriptApp.EventType.ON_OPEN}].forEach(function(t){
    var exists=triggers.some(function(old){return old.getHandlerFunction()===t.name && old.getTriggerSourceId()===id && old.getEventType()===t.type;});
    if(!exists) {
      var builder=ScriptApp.newTrigger(t.name).forSpreadsheet(id);
      if(t.type===ScriptApp.EventType.ON_EDIT) builder.onEdit().create();
      else builder.onOpen().create();
    }
  });
  menuBoda_();
}
// Punto visible en el editor; no ejecuta operaciones administrativas.
function onOpen() {
  menuBoda_();
}
function menuBoda_() {
  SpreadsheetApp.getUi().createMenu('Boda')
    .addItem('Configurar dirección de la invitación','configurarDireccion_')
    .addItem('Actualizar enlaces y confirmaciones','generarEnlaces_')
    .addItem('Activar o reparar automatización','activarAutomatizacion_')
    .addToUi();
}
function configurarDireccion_() {
  var ui=SpreadsheetApp.getUi();
  var response=ui.prompt('Dirección de la invitación','Pega la URL HTTPS de la página ya publicada, sin parámetros ni #.',ui.ButtonSet.OK_CANCEL);
  if(response.getSelectedButton()!==ui.Button.OK) return;
  var base=response.getResponseText().trim();
  if(!/^https:\/\/[^\s?#]+$/.test(base)) {
    ui.alert('Usa una dirección HTTPS sin espacios, parámetros ni #.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('URL_INVITACION',base);
  generarEnlaces_();
  ui.alert('Enlaces y mensajes actualizados en Invitaciones.');
}
function alEditarInvitaciones_(e) {
  if(!e || !e.range || !e.source) return;
  if(e.source.getId()!==PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')) return;
  var name=e.range.getSheet().getName();
  if(e.range.getLastRow()<2) return;
  var relevant=name===AJUSTES.INVITACIONES && e.range.getColumn()<=5;
  // Las modificaciones manuales de asistencia también actualizan el tablero.
  relevant=relevant || name===AJUSTES.HOJA;
  if(!relevant) return;
  try { generarEnlaces_(); }
  catch (err) {
    e.source.toast('No se pudo actualizar. Revisa filas duplicadas, folios anteriores y configuración; usa Boda → Actualizar enlaces y confirmaciones.','Boda',10);
    throw err;
  }
}
