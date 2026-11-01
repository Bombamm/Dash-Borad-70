const $=id=>document.getElementById(id),fmt=n=>n.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const colors=['#1673bb','#a16bd4','#ec5799','#20b8bd','#ffb343','#5b87e5'];let snapshot=null,pending=false,script=null,timer=null;
function monthLabel(m){return m==='ทั้งหมด'?'รวมทุกเดือน':m==='ไม่ระบุเดือน'?m:new Date(m+'-01T00:00:00Z').toLocaleDateString('th-TH',{month:'long',year:'numeric',timeZone:'UTC'});}
function element(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
function rings(id,groups,total){const root=$(id);root.replaceChildren();const active=groups.filter(x=>x[1]>0);if(!active.length){const empty=element('div',undefined,'empty'),circle=element('div',undefined,'ring');circle.style.setProperty('--angle','0deg');circle.style.setProperty('--color','#197c69');const hole=element('div',undefined,'hole');hole.append(element('b','—'));circle.append(hole);empty.append(circle,element('span','ยังไม่มีข้อมูลสำหรับมุมมองนี้'));root.append(empty);return;}
 active.forEach(([name,value],i)=>{const p=total?value/total*100:0,item=element('article',undefined,'ringitem'),ring=element('div',undefined,'ring');ring.style.setProperty('--color',colors[i%colors.length]);ring.style.setProperty('--angle',p*3.6+'deg');ring.setAttribute('role','img');ring.setAttribute('aria-label',`${name} ${p.toFixed(1)}% ${fmt(value)} บาท`);const hole=element('div',undefined,'hole');hole.append(element('small','สัดส่วนวงเงิน'),element('b',p.toFixed(1)+'%'));ring.append(hole);item.append(ring,element('h3',name),element('p',fmt(value)+' บาท'));root.append(item);});}
function render(){if(!snapshot)return;const s=snapshot.views[$('staff').value]?.[$('month').value];if(!s)return;$('allocated').textContent=fmt(s.allocated);$('remaining').textContent=fmt(s.allocated-s.agreed);$('agreed').textContent=fmt(s.agreed);$('count').textContent=s.count.toLocaleString('th-TH');$('paid').textContent=fmt(s.paid);$('period').textContent='บาท · '+monthLabel($('month').value);const selected=$('categoryFilter').value;const options=s.category.map(([name])=>name);$('categoryFilter').replaceChildren(...['',...options].map(name=>{const o=element('option',name||'ทุกประเภทงาน');o.value=name;return o;}));$('categoryFilter').value=options.includes(selected)?selected:'';for(const k of ['budget','category','method'])rings(k,k==='category'&&$('categoryFilter').value?s[k].filter(([name])=>name===$('categoryFilter').value):s[k],s.agreed);renderFinance();
$('warnings').textContent=s.unknown?'ยอดที่ยังแยกเดือนไม่ได้ '+fmt(s.unknown)+' บาท':'';}

function renderFinance(){
 if(!snapshot)return;
 const s=snapshot.views['ทั้งหมด']?.[$('financeMonth').value];if(!s)return;
 const names=['บ๋อมแบ๋ม','ส้ม','ดรีม','นุ้ย','หนุ่ม'];
 const amounts=new Map(s.payBy);
 const groups=names.map(name=>[name,Number(amounts.get(name)||0)]);
 const total=groups.reduce((sum,[,value])=>sum+value,0);
 const root=$('payBy');root.replaceChildren();
 const ring=element('div',undefined,'finance-donut'),hole=element('div',undefined,'finance-hole');
 let start=0;const stops=groups.filter(([,v])=>v>0).map(([name,value])=>{const end=start+value/total*100;const stop=colors[names.indexOf(name)]+' '+start+'% '+end+'%';start=end;return stop;});
 ring.style.background=total?'conic-gradient('+stops.join(',')+')':'#edf1f6';
 ring.setAttribute('role','img');ring.setAttribute('aria-label','ยอดส่งการเงินรวมทั้ง 5 คน '+fmt(total)+' บาท');
 hole.append(element('small','รวมทั้ง 5 คน'),element('b',fmt(total)),element('small','บาท'));ring.append(hole);root.append(ring);
 const list=element('div',undefined,'finance-breakdown');
 groups.forEach(([name,value],i)=>{const row=element('div',undefined,'finance-person'),label=element('span'),dot=element('i');dot.style.background=colors[i];label.append(dot,element('span',name));row.append(label,element('strong',fmt(value)+' บาท'),element('small',total?(value/total*100).toFixed(1)+'%':'—'));list.append(row);});
 root.append(list);if(!total)root.append(element('p','ยังไม่มียอดส่งการเงินในช่วงที่เลือก','finance-note'));
}

function done(){pending=false;clearTimeout(timer);script?.remove();$('refresh').disabled=false;}
window.receivePublicDashboard=function(next){done();if(next.error||next.version!==1){$('status').textContent='อัปเดตไม่สำเร็จ ข้อมูลเดิมอาจยังไม่ใช่ข้อมูลล่าสุด';return;}snapshot=next;for(const id of ['month','financeMonth']){const old=$(id).value;$(id).replaceChildren(...next.months.map(m=>{const o=element('option',monthLabel(m));o.value=m;return o;}));$(id).value=next.months.includes(old)?old:'ทั้งหมด';}$('sourceLabel').textContent='ข้อมูลสรุปสาธารณะ';$('status').textContent='ข้อมูล ณ '+new Date(next.updatedAt).toLocaleString('th-TH')+' · อัปเดตทุก 5 นาที';render();};
function refresh(){if(pending)return;if(!window.PUBLIC_SUMMARY_URL){$('status').textContent='กำลังตั้งค่าการเชื่อมต่อข้อมูลสาธารณะ';return;}pending=true;$('refresh').disabled=true;script=document.createElement('script');script.src=window.PUBLIC_SUMMARY_URL+'?t='+Date.now();script.onerror=()=>{done();$('status').textContent='อ่านข้อมูลไม่สำเร็จ กรุณาลองอัปเดตอีกครั้ง';};timer=setTimeout(()=>{done();$('status').textContent='การอัปเดตใช้เวลานาน กรุณาลองใหม่';},90000);document.head.append(script);}
$('financeMonth').onchange=renderFinance;$('staff').onchange=render;$('month').onchange=render;$('categoryFilter').onchange=render;$('refresh').onclick=refresh;refresh();setInterval(()=>{if(!document.hidden)refresh();},300000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});

