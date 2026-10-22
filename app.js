const ID='1_mZfQJLd0nvw9twm3vDVl954JvdMwBXyULrqGypUbok';
const GOOGLE_CLIENT_ID='712316085580-jj3ri3sk7vn7ag8sl4np4p1aob74q619.apps.googleusercontent.com';
const $=id=>document.getElementById(id),fmt=n=>n.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const colors=['#1673bb','#a16bd4','#ec5799','#20b8bd','#ffb343','#5b87e5'];
let source={updatedAt:'2026-10-22T00:00:00+07:00',sheets:Object.fromEntries(STAFF.map(s=>[s,[]]))},data=normalize(source.sheets),token=null;
const SESSION_KEY='staff-dashboard-google-session-v1';
function clearSession(){token=null;try{sessionStorage.removeItem(SESSION_KEY);}catch{}}
function rememberSession(response){
  token=response.access_token;
  const seconds=Number(response.expires_in);
  if(!Number.isFinite(seconds)||seconds<=60)return;
  try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({token,expiresAt:Date.now()+(seconds-60)*1000,client:GOOGLE_CLIENT_ID}));}catch{}
}
function restoreSession(){
  try{const saved=JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if(saved&&saved.client===GOOGLE_CLIENT_ID&&typeof saved.token==='string'&&saved.token&&Number.isFinite(saved.expiresAt)&&saved.expiresAt>Date.now()){token=saved.token;return true;}
  }catch{}
  clearSession();return false;
}
function monthLabel(m){return m==='ทั้งหมด'?'รวมทุกเดือน':m==='ไม่ระบุเดือน'?m:new Date(m+'-01T00:00:00Z').toLocaleDateString('th-TH',{month:'long',year:'numeric',timeZone:'UTC'});}
function element(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
function rings(id,groups,total){const root=$(id);root.replaceChildren();const active=groups.filter(x=>x[1]>0);if(!active.length){const empty=element('div',undefined,'empty'),circle=element('div',undefined,'ring');circle.style.setProperty('--angle','0deg');circle.style.setProperty('--color','#197c69');const hole=element('div',undefined,'hole');hole.append(element('b','—'));circle.append(hole);empty.append(circle,element('span','ยังไม่มีข้อมูลสำหรับมุมมองนี้'));root.append(empty);return;}
 active.forEach(([name,value],i)=>{const p=total?value/total*100:0,item=element('article',undefined,'ringitem'),ring=element('div',undefined,'ring');ring.style.setProperty('--color',colors[i%colors.length]);ring.style.setProperty('--angle',p*3.6+'deg');ring.setAttribute('role','img');ring.setAttribute('aria-label',`${name} ${p.toFixed(1)}% ${fmt(value)} บาท`);const hole=element('div',undefined,'hole');hole.append(element('small','สัดส่วนวงเงิน'),element('b',p.toFixed(1)+'%'));ring.append(hole);item.append(ring,element('h3',name),element('p',fmt(value)+' บาท'));root.append(item);});}
function render(){const s=summarize(data.records,$('staff').value,$('month').value);$('allocated').textContent=fmt(s.allocated);$('remaining').textContent=fmt(s.allocated-s.agreed);$('agreed').textContent=fmt(s.agreed);$('count').textContent=s.count.toLocaleString('th-TH');$('paid').textContent=fmt(s.paid);$('period').textContent='บาท · '+monthLabel($('month').value);$('payPeriod').textContent=monthLabel($('month').value);for(const k of ['budget','category','method'])rings(k,s[k],s.agreed);rings('payBy',s.payBy,s.paid);
 const warnings=[...data.warnings];if(s.conflicts.length)warnings.push('เลขสัญญาซ้ำแต่ยอดต่างกัน โปรดตรวจสอบ: '+[...new Set(s.conflicts)].join(', '));if(s.unknown)warnings.push('ยอดที่ยังแยกเดือนไม่ได้ '+fmt(s.unknown)+' บาท');$('warnings').textContent=warnings.join(' • ');
 const visible=s.rows.filter(r=>$('month').value==='ทั้งหมด'||($('month').value==='ไม่ระบุเดือน'?!r.date:r.date?.slice(0,7)===$('month').value));$('rowCount').textContent=visible.length+' รายการ';$('rows').replaceChildren();for(const r of visible){const tr=element('tr');for(const v of [r.staff,r.title||'—',r.vendor||'—',r.contract||'ยังไม่ออก',r.budget,fmt(r.allocated),fmt(r.agreed),fmt(r.paid),r.date?new Date(r.date+'T00:00:00Z').toLocaleDateString('th-TH',{timeZone:'UTC'}):'—'])tr.append(element('td',v));$('rows').append(tr);}if(!visible.length){const td=element('td','ยังไม่มีรายการในมุมมองนี้');td.colSpan=9;const tr=element('tr');tr.append(td);$('rows').append(tr);}}
function accept(next,label){const parsed=normalize(next.sheets,next.headers);source=next;data=parsed;const old=$('month').value;const months=[...new Set(data.records.filter(r=>r.date).map(r=>r.date.slice(0,7)))].sort().reverse();$('month').replaceChildren(...['ทั้งหมด',...months,'ไม่ระบุเดือน'].map(m=>{const o=element('option',monthLabel(m));o.value=m;return o;}));if([...$('month').options].some(o=>o.value===old))$('month').value=old;$('sourceLabel').textContent=label;$('status').textContent='อัปเดต '+new Date(next.updatedAt).toLocaleString('th-TH')+' · '+data.records.length+' รายการ';render();}
async function readGoogle(){if(!token)throw Error('กรุณาเชื่อมต่อ Google ในส่วนเชื่อมต่อข้อมูลก่อน');const ranges=STAFF.map(s=>`'${s}'!A4:AC`);const fields='sheets(properties(title),data(startRow,rowData(values(userEnteredValue,effectiveValue,formattedValue))))';const url='https://sheets.googleapis.com/v4/spreadsheets/'+ID+'?includeGridData=true&fields='+encodeURIComponent(fields)+'&'+ranges.map(r=>'ranges='+encodeURIComponent(r)).join('&');const res=await fetch(url,{headers:{Authorization:'Bearer '+token}});if(res.status===401)clearSession();if(!res.ok)throw Error(res.status===401?'การเข้าสู่ระบบหมดอายุ กรุณาเชื่อมต่อใหม่':'อ่านข้อมูลไม่ได้ ตรวจสิทธิ์เข้าถึงไฟล์และการเปิด Google Sheets API');const json=await res.json();const sheets={},headers={};for(const s of json.sheets||[]){const rows=s.data?.[0]?.rowData||[];headers[s.properties.title]=(rows[0]?.values||[]).map(c=>c.formattedValue||'');sheets[s.properties.title]=rows.slice(1).map(r=>(r.values||[]).map((c,j)=>{if(c.userEnteredValue?.formulaValue?.includes('TODAY()'))return '';const v=c.effectiveValue||{};if(v.errorValue)return '#ERROR';return headers[s.properties.title][j]?.includes('เลขที่สัญญา')?(c.formattedValue||v.stringValue||String(v.numberValue??'')):v.numberValue??v.stringValue??'';}));}accept({updatedAt:new Date().toISOString(),sheets,headers},'ข้อมูลสดจาก Google Sheets');}
async function refresh(){const b=$('refresh');b.disabled=true;try{if(window.google?.script?.run){await new Promise((resolve,reject)=>google.script.run.withSuccessHandler(v=>{accept(v,'ข้อมูลสดจาก Google Sheets');resolve();}).withFailureHandler(reject).getDashboardData());}else await readGoogle();}catch(e){$('status').textContent=e.message||String(e);}finally{b.disabled=false;}}
$('staff').onchange=render;$('month').onchange=render;$('refresh').onclick=refresh;
// Load Google before the click so the popup retains the user's browser gesture.
const authStatus=element('p','กำลังโหลดบริการเข้าสู่ระบบ Google…');
authStatus.id='authStatus';authStatus.setAttribute('role','status');authStatus.setAttribute('aria-live','polite');
$('connect').after(authStatus);
function authMessage(message){authStatus.textContent=message;$('status').textContent=message;}
let authLoading=false;
function loadGoogleIdentity(){
  if(window.google?.accounts?.oauth2){authMessage('พร้อมเชื่อมต่อ กดปุ่มเข้าสู่ระบบ Google');return;}
  if(authLoading)return;
  authLoading=true;$('connect').disabled=true;
  const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
  const timer=setTimeout(()=>finish(false),15000);
  let finished=false;
  function finish(ok){if(finished)return;finished=true;clearTimeout(timer);authLoading=false;$('connect').disabled=false;
    if(ok&&window.google?.accounts?.oauth2)authMessage('พร้อมเชื่อมต่อ กดปุ่มเข้าสู่ระบบ Google');
    else {script.remove();authMessage('โหลดบริการ Google ไม่สำเร็จ ลองกดอีกครั้ง หรือเปิดเว็บนี้ใน Chrome / Edge');}
  }
  script.onload=()=>finish(true);script.onerror=()=>finish(false);document.head.append(script);
}
$('connect').onclick=()=>{
  if(!window.google?.accounts?.oauth2){loadGoogleIdentity();return;}
  try{
    const client_id=$('clientId').value.trim();
    if(!client_id.endsWith('.apps.googleusercontent.com'))throw Error('Client ID ไม่ถูกต้อง');
    authMessage('กำลังเปิดหน้าต่าง Google หากไม่ปรากฏ ให้ตรวจการบล็อกป๊อปอัปข้างแถบที่อยู่เว็บ');
    google.accounts.oauth2.initTokenClient({client_id,scope:'https://www.googleapis.com/auth/spreadsheets.readonly',
      error_callback:e=>authMessage(e.type==='popup_failed_to_open'?'เปิดหน้าต่าง Google ไม่ได้ กรุณาอนุญาตป๊อปอัปสำหรับเว็บนี้ หรือเปิดด้วย Chrome / Edge':e.type==='popup_closed'?'ปิดหน้าต่างเข้าสู่ระบบแล้ว สามารถกดเข้าสู่ระบบใหม่ได้':'เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง'),
      callback:async r=>{
        if(r.error||!r.access_token){authMessage('Google ไม่อนุญาตการเข้าสู่ระบบ: '+(r.error||'ไม่พบสิทธิ์เข้าถึง'));return;}
        clearSession();rememberSession(r);authMessage('เข้าสู่ระบบแล้ว กำลังอ่านข้อมูลจากชีต…');
        try{await readGoogle();authStatus.textContent='เชื่อมต่อสำเร็จ · '+data.records.length+' รายการ · '+new Date().toLocaleString('th-TH');}
        catch(e){authMessage(e.message||'อ่านข้อมูลไม่สำเร็จ');}
      }
    }).requestAccessToken();
  }catch(e){authMessage(e.message);}
};
$('import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>10*1024*1024)throw Error('ไฟล์ใหญ่เกิน 10 MB');const next=JSON.parse(await file.text());if(!next.updatedAt||Number.isNaN(Date.parse(next.updatedAt)))throw Error('ไม่มีวันที่อัปเดตที่ถูกต้อง');accept(next,'ข้อมูลจากไฟล์ที่นำเข้า');}catch(e){$('status').textContent='นำเข้าไม่สำเร็จ: '+e.message;}};
$('export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(source,null,2)],{type:'application/json'}));const a=element('a');a.href=u;a.download='staff-dashboard-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
$('clientId').value=GOOGLE_CLIENT_ID;
render();if(window.google?.script?.run)refresh();
else if(restoreSession()){
  authMessage('กำลังเชื่อมต่อด้วยการเข้าสู่ระบบเดิม…');
  readGoogle().then(()=>{authStatus.textContent='เชื่อมต่อแล้ว · รีเฟรชในแท็บนี้ได้โดยไม่ต้องเข้าสู่ระบบซ้ำ';}).catch(e=>{authMessage(e.message);});
}else { $('sourceLabel').textContent='ยังไม่ได้เชื่อม Google Sheets'; loadGoogleIdentity(); }
const disconnect=element('button','ออกจากการเชื่อมต่อ');disconnect.type='button';$('connect').after(disconnect);
disconnect.onclick=()=>{clearSession();source={updatedAt:new Date().toISOString(),sheets:Object.fromEntries(STAFF.map(s=>[s,[]]))};accept(source,'ออกจากการเชื่อมต่อแล้ว');authMessage('ล้างการเชื่อมต่อในแท็บนี้แล้ว');};
