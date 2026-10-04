/* Motor de análisis puro: las métricas se calculan a partir de columnas presentes.
   Una fila es un registro; una OT es un identificador único. */
(function (global) {
'use strict';
const fields = {
 ot:['Orden de trabajo',['OT','Orden','Orden de trabajo']],
 equipment:['Equipo',['Equipo','Equipment']], unit:['Unidad',['Unidad','Centro']],
 area:['Área',['Área','Area']], location:['Ubicación técnica',['Ubicacion_tecnica','Ubicación técnica','Ubicacion tecnica']],
 equipmentType:['Tipo de equipo',['Tipo_equipo','Tipo de equipo']], criticality:['Criticidad',['Criticidad']],
 workcenter:['Puesto responsable',['Puesto_trabajo','Puesto de trabajo','Pto.tbjo.resp.','Pto.tbjo.responsable']],
 type:['Tipo de mantenimiento',['Tipo_mantenimiento','Tipo de mantenimiento']],
 orderClass:['Clase de orden',['Clase_orden','Clase de orden','Cl.']],
 status:['Estado',['Estado','Status_usuario','Status usuario','Status de usuario']], mode:['Modo de falla',['Modo_falla','Modo de falla']],
 created:['Fecha de creación',['Fecha_creación','Fecha de creación','Fe.creación']],
 start:['Inicio real',['Fecha_inicio','Fecha de inicio','Inicio real','Inicio real (fecha)','Fecha inicio real']],
 end:['Fin real',['Fecha_fin','Fecha de fin','Fin real','Fin real (fecha)','Fecha real de fin de la orden']],
 planned:['Inicio planificado',['Fecha_planificada','Fecha planificada','Inicio programado','Inicio extremo','Fecha de inicio extrema']],
 cost:['Costo total CLP',['Costo_total_CLP','Costo total CLP','Costos reales','Cost.real.total','Costos reales totales','Costes tot.reales']],
 labor:['Horas de mano de obra',['Horas_mano_obra','Horas mano obra']],
 downtime:['Downtime (h)',['Downtime_h','Downtime h']],
 repair:['Tiempo de reparación (h)',['Tiempo_reparacion_h','Tiempo reparación h']]
};
const numeric = ['cost','labor','downtime','repair'];
const dates = ['created','start','end','planned'];
const clean = v => v == null ? '' : String(v).trim().replace(/^'+/, '').trim();
const key = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function detect(headers) {
 const result = {};
 for (const [f,[,aliases]] of Object.entries(fields)) result[f] = headers.find(h => aliases.some(a => key(a)===key(h))) || '';
 return result;
}
function number(v, format='dot') {
 if (typeof v === 'number') return Number.isFinite(v) ? v : null;
 let s=clean(v).replace(/\s/g,'').replace(/^(?:CLP|\$)/i,'');
 if (!s || /^(?:nan|null|n\/a|na|-)$/i.test(s)) return null;
 if (format==='comma') s=s.replace(/\./g,'').replace(',','.');
 else if (s.includes(',') && s.includes('.')) s=s.replace(/,/g,'');
 else if (s.includes(',')) s=s.replace(',','.');
 if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) return null;
 const n=Number(s); return Number.isFinite(n)?n:null;
}
// Se usan fechas UTC para evitar desfases de huso y cambios de horario de verano.
function date(v) {
 if (v instanceof Date) return Number.isFinite(v.getTime()) ? v.getTime() : null;
 if (typeof v === 'number' && v>0 && v<2958466) return Math.round((v-25569)*86400000);
 const s=clean(v); if (!s) return null;
 const iso=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?(?:Z)?$/);
 const local=s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
 if (!iso && !local) return null;
 const m=iso||local, y=Number(iso?m[1]:m[3]), mo=Number(m[2]), d=Number(iso?m[3]:m[1]);
 const hh=Number(m[4]||0),mm=Number(m[5]||0),ss=Number(m[6]||0);
 const t=Date.UTC(y,mo-1,d,hh,mm,ss), test=new Date(t);
 return test.getUTCFullYear()===y&&test.getUTCMonth()===mo-1&&test.getUTCDate()===d&&hh<24&&mm<60&&ss<60?t:null;
}
function normalize(input,mapping,format) {
 const headers=Object.keys(input[0]||{}),seen=new Set(),rows=[],invalid={},missing={};let duplicates=0;
 for(const source of input){
  const raw={};for(const h of headers) raw[h]=clean(source[h]);
  const signature=JSON.stringify(raw);if(seen.has(signature)){duplicates++;continue;}seen.add(signature);
  const r={raw};for(const f of Object.keys(fields)){
   const value=mapping[f]?source[mapping[f]]:null;
   r[f]=numeric.includes(f)?number(value,format):dates.includes(f)?date(value):clean(value);
   if(mapping[f] && clean(value) && r[f]===null) invalid[f]=(invalid[f]||0)+1;
   if(mapping[f] && (r[f]===null || r[f]==='')) missing[f]=(missing[f]||0)+1;
  }
  const tm=key(r.type);r.type=({correctivo:'Correctivo',preventivo:'Preventivo',preventiva:'Preventivo',predictivo:'Predictivo'})[tm]||r.type;
  const st=key(r.status);r.status=({cerrada:'CERRADA',cerrado:'CERRADA',abierta:'ABIERTA',abierto:'ABIERTA',enejecucion:'EN EJECUCIÓN',ejecutando:'EN EJECUCIÓN'})[st]||r.status;
  r.delay = r.start!=null&&r.planned!=null ? (r.start-r.planned)/86400000 : null;
  r.delayClass = r.delay==null?'Sin fechas comparables': r.delay<0?'Adelantada':r.delay>0?'Atrasada':'A tiempo';
  r.elapsed=r.start!=null&&r.end!=null?(r.end-r.start)/3600000:null;
  rows.push(r);
 }
 const ots=new Map();for(const r of rows)if(r.ot)ots.set(r.ot,(ots.get(r.ot)||0)+1);
 return {rows,quality:{input:input.length,duplicates,invalid,missing,repeatedOT:[...ots.values()].filter(n=>n>1).length,missingOT:rows.filter(r=>!r.ot).length,negativeDurations:rows.filter(r=>r.elapsed!=null&&r.elapsed<0).length,negativeResources:rows.filter(r=>['downtime','labor','repair'].some(f=>r[f]!=null&&r[f]<0)).length,negativeCosts:rows.filter(r=>r.cost!=null&&r.cost<0).length}};
}
const sum=(rows,f)=>rows.reduce((s,r)=>s+(r[f]??0),0);
const values=(rows,f)=>rows.map(r=>r[f]).filter(v=>v!=null && v!=='');
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const median=a=>{if(!a.length)return null;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;};
const unique=(rows,f)=>new Set(values(rows,f)).size;
function groups(rows,field,metric='orders'){
 const map=new Map();for(const r of rows){const label=r[field]||'Sin información';if(!map.has(label))map.set(label,{label,orders:new Set(),records:0,cost:0,labor:0,downtime:0,validCost:0,validLabor:0,validDowntime:0});const g=map.get(label);if(r.ot)g.orders.add(r.ot);g.records++;g.cost+=r.cost??0;g.labor+=r.labor!=null&&r.labor>=0?r.labor:0;g.downtime+=r.downtime!=null&&r.downtime>=0?r.downtime:0;if(r.cost!=null)g.validCost++;if(r.labor!=null&&r.labor>=0)g.validLabor++;if(r.downtime!=null&&r.downtime>=0)g.validDowntime++;}
 const result=[...map.values()].map(g=>({...g,orders:g.orders.size})).sort((a,b)=>b[metric]-a[metric]||a.label.localeCompare(b.label));
 const total=result.reduce((s,g)=>s+g[metric],0);let accumulated=0;
 return result.map(g=>{const share=total>0&&result.every(v=>v[metric]>=0)?g[metric]/total*100:null;accumulated+=share??0;return {...g,share,accumulated:share==null?null:accumulated};});
}
function priority(rows,field){
 const data=groups(rows.filter(r=>r[field]),field).filter(g=>g.orders>0),mx=mean(data.map(g=>g.orders))||0,my=mean(data.filter(g=>g.validCost).map(g=>g.cost))??0;
 const maxOrders=Math.max(1,...data.map(g=>g.orders)),maxCost=Math.max(1,...data.map(g=>Math.max(0,g.cost)));
 return {xThreshold:mx,yThreshold:my,data:data.map(g=>({...g,score:g.validCost?50*(g.orders/maxOrders+Math.max(0,g.cost)/maxCost):null,quadrant:!g.validCost?'Sin costo válido':g.orders>=mx&&g.cost>=my?'Alta frecuencia / Alto costo':g.orders>=mx?'Alta frecuencia':g.cost>=my?'Alto costo':'Menor impacto relativo'})).sort((a,b)=>(b.score??-1)-(a.score??-1)||b.orders-a.orders)};
}
function analyze(rows,mapping,paretoField='equipment',priorityField='equipment'){
 const validCost=values(rows,'cost'),closed=rows.filter(r=>r.type==='Correctivo'&&r.status==='CERRADA');
 // MTTR usa exclusivamente Tiempo_reparacion_h explícito, positivo, de correctivas cerradas.
 const repairs=closed.filter(r=>r.repair!=null&&r.repair>0),repairTimes=repairs.map(r=>r.repair);
 const validElapsed=values(rows,'elapsed').filter(v=>v>=0),delays=values(rows,'delay');
 const dateField=['created','start','planned'].find(f=>mapping[f])||null,monthly=new Map();
 if(dateField)for(const r of rows)if(r[dateField]!=null){const month=new Date(r[dateField]).toISOString().slice(0,7);if(!monthly.has(month))monthly.set(month,new Set());if(r.ot)monthly.get(month).add(r.ot);}
 const startMonths=[...monthly.keys()].sort();if(startMonths.length){const cursor=new Date(startMonths[0]+'-01T00:00:00Z'),last=startMonths.at(-1);let safe=0;while(cursor.toISOString().slice(0,7)<=last&&safe++<1200){const m=cursor.toISOString().slice(0,7);if(!monthly.has(m))monthly.set(m,new Set());cursor.setUTCMonth(cursor.getUTCMonth()+1);}}
 const jkField=mapping.equipment?'equipment':mapping.location?'location':null;
 function jackknife(field){
  if(!field)return {data:[],xThreshold:0,yThreshold:0};const base=groups(repairs.filter(r=>r[field]),field);
  const entries=base.filter(g=>g.orders>0).map(g=>({...g,mttr:mean(repairs.filter(r=>r[field]===g.label).map(r=>r.repair))}));
  const x=mean(entries.map(g=>g.orders)),y=mean(entries.map(g=>g.mttr));
  return {xThreshold:1,yThreshold:1,data:entries.map(g=>({...g,x:g.orders/x,y:g.mttr/y,risk:(g.orders/x)*(g.mttr/y),quadrant:g.orders>=x&&g.mttr>=y?'Grave':g.orders>=x?'Crónico':g.mttr>=y?'Agudo':'Bajo control'})).sort((a,b)=>b.risk-a.risk)};
 }
 const mttrType=groups(repairs,'equipmentType').map(g=>({...g,mttr:mean(repairs.filter(r=>(r.equipmentType||'Sin información')===g.label).map(r=>r.repair))})).sort((a,b)=>b.mttr-a.mttr);
 const total=unique(rows,'ot'),corr=unique(rows.filter(r=>r.type==='Correctivo'),'ot'); const paretoRows=paretoField==='mode'?rows.filter(r=>r.mode&&(!mapping.type||r.type==='Correctivo')&&(!mapping.status||r.status==='CERRADA')):rows;
 return {rows,total,records:rows.length,equipment:unique(rows,'equipment'),locations:unique(rows,'location'),cost:validCost.length?sum(rows,'cost'):null,averageCost:mean(validCost),costCoverage:rows.length?validCost.length/rows.length*100:0,labor:mapping.labor&&values(rows,'labor').some(v=>v>=0)?sum(rows.filter(r=>r.labor>=0),'labor'):null,downtime:mapping.downtime&&values(rows,'downtime').some(v=>v>=0)?sum(rows.filter(r=>r.downtime>=0),'downtime'):null,mttr:mean(repairTimes),medianRepair:median(repairTimes),repairCount:repairs.length,elapsedMean:mean(validElapsed),delayMean:mean(delays),delayCount:delays.length,late:rows.filter(r=>r.delay>0).length,correctiveShare:total?corr/total*100:null,mix:groups(rows,'type'),statuses:groups(rows,'status'),monthly:[...monthly].sort(([a],[b])=>a.localeCompare(b)).map(([label,set])=>({label,orders:set.size})),dateField,paretoOrders:paretoField?groups(paretoRows,paretoField):[],paretoCost:paretoField?groups(paretoRows,paretoField,'cost'):[],paretoDowntime:paretoField?groups(paretoRows,paretoField,'downtime'):[],delayGroups:['Adelantada','A tiempo','Atrasada','Sin fechas comparables'].map(label=>({label,records:rows.filter(r=>r.delayClass===label).length})),priority:priority(rows,priorityField),jk:jackknife(jkField),jkMode:mapping.mode?jackknife('mode'):{data:[]},mttrType};
}
const api={fields,numeric,dates,clean,key,detect,number,date,normalize,analyze,groups,sum,mean,median,unique};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else global.GMAO=api;
})(typeof globalThis!=='undefined'?globalThis:this);

