// Servicios de Google simulados: nunca consulta ni modifica la hoja real.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const crypto=require('node:crypto');
const source=fs.readFileSync(require('node:path').join(__dirname,'../apps-script/Code.gs'),'utf8');
const TOKEN='a'.repeat(32), REQUEST='HS-'+'B'.repeat(32);
function setup(){
  const sheets={},triggers=[];let acquired=false,available=true,date='2026-09-14',flushes=0;
  class Sheet {
    constructor(rows){this.rows=rows;}
    getDataRange(){return {getValues:()=>this.rows.map(r=>r.slice())};}
    getRange(row,col,h=1,w=1){return {
      getValues:()=>Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>(this.rows[row-1+i]||[])[col-1+j]??'')),
      setValue:v=>{this.rows[row-1][col-1]=v;},
      setValues:values=>values.forEach((r,i)=>r.forEach((v,j)=>{this.rows[row-1+i]??=[];this.rows[row-1+i][col-1+j]=v;}))
    };}
    appendRow(r){this.rows.push(r);}
    setFrozenRows(){}
  }
  const props={SPREADSHEET_ID:'test-sheet',URL_INVITACION:'https://example.com/boda/'};
  const book={getSheetByName:n=>sheets[n],insertSheet:n=>sheets[n]=new Sheet([])};
  const context={console,PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]})},
    LockService:{getScriptLock:()=>({tryLock:()=>{acquired=available;return acquired;},hasLock:()=>acquired,releaseLock:()=>{acquired=false;}})},
    SpreadsheetApp:{openById:()=>book,flush:()=>{flushes++;},getUi:()=>({createMenu:()=>({addItem(){return this;},addToUi(){}})})},
    ScriptApp:{EventType:{ON_EDIT:'edit',ON_OPEN:'open'},getProjectTriggers:()=>triggers,
      newTrigger:name=>({forSpreadsheet:id=>({onEdit(){this.type='edit';return this;},onOpen(){this.type='open';return this;},create(){const type=this.type;triggers.push({getHandlerFunction:()=>name,getTriggerSourceId:()=>id,getEventType:()=>type});}})})},
    Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(a,v)=>[...crypto.createHash(a).update(v).digest()],formatDate:(v,tz,f)=>f==='yyyy-MM-dd'?date:'21:00'},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})},
    HtmlService:{createHtmlOutput:html=>({html,setTitle(){return this;},addMetaTag(){return this;}})}};
  vm.createContext(context);vm.runInContext(source,context);context.prepararHojas_();
  sheets.Invitaciones.rows.push(['Familia Prueba',2,TOKEN,'','']);
  const payload={invitacion:TOKEN,folio:REQUEST,nombre:'Nombre no confiable',asiste:'Sí',pases:2,tel:'',mensaje:''};
  return {c:context,sheets,props,triggers,payload,post:d=>JSON.parse(context.doPost({postData:{contents:JSON.stringify(d)}}).text),get:q=>JSON.parse(context.doGet({parameter:q}).text),setDate:d=>date=d,denyLock:()=>available=false,isLocked:()=>acquired};
}
test('requiere enlace autorizado; no confía en nombre ni cupo del cliente',()=>{
 const x=setup();assert.equal(x.post({...x.payload,invitacion:'c'.repeat(32)}).ok,false);

 const r=x.post(x.payload);assert.equal(r.ok,true);assert.equal(r.pase.nombre,'Familia Prueba');assert.match(r.pase.folio,/^HS-[A-F0-9]{32}$/);assert.notEqual(r.pase.folio,REQUEST);
 assert.equal(x.sheets['Hoja 1'].rows.length,2);assert.equal(x.isLocked(),false);
});
test('una confirmación por invitación; reintentos no sobrescriben; recuperación después del cierre',()=>{
 const x=setup(),first=x.post(x.payload);
 assert.deepEqual(x.post({...x.payload,asiste:'No',pases:0}).pase,first.pase);
 x.setDate('2026-11-02');assert.deepEqual(x.post(x.payload).pase,first.pase);
 assert.deepEqual(x.get({i:TOKEN}).pase,first.pase);assert.equal(x.sheets['Hoja 1'].rows.length,2);
});
test('personas con el mismo nombre conservan invitaciones separadas',()=>{
 const x=setup();x.sheets.Invitaciones.rows.push(['Familia Prueba',1,'d'.repeat(32),'','']);
 const a=x.post(x.payload),b=x.post({...x.payload,invitacion:'d'.repeat(32),folio:'HS-'+'E'.repeat(32),pases:1});
 assert.equal(b.ok,true);assert.notEqual(a.pase.folio,b.pase.folio);
});
test('rechaza tipos, pases, campos enormes y JSON incorrecto',()=>{
 const x=setup();for(const patch of [{asiste:'tal vez'},{mensaje:'x'.repeat(1001)},{tel:{}},{tel:'abcdefg'},{invitacion:null}]) assert.equal(x.post({...x.payload,...patch}).ok,false);
 assert.equal(JSON.parse(x.c.doPost({postData:{contents:'{bad'}}).text).ok,false);
 assert.equal(JSON.parse(x.c.doPost({}).text).ok,false);
 assert.equal(x.sheets['Hoja 1'].rows.length,1);
});
test('fecha límite: permite el 1 de noviembre, rechaza nuevas confirmaciones el día 2',()=>{
 const x=setup();x.setDate('2026-11-02');assert.equal(x.post(x.payload).code,'CERRADO');
 x.setDate('2026-11-01');assert.equal(x.post(x.payload).ok,true);
});
test('entrada sin clave requiere folio válido; escanear no registra y repetir no cambia fecha',()=>{
 const x=setup(),p=x.post(x.payload).pase;
 const html=x.c.doGet({parameter:{f:p.folio}}).html;
 assert(html.includes('Registrar entrada'));assert(!html.includes('type="password"'));
 assert.equal(x.sheets['Hoja 1'].rows[1][7],'');
 assert.equal(x.c.registrarEntrada('HS-'+'0'.repeat(32)).code,'PASE');
 assert.equal(x.c.registrarEntrada('HS-001F').ok,false);
 assert.equal(x.c.registrarEntrada(p.folio).repetido,false);
 const time=x.sheets['Hoja 1'].rows[1][7];assert.equal(x.c.registrarEntrada(p.folio).repetido,true);assert.equal(x.sheets['Hoja 1'].rows[1][7],time);
});
test('no asistencia no permite ingreso',()=>{
 const x=setup(),p=x.post({...x.payload,asiste:'No',pases:0}).pase;
 assert.equal(x.c.registrarEntrada(p.folio).code,'PASE');assert.equal(x.sheets['Hoja 1'].rows[1][7],'');
});
test('escape HTML, fórmulas literales y ninguna estadística pública',()=>{
 const x=setup();x.sheets.Invitaciones.rows[1][0]='<img src=x onerror=alert(1)>';
 const p=x.post({...x.payload,mensaje:'=1+1',tel:'+526560000000'}).pase;
 const html=x.c.doGet({parameter:{f:p.folio}}).html;
 assert(!html.includes('<img src=x'));assert(html.includes('&lt;img'));
 assert.equal(x.sheets['Hoja 1'].rows[1][6],"'=1+1");assert.equal(x.sheets['Hoja 1'].rows[1][5],"'+526560000000");
 assert.deepEqual(Object.keys(x.get({})).sort(),['ok','servicio']);
});
test('errores de bloqueo/configuración no exponen detalles ni escriben otra pestaña',()=>{
 const x=setup();x.denyLock();assert.equal(x.post(x.payload).code,'OCUPADO');
 const y=setup();delete y.sheets['Hoja 1'];assert.equal(y.post(y.payload).code,'CONFIGURACION');
 const z=setup();delete z.sheets['Hoja 1'];assert.equal(z.c.registrarEntrada(REQUEST).code,'CONFIGURACION');
});
test('migración explícita conserva asistencia e ingreso y rota folio anterior; es repetible',()=>{
 const x=setup();x.sheets['Hoja 1'].rows.push(['fecha','HS-001F','Familia Prueba','Sí',2,'','','ingreso','','']);
 x.sheets.Invitaciones.rows[1][4]='HS-001F';x.c.generarEnlaces_();
 const r=x.sheets['Hoja 1'].rows[1];assert.equal(r[8],TOKEN);assert.match(r[1],/^HS-[A-F0-9]{32}$/);assert.equal(r[7],'ingreso');
 const f=r[1];x.c.generarEnlaces_();assert.equal(x.sheets['Hoja 1'].rows[1][1],f);assert.equal(x.sheets['Hoja 1'].rows.length,2);
 assert.equal(x.sheets.Invitaciones.rows[1][3],'https://example.com/boda/?i='+TOKEN);
});
test('todos los auxiliares son privados para google.script.run',()=>{
 const names=[...source.matchAll(/^function (\w+)\(/gm)].map(m=>m[1]);
 assert.deepEqual(names.filter(n=>!n.endsWith('_')),['doPost','doGet','registrarEntrada','onOpen']);
});
test('abrir el menú no activa ni modifica invitaciones',()=>{
 const x=setup();const before=JSON.stringify(x.sheets.Invitaciones.rows);
 x.c.onOpen();assert.equal(x.triggers.length,0);
 assert.equal(JSON.stringify(x.sheets.Invitaciones.rows),before);
});
test('revocar token o bajar cupo bloquea un pase ya emitido',()=>{
 const x=setup(),p=x.post(x.payload).pase;x.sheets.Invitaciones.rows[1][1]=1;
 assert.equal(x.c.registrarEntrada(p.folio).code,'PASE');
 x.sheets.Invitaciones.rows[1][1]=2;x.sheets.Invitaciones.rows[1][2]='';
 assert.equal(x.c.registrarEntrada(p.folio).code,'PASE');assert.equal(x.get({i:TOKEN}).code,'INVITACION');
});
test('tokens duplicados y migración con cupo insuficiente se detienen sin sobrescribir',()=>{
 const x=setup();x.sheets.Invitaciones.rows.push(['Otra Familia',2,TOKEN,'','']);assert.equal(x.post(x.payload).code,'CONFIGURACION');
 const y=setup();y.sheets['Hoja 1'].rows.push(['fecha','HS-001F','Familia Prueba','Sí',3,'','','','','']);y.sheets.Invitaciones.rows[1][4]='HS-001F';
 assert.throws(()=>y.c.generarEnlaces_());assert.equal(y.sheets['Hoja 1'].rows[1][1],'HS-001F');assert.equal(y.sheets['Hoja 1'].rows[1][8],'');
});
test('ignora cualquier cantidad enviada y asigna siempre la del organizador',()=>{
 for(const value of [undefined,0,1,3,999,'100',{cantidad:8}]){
   const x=setup();assert.equal(x.post({...x.payload,pases:value}).pase.pases,2);
 }
 const x=setup();assert.equal(x.post({...x.payload,asiste:'No',pases:999}).pase.pases,0);
});
test('genera enlaces y mensajes automáticamente sin rotar tokens; acepta filas todavía incompletas',()=>{
 const x=setup();x.sheets.Invitaciones.rows.push(['Nueva Familia',3,'','',''],['Incompleta','','','','']);
 x.c.generarEnlaces_();const r=x.sheets.Invitaciones.rows[2];assert.match(r[2],/^[a-f0-9]{32}$/);assert(r[5].includes('3 pases'));assert(r[5].includes(r[3]));assert.equal(r[6],'Pendiente');
 const token=r[2];x.c.generarEnlaces_();assert.equal(x.sheets.Invitaciones.rows[2][2],token);
});
test('instalar automatización dos veces no duplica disparadores',()=>{
 const x=setup();x.c.activarAutomatizacion_();x.c.activarAutomatizacion_();assert.equal(x.triggers.length,2);
});
test('tablero refleja confirmación y entrada; cambio del organizador actualiza los pases',()=>{
 const x=setup();x.post(x.payload);assert.equal(x.sheets.Invitaciones.rows[1][6],'Confirmado');assert.equal(x.sheets.Invitaciones.rows[1][7],2);
 x.sheets.Invitaciones.rows[1][1]=4;
 x.c.alEditarInvitaciones_({source:{getId:()=>x.props.SPREADSHEET_ID},range:{getSheet:()=>({getName:()=> 'Invitaciones'}),getColumn:()=>2,getLastRow:()=>2}});
 const p=x.get({i:TOKEN}).pase;assert.equal(p.pases,4);assert.equal(x.sheets.Invitaciones.rows[1][7],4);
 x.c.registrarEntrada(p.folio);assert.equal(x.sheets.Invitaciones.rows[1][6],'Ya ingresó');
});
test('cupo cero pausa la invitación y bloquea el acceso',()=>{
 const x=setup(),p=x.post(x.payload).pase;x.sheets.Invitaciones.rows[1][1]=0;x.c.generarEnlaces_();
 assert.equal(x.sheets.Invitaciones.rows[1][6],'Pausada');assert.equal(x.get({i:TOKEN}).code,'INVITACION');assert.equal(x.c.registrarEntrada(p.folio).code,'PASE');
});
test('familias de 6, 7 y 9 reciben exactamente sus pases; 10 requiere corregir configuración',()=>{
 for(const count of [6,7,9]) {
  const x=setup();x.sheets.Invitaciones.rows[1][1]=count;
  assert.equal(x.get({i:TOKEN}).maximo,count);
  const p=x.post({...x.payload,pases:999}).pase;
  assert.equal(p.pases,count);assert.equal(x.c.registrarEntrada(p.folio).ok,true);
 }
 const x=setup();x.sheets.Invitaciones.rows[1][1]=10;
 assert.equal(x.post(x.payload).code,'CONFIGURACION');
 assert.equal(x.sheets['Hoja 1'].rows.length,1);
});
test('prepara antes de publicar y genera enlaces después sin perder tokens ni columnas privadas',()=>{
 const x=setup();delete x.props.URL_INVITACION;
 x.sheets.Invitaciones.rows[1].push('', 'Pendiente', 0, 'Lado de prueba', 'Grupo de prueba', 'Nota', 1);
 x.c.activarAutomatizacion_();
 const r=x.sheets.Invitaciones.rows[1];
 assert.equal(r[2],TOKEN);assert.equal(r[3],'');assert.equal(r[5],'');
 assert.equal(r[8],'Lado de prueba');assert.equal(r[10],'Nota');
 x.props.URL_INVITACION='https://example.com/publicada/';x.c.generarEnlaces_();
 assert.equal(r[2],TOKEN);assert.equal(r[3],'https://example.com/publicada/?i='+TOKEN);
 assert(r[5].includes(r[3]));assert.equal(r[11],1);
});
