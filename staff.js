const ID='1_mZfQJLd0nvw9twm3vDVl954JvdMwBXyULrqGypUbok';
const GOOGLE_CLIENT_ID='712316085580-jj3ri3sk7vn7ag8sl4np4p1aob74q619.apps.googleusercontent.com';

const $=id=>document.getElementById(id), fmt=n=>n.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
let token=null, records=[], generation=0, expiry=null;
function cell(tag,text){const e=document.createElement(tag);e.textContent=text;return e;}
function render(){
 const query=$('search').value.trim().normalize('NFKC').toLocaleLowerCase();
 const rows=records.filter(r=>($('staff').value==='ทั้งหมด'||r.staff===$('staff').value)&&[r.title,r.vendor,r.contract].some(v=>String(v).normalize('NFKC').toLocaleLowerCase().includes(query)));
 $('rowCount').textContent=rows.length+' รายการ';$('rows').replaceChildren();
 for(const r of rows){const tr=document.createElement('tr');for(const v of [r.staff,r.title||'—',r.vendor||'—',r.contract||'ยังไม่ออก',r.budget,fmt(r.allocated),fmt(r.agreed),fmt(r.paid),r.date?new Date(r.date+'T00:00:00Z').toLocaleDateString('th-TH',{timeZone:'UTC'}):'—'])tr.append(cell('td',v));$('rows').append(tr);}
 if(!rows.length){const tr=document.createElement('tr'),td=cell('td',token?'ไม่พบรายการที่ตรงกับการค้นหา':'เข้าสู่ระบบเพื่อดูรายการ');td.colSpan=9;tr.append(td);$('rows').append(tr);}
}
function clearSession(){generation++;token=null;records=[];clearTimeout(expiry);$('search').value='';$('search').disabled=true;$('staff').disabled=true;$('refresh').disabled=true;render();}
function accept(next){records=normalize(next.sheets,next.headers).records;$('search').disabled=false;$('staff').disabled=false;$('refresh').disabled=false;$('status').textContent='ตรวจสิทธิ์อ่านชีตแล้ว · อัปเดต '+new Date(next.updatedAt).toLocaleString('th-TH');render();}
async function readGoogle(){if(!token)throw Error('กรุณาเชื่อมต่อ Google ในส่วนเชื่อมต่อข้อมูลก่อน');const ranges=STAFF.map(s=>`'${s}'!A4:AC`);const fields='sheets(properties(title),data(startRow,rowData(values(userEnteredValue,effectiveValue,formattedValue))))';const url='https://sheets.googleapis.com/v4/spreadsheets/'+ID+'?includeGridData=true&fields='+encodeURIComponent(fields)+'&'+ranges.map(r=>'ranges='+encodeURIComponent(r)).join('&');const version=generation;const res=await fetch(url,{headers:{Authorization:'Bearer '+token}});if(version!==generation)return;if(res.status===401)clearSession();if(!res.ok)throw Error(res.status===401?'การเข้าสู่ระบบหมดอายุ กรุณาเชื่อมต่อใหม่':'อ่านข้อมูลไม่ได้ ตรวจสิทธิ์เข้าถึงไฟล์และการเปิด Google Sheets API');const json=await res.json();if(version!==generation)return;const sheets={},headers={};for(const s of json.sheets||[]){const rows=s.data?.[0]?.rowData||[];headers[s.properties.title]=(rows[0]?.values||[]).map(c=>c.formattedValue||'');sheets[s.properties.title]=rows.slice(1).map(r=>(r.values||[]).map((c,j)=>{if(c.userEnteredValue?.formulaValue?.includes('TODAY()'))return '';const v=c.effectiveValue||{};if(v.errorValue)return '#ERROR';return headers[s.properties.title][j]?.includes('เลขที่สัญญา')?(c.formattedValue||v.stringValue||String(v.numberValue??'')):v.numberValue??v.stringValue??'';}));}accept({updatedAt:new Date().toISOString(),sheets,headers},'ข้อมูลสดจาก Google Sheets');}

async function refresh(){const version=generation;$('refresh').disabled=true;try{await readGoogle();}catch(e){if(version!==generation)return;records=[];render();$('status').textContent=e.message;}finally{if(version===generation)$('refresh').disabled=!token;}}
$('search').oninput=render;$('staff').onchange=render;$('refresh').onclick=refresh;
$('disconnect').onclick=()=>{clearSession();$('status').textContent='ออกจากระบบและล้างรายการในหน้านี้แล้ว';};
$('connect').onclick=()=>{if(!window.google?.accounts?.oauth2){$('status').textContent='บริการ Google ยังไม่พร้อม กรุณารีเฟรชแล้วลองใหม่';return;}
 const version=++generation;
 google.accounts.oauth2.initTokenClient({client_id:GOOGLE_CLIENT_ID,scope:'https://www.googleapis.com/auth/spreadsheets.readonly',error_callback:()=>{$('status').textContent='เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่และอนุญาตป๊อปอัป';},callback:async response=>{
 if(version!==generation)return;clearSession();if(response.error||!response.access_token){$('status').textContent='Google ไม่อนุญาตการเข้าสู่ระบบ';return;}
 token=response.access_token;expiry=setTimeout(()=>{clearSession();$('status').textContent='สิทธิ์หมดอายุ กรุณาเข้าสู่ระบบใหม่';},Math.max(0,(Number(response.expires_in)||3600)-60)*1000);
 $('status').textContent='กำลังตรวจสิทธิ์และอ่านรายการ…';await refresh();
 }}).requestAccessToken();};
window.addEventListener('pagehide',clearSession);render();
