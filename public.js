const $=id=>document.getElementById(id),fmt=n=>n.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const colors=['#1673bb','#a16bd4','#ec5799','#20b8bd','#ffb343','#5b87e5'];
const palettes={budget:['#1673bb','#20b8bd','#ffb343','#5b87e5','#45a878','#4c6fa9'],category:['#a16bd4','#ec5799','#f28c5b','#7f6bd8','#d1a634','#b14e8f'],method:['#20b8bd','#ffb343','#4f86d9','#ec5799','#6dbb7b','#8b6cd6']};let snapshot=null,pending=false,script=null,timer=null;
function monthLabel(m){return m==='ทั้งหมด'?'รวมทุกเดือน':m==='ไม่ระบุเดือน'?m:new Date(m+'-01T00:00:00Z').toLocaleDateString('th-TH',{month:'long',year:'numeric',timeZone:'UTC'});}
function element(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
function rings(id,groups,total){const root=$(id);root.replaceChildren();const active=groups.filter(x=>x[1]>0);if(!active.length){const empty=element('div',undefined,'empty'),circle=element('div',undefined,'ring');circle.style.setProperty('--angle','0deg');circle.style.setProperty('--color','#197c69');const hole=element('div',undefined,'hole');hole.append(element('b','—'));circle.append(hole);empty.append(circle,element('span','ยังไม่มีข้อมูลสำหรับมุมมองนี้'));root.append(empty);return;}
 active.forEach(([name,value,count],i)=>{const p=total?value/total*100:0,item=element('article',undefined,'ringitem'),ring=element('div',undefined,'ring');const palette=palettes[id]||colors;ring.style.setProperty('--color',palette[i%palette.length]);ring.style.setProperty('--angle',p*3.6+'deg');ring.setAttribute('role','img');ring.setAttribute('aria-label',`${name} ${p.toFixed(1)}% ${fmt(value)} บาท`);const hole=element('div',undefined,'hole');hole.append(element('small','สัดส่วนวงเงิน'),element('b',p.toFixed(1)+'%'));ring.append(hole);item.append(ring,element('h3',name),element('p',fmt(value)+' บาท'));if(id==='method')item.append(element('small',Number(count||0).toLocaleString('th-TH')+' ฉบับ','ring-count'));root.append(item);});}
const workGroups={
 '20.1':'PC20.1 จ้างเหมาบริการ/ เช่าเครื่องมือแพทย์',
 '20.2':'PC20.2 ซ่อมแซม ปรับปรุง ต่อเดิม รื้อถอน และบำรุงรักษา',
 '20.2.3':'PC20.2.3 จ้างซ่อมครุภัณฑ์ทางการแพทย์/ สำนักงาน และอื่นๆ',
 '20.3':'PC20.3 ค่าตรวจวิเคราะห์รับรองคุณภาพ',
 '20.4':'PC20.4 ค่าใช้สอยอื่นๆ (เบี้ยประกันภัย)',
 '20.5':'PC20.5 งบกลาง (กรณี ฉุกเฉิน จำเป็น เร่งด่วน)',
 '23':'PC 23',
};
function workCode(name){
 return name.trim().match(/^PC[.\s]*(\d+(?:\.\d+)*)(?=\s|$)/i)?.[1];
}
function workGroup(name){
 const code=workCode(name);
 const key=['20.2.3','20.2','20.1','20.3','20.4','20.5','23']
   .find(prefix=>code===prefix||code?.startsWith(prefix+'.'));
 if(name.trim()==='เงินบริจาค')return 'เงินบริจาค';
 return workGroups[key]||(name.trim()==='นอกแผน'?'นอกแผน':'อื่น ๆ / ไม่ระบุ');
}
function renderWorkCategories(rows,total){
 const groups=new Map();
 for(const [name,value,count] of rows){
   const label=name.trim()==='งบศูนย์แพททย์'?'งบศูนย์แพทย์':name;
   const group=label==='งบศูนย์แพทย์'?label:workGroup(label);
   if(!groups.has(group))groups.set(group,{amount:0,rows:[]});
   const entry=groups.get(group);
   entry.amount+=Number(value||0);
   const existing=label==='งบศูนย์แพทย์'&&entry.rows[0];
   if(existing){
     existing[1]+=Number(value||0);
     existing[2]+=Number(count||0);
   }else entry.rows.push([label,Number(value||0),Number(count||0)]);
 }
 const filter=$('categoryFilter'),selected=filter.value;
 const ordered=[...Object.keys(workGroups).sort((a,b)=>a.localeCompare(b,'en',{numeric:true})).map(code=>workGroups[code]),'งบศูนย์แพทย์','เงินบริจาค','นอกแผน','อื่น ๆ / ไม่ระบุ'].filter(name=>groups.has(name));
 filter.replaceChildren(...['',...ordered].map(name=>{
   const option=element('option',name||'ทุกประเภทงาน');
   option.value=name;
   return option;
 }));
 filter.value=groups.has(selected)?selected:'';
 const visible=filter.value?[filter.value]:ordered;
 rings('category',visible.map(name=>[name,groups.get(name).amount]),total);
 const root=$('category'),details=element('div',undefined,'finance-summary');
 details.style.gridColumn='1 / -1';
 details.style.width='100%';
 details.style.justifyItems='stretch';
 for(const name of visible){
   const rows=groups.get(name).rows.filter(([label])=>workCode(label)!=='20.2.2.4').map(row=>row.slice());
   for(const [label,amount,count] of groups.get(name).rows){
     if(workCode(label)!=='20.2.2.4')continue;
     let parent=rows.find(([title])=>workCode(title)==='20.2.2');
     if(!parent){
       parent=['PC20.2.2 ปรุงรักษา ครุภัณฑ์ทางการแพทย์/ สำนักงาน และอื่นๆ',0,0];
       rows.push(parent);
     }
     parent[1]+=amount;
     parent[2]=Number(parent[2]||0)+Number(count||0);
   }
   rows.sort(([a],[b])=>(workCode(a)||'~').localeCompare(workCode(b)||'~','en',{numeric:true})||a.localeCompare(b,'th'));
   const card=orderGroup(name,rows,palettes.category);
   card.querySelector('.finance-breakdown').style.borderTop='1px solid #e7edf5';
   details.append(card);
 }
 if(visible.length)root.append(details);
}
function render(){if(!snapshot)return;const s=snapshot.views[$('staff').value]?.[$('month').value];if(!s)return;$('allocated').textContent=fmt(s.allocated);$('remaining').textContent=fmt(s.allocated-s.agreed);$('agreed').textContent=fmt(s.agreed);$('count').textContent=s.count.toLocaleString('th-TH');$('paid').textContent=fmt(s.paid);$('period').textContent='บาท · '+monthLabel($('month').value);renderWorkCategories(s.category,s.allocated);for(const k of ['budget','method'])rings(k,s[k],s.allocated);renderFinance();renderOrders();
$('warnings').textContent=s.unknown?'ยอดที่ยังแยกเดือนไม่ได้ '+fmt(s.unknown)+' บาท':'';}


function orderGroup(title,groups,palette){
 const section=element('section',undefined,'order-group'),heading=element('h3',title),list=element('div',undefined,'finance-breakdown');section.append(heading);
 (groups||[]).forEach(([name,value,count],i)=>{const row=element('div',undefined,'finance-person'),label=element('span'),dot=element('i');dot.style.background=(palette||colors)[i%(palette||colors).length];label.append(dot,element('span',name));row.append(label,element('strong',fmt(Number(value||0))+' บาท'),element('small',Number(count||0).toLocaleString('th-TH')+' ฉบับ'));list.append(row);});
 if(!(groups||[]).length)list.append(element('p','ยังไม่มีข้อมูลในช่วงที่เลือก','finance-note'));section.append(list);return section;
}
function renderOrders(){
 if(!snapshot||!snapshot.orders)return;
 const data=snapshot.orders[$('staff').value]?.[$('issueMonth').value];if(!data)return;
 const total=Number(data.amount||0),root=$('orderBy');root.replaceChildren();
 const ring=element('div',undefined,'finance-donut'),hole=element('div',undefined,'finance-hole');
 ring.style.background=total?'linear-gradient(135deg,#f28c5b,#ec5799)':'#edf1f6';
 ring.setAttribute('role','img');ring.setAttribute('aria-label','วงเงินใบสั่งจ้างและสัญญา '+fmt(total)+' บาท จำนวน '+Number(data.count||0)+' ฉบับ');
 hole.append(element('small','รวม '+Number(data.count||0).toLocaleString('th-TH')+' ฉบับ'),element('b',fmt(total)),element('small','บาท · วงเงินตกลงจ้าง'));ring.append(hole);root.append(ring);
 const groups=element('div',undefined,'order-breakdowns');groups.append(orderGroup('แยกตามวิธีการจัดจ้าง',data.byMethod,palettes.method),orderGroup('แยกตามหมวดหมู่ประเภทงาน',data.byCategory,palettes.category));root.append(groups);
 if(!total)root.append(element('p','ยังไม่มีใบสั่งจ้างหรือสัญญาในช่วงที่เลือก','finance-note'));
}

function renderFinance(){
 if(!snapshot)return;
 const s=snapshot.views['ทั้งหมด']?.[$('financeMonth').value];if(!s)return;
 const groups=(s.payByCategory||[]).map(([name,value])=>[name,Number(value||0)]).filter(([,value])=>value>0);
 const total=groups.reduce((sum,[,value])=>sum+value,0);
 const palette=palettes.category,root=$('payBy');root.replaceChildren();
 const ring=element('div',undefined,'finance-donut'),hole=element('div',undefined,'finance-hole');
 let start=0;const stops=groups.map(([name,value],i)=>{const end=start+value/total*100,stop=palette[i%palette.length]+' '+start+'% '+end+'%';start=end;return stop;});
 ring.style.background=total?'conic-gradient('+stops.join(',')+')':'#edf1f6';
 ring.setAttribute('role','img');ring.setAttribute('aria-label','ยอดส่งการเงินแยกตามหมวดหมู่งาน รวม '+fmt(total)+' บาท');
 hole.append(element('small','รวมทุกหมวด'),element('b',fmt(total)),element('small','บาท'));ring.append(hole);root.append(ring);
 const list=element('div',undefined,'finance-breakdown');
 groups.forEach(([name,value],i)=>{const row=element('div',undefined,'finance-person'),label=element('span'),dot=element('i');dot.style.background=palette[i%palette.length];label.append(dot,element('span',name));row.append(label,element('strong',fmt(value)+' บาท'),element('small',total?(value/total*100).toFixed(1)+'%':'—'));list.append(row);});
 root.append(list);if(!total)root.append(element('p','ยังไม่มียอดส่งการเงินในช่วงที่เลือก','finance-note'));
}

function financeMonths(){
 return snapshot.months.filter(m=>m!=='ทั้งหมด'&&m!=='ไม่ระบุเดือน').sort();
}
function renderMonthlyOverview(){
 if(!snapshot)return;
 const months=financeMonths();
 const staff=['บ๋อมแบ๋ม','ส้ม','ดรีม','นุ้ย','หนุ่ม'];
 const totals=months.map(m=>Number(snapshot.views['ทั้งหมด']?.[m]?.paid||0));
 const max=Math.max(1,...totals);
 const bars=$('monthlyBars');
 bars.replaceChildren();
 if(!months.length)bars.append(element('p','ยังไม่มีวันที่ส่งการเงินที่ใช้สรุปรายเดือนได้','finance-note'));
 months.forEach((m,i)=>{
  const item=element('button',undefined,'month-bar');
  item.type='button';
  item.title=monthLabel(m)+' · '+fmt(totals[i])+' บาท';
  item.setAttribute('aria-label',item.title);
  const value=element('strong',fmt(totals[i]));
  const track=element('span',undefined,'month-track');
  const fill=element('i');
  fill.style.height=(totals[i]/max*100)+'%';
  track.append(fill);
  item.append(value,track,element('small',monthLabel(m)));
  item.onclick=()=>{
   $('financeMonth').value=m;
   renderFinance();
   document.getElementById('finance').scrollIntoView({behavior:'smooth'});
  };
  bars.append(item);
 });
 const head=$('matrixHead');
 const body=$('matrixBody');
 head.replaceChildren();
 body.replaceChildren();
 const hr=element('tr');
 hr.append(element('th','เจ้าหน้าที่'));
 months.forEach(m=>hr.append(element('th',monthLabel(m))));
 hr.append(element('th','รวม'));
 head.append(hr);
 staff.forEach(name=>{
  const tr=element('tr');
  tr.append(element('th',name));
  let total=0;
  months.forEach(m=>{
   const view=snapshot.views[name]?.[m];
   const value=Number(view?.paid||0);
   total+=value;
   tr.append(element('td',fmt(value)));
  });
  tr.append(element('td',fmt(total)));
  body.append(tr);
 });
 const totalRow=element('tr',undefined,'matrix-total');
 totalRow.append(element('th','รวมทั้ง 5 คน'));
 totals.forEach(value=>totalRow.append(element('td',fmt(value))));
 totalRow.append(element('td',fmt(totals.reduce((sum,value)=>sum+value,0))));
 body.append(totalRow);
}

function done(){pending=false;clearTimeout(timer);script?.remove();$('refresh').disabled=false;}
window.receivePublicDashboard=function(next){done();if(next.error||next.version!==3){$('status').textContent='อัปเดตไม่สำเร็จ ข้อมูลเดิมอาจยังไม่ใช่ข้อมูลล่าสุด';return;}snapshot=next;for(const id of ['month','financeMonth']){const old=$(id).value;$(id).replaceChildren(...next.months.map(m=>{const o=element('option',monthLabel(m));o.value=m;return o;}));$(id).value=next.months.includes(old)?old:'ทั้งหมด';}const oldIssue=$('issueMonth').value;$('issueMonth').replaceChildren(...next.orderMonths.map(m=>{const o=element('option',monthLabel(m));o.value=m;return o;}));$('issueMonth').value=next.orderMonths.includes(oldIssue)?oldIssue:'ทั้งหมด';$('sourceLabel').textContent='ข้อมูลสรุปสาธารณะ';$('status').textContent='ข้อมูล ณ '+new Date(next.updatedAt).toLocaleString('th-TH')+' · อัปเดตทุก 5 นาที';render();};
function refresh(){if(pending)return;if(!window.PUBLIC_SUMMARY_URL){$('status').textContent='กำลังตั้งค่าการเชื่อมต่อข้อมูลสาธารณะ';return;}pending=true;$('refresh').disabled=true;script=document.createElement('script');script.src=window.PUBLIC_SUMMARY_URL+'?t='+Date.now();script.onerror=()=>{done();$('status').textContent='อ่านข้อมูลไม่สำเร็จ กรุณาลองอัปเดตอีกครั้ง';};timer=setTimeout(()=>{done();$('status').textContent='การอัปเดตใช้เวลานาน กรุณาลองใหม่';},90000);document.head.append(script);}
$('issueMonth').onchange=renderOrders;$('financeMonth').onchange=renderFinance;$('staff').onchange=render;$('month').onchange=render;$('categoryFilter').onchange=render;$('refresh').onclick=refresh;refresh();setInterval(()=>{if(!document.hidden)refresh();},300000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});

