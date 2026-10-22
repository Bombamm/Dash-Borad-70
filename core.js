const STAFF = ['บ๋อมแบ๋ม','ส้ม','ดรีม','นุ้ย','หนุ่ม'];
function dateKey(value) {
  if (typeof value === 'number') {
    if (value < 36526 || value > 73415) return null;
    return new Date(Date.UTC(1899,11,30)+Math.floor(value)*86400000).toISOString().slice(0,10);
  }
  if (typeof value !== 'string' || !value.trim()) return null;
  let y,m,d,match=value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(match) [,y,m,d]=match.map(Number);
  else {match=value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(!match)return null;[,d,m,y]=match.map(Number);if(y>2400)y-=543;}
  const dt=new Date(Date.UTC(y,m-1,d));
  return y>=2000&&y<=2100&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d?dt.toISOString().slice(0,10):null;
}
function normalize(sheets) {
  const records=[];const warnings=[];
  for(const name of STAFF){
    if(!Array.isArray(sheets[name]))throw Error('ไม่พบข้อมูลชีต '+name);
    sheets[name].forEach((r,i)=>{
      if(!Array.isArray(r))throw Error('ข้อมูลแถวไม่ถูกต้อง');
      const str=j=>String(r[j]??'').trim();
      if(![1,2,3,4,5,6,7,8,9,13,14,15].some(j=>str(j)))return;
      const amount=j=>{if(!str(j))return 0;const n=typeof r[j]==='number'?r[j]:Number(str(j).replace(/,/g,''));if(!Number.isFinite(n)||n<0){warnings.push(`${name} แถว ${i+5}: จำนวนเงินไม่ถูกต้อง`);return 0;}return n;};
      const paid=amount(15),date=dateKey(r[16]);
      if(paid&&!date)warnings.push(`${name} แถว ${i+5}: มียอดส่งการเงิน แต่ไม่มีวันที่ที่ใช้แยกเดือนได้`);
      records.push({staff:name,row:i+5,project:str(1),title:str(3),budget:str(4)||'ไม่ระบุ',category:str(5)||'ไม่ระบุ',method:str(6)||'ไม่ระบุ',agreed:amount(7),contract:str(9),paid,date});
    });
  }
  return {records,warnings};
}
function summarize(records,staff='ทั้งหมด',month='ทั้งหมด') {
  const rows=records.filter(r=>staff==='ทั้งหมด'||r.staff===staff);
  const unique=new Map(),conflicts=[];
  for(const r of rows){const k=r.contract?r.contract.replace(/\s+/g,'').toLowerCase():`${r.staff}:${r.row}`;if(!unique.has(k))unique.set(k,r);else if(unique.get(k).agreed!==r.agreed)conflicts.push(r.contract);}
  const contracts=[...unique.values()];
  const paymentRows=rows.filter(r=>month==='ทั้งหมด'||(month==='ไม่ระบุเดือน'?!r.date:r.date?.slice(0,7)===month));
  const group=(key)=>Object.entries(contracts.reduce((a,r)=>(a[r[key]]=(a[r[key]]||0)+r.agreed,a),{})).sort((a,b)=>b[1]-a[1]);
  const payBy=STAFF.map(s=>[s,paymentRows.filter(r=>r.staff===s).reduce((a,r)=>a+r.paid,0)]);
  return {rows,contracts,conflicts,agreed:contracts.reduce((a,r)=>a+r.agreed,0),count:contracts.filter(r=>r.contract).length,paid:paymentRows.reduce((a,r)=>a+r.paid,0),unknown:rows.filter(r=>!r.date).reduce((a,r)=>a+r.paid,0),budget:group('budget'),category:group('category'),method:group('method'),payBy};
}
if(typeof module!=='undefined')module.exports={STAFF,dateKey,normalize,summarize};
