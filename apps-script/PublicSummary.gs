const PUBLIC_SOURCE_ID='1_mZfQJLd0nvw9twm3vDVl954JvdMwBXyULrqGypUbok';
const PUBLIC_STAFF=['บ๋อมแบ๋ม','ส้ม','ดรีม','นุ้ย','หนุ่ม'];

function publicCell_(cell,header){
  if(!cell)return '';
  if(cell.userEnteredValue&&cell.userEnteredValue.formulaValue&&/TODAY\(\)/i.test(cell.userEnteredValue.formulaValue))return '';
  const value=cell.effectiveValue||{};
  if(value.errorValue)return '';
  if(String(header||'').replace(/\s/g,'').indexOf('เลขที่สัญญา')>=0)return cell.formattedValue||value.stringValue||String(value.numberValue==null?'':value.numberValue);
  return value.numberValue==null?(value.stringValue||cell.formattedValue||''):value.numberValue;
}
function publicDate_(value){
  if(typeof value==='number'){
    if(value<36526||value>73415)return null;
    return new Date(Date.UTC(1899,11,30)+Math.floor(value)*86400000).toISOString().slice(0,10);
  }
  if(typeof value!=='string'||!value.trim())return null;
  var match=value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/),y,m,d;
  if(match){y=Number(match[1]);m=Number(match[2]);d=Number(match[3]);}
  else {match=value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(!match)return null;d=Number(match[1]);m=Number(match[2]);y=Number(match[3]);if(y>2400)y-=543;}
  var dt=new Date(Date.UTC(y,m-1,d));
  return y>=2000&&y<=2100&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d?dt.toISOString().slice(0,10):null;
}
function publicCategory_(value){
  var category=String(value||'ไม่ระบุ').trim()||'ไม่ระบุ';
  return category.replace(/^PC\.20\.4(?=\s|$)/,'70.20.4');
}
function publicRead_(){
  var ranges=PUBLIC_STAFF.map(function(name){return "'"+name+"'!A4:AC";});
  var result=Sheets.Spreadsheets.get(PUBLIC_SOURCE_ID,{ranges:ranges,includeGridData:true,fields:'sheets(properties(title),data(rowData(values(userEnteredValue,effectiveValue,formattedValue))))'});
  var records=[];
  (result.sheets||[]).forEach(function(sheet){
    var name=sheet.properties.title,rows=((sheet.data||[])[0]||{}).rowData||[];
    var headers=((rows[0]||{}).values||[]).map(function(cell){return cell.formattedValue||'';});
    var clean=function(v){return String(v==null?'':v).replace(/\s/g,'');};
    var index={};
    ['รายการ','งบประมาณ','หมวดหมู่ประเภทงาน','วิธีการจัดจ้าง','วงเงินงบประมาณ','วงเงินที่ตกลงจ้าง','ผู้รับจ้าง','เลขที่สัญญา/ใบสั่งจ้าง','วันที่','สถานะ','จำนวนเงินที่ส่งการเงิน','วันที่ส่งการเงิน'].forEach(function(label){index[label]=headers.findIndex(function(h){return clean(h)===clean(label);});});
    if(Object.keys(index).some(function(k){return index[k]<0;}))throw new Error('หัวคอลัมน์ไม่ครบในชีต '+name);
    rows.slice(1).forEach(function(row,rowIndex){
      var cells=row.values||[],get=function(label){return publicCell_(cells[index[label]],headers[index[label]]);};
      var title=String(get('รายการ')||'').trim(),contract=String(get('เลขที่สัญญา/ใบสั่งจ้าง')||'').trim();
      if(!title&&!contract)return;
      var status=String(get('สถานะ')||'').replace(/\s/g,'');
      if(status==='ยกเลิก')return;
      var amount=function(label){var value=get(label);if(value===''||value==null)return 0;var n=typeof value==='number'?value:Number(String(value).replace(/,/g,''));return Number.isFinite(n)&&n>=0?n:0;};
      records.push({
        staff:name,row:rowIndex+5,title:title,budget:String(get('งบประมาณ')||'ไม่ระบุ').trim()||'ไม่ระบุ',
        category:publicCategory_(get('หมวดหมู่ประเภทงาน')),method:String(get('วิธีการจัดจ้าง')||'ไม่ระบุ').trim()||'ไม่ระบุ',
        allocated:amount('วงเงินงบประมาณ'),agreed:amount('วงเงินที่ตกลงจ้าง'),contract:contract,
        issueDate:publicDate_(get('วันที่')),paid:amount('จำนวนเงินที่ส่งการเงิน'),paidDate:publicDate_(get('วันที่ส่งการเงิน'))
      });
    });
  });
  return records;
}
function publicUnique_(rows){
  var unique={};
  rows.forEach(function(row){var key=row.contract?row.contract.replace(/\s+/g,'').toLowerCase():row.staff+':'+row.row;if(!unique[key])unique[key]=row;});
  return Object.keys(unique).map(function(key){return unique[key];});
}
function publicGroup_(contracts,key,amountKey){
  amountKey=amountKey||'agreed';
  var grouped={};contracts.forEach(function(row){grouped[row[key]]=(grouped[row[key]]||0)+row[amountKey];});
  return Object.keys(grouped).map(function(k){return [k,grouped[k],contracts.filter(function(row){return row[key]===k&&!!row.contract;}).length];}).sort(function(a,b){return b[1]-a[1];});
}
function publicSummaryView_(records,staff,month){
  var rows=records.filter(function(row){return staff==='ทั้งหมด'||row.staff===staff;}),contracts=publicUnique_(rows);
  var payments=rows.filter(function(row){return month==='ทั้งหมด'||(month==='ไม่ระบุเดือน'?!row.paidDate:row.paidDate&&row.paidDate.slice(0,7)===month);});
  return {
    allocated:contracts.reduce(function(s,r){return s+r.allocated;},0),agreed:contracts.reduce(function(s,r){return s+r.agreed;},0),
    count:contracts.filter(function(r){return !!r.contract;}).length,paid:payments.reduce(function(s,r){return s+r.paid;},0),
    unknown:rows.filter(function(r){return !r.paidDate;}).reduce(function(s,r){return s+r.paid;},0),
    budget:publicGroup_(contracts,'budget','allocated'),category:publicGroup_(contracts,'category','allocated'),method:publicGroup_(contracts,'method','allocated'),
    payBy:PUBLIC_STAFF.map(function(name){return [name,payments.filter(function(r){return r.staff===name;}).reduce(function(s,r){return s+r.paid;},0)];})
  };
}
function publicOrderView_(records,staff,month){
  var rows=publicUnique_(records.filter(function(row){return (staff==='ทั้งหมด'||row.staff===staff)&&row.contract;}));
  rows=rows.filter(function(row){return month==='ทั้งหมด'||(month==='ไม่ระบุเดือน'?!row.issueDate:row.issueDate&&row.issueDate.slice(0,7)===month);});
  return {amount:rows.reduce(function(s,r){return s+r.agreed;},0),count:rows.length,
    byStaff:PUBLIC_STAFF.map(function(name){var part=rows.filter(function(r){return r.staff===name;});return [name,part.reduce(function(s,r){return s+r.agreed;},0),part.length];}),
    byMethod:publicGroup_(rows,'method','agreed'),byCategory:publicGroup_(rows,'category','agreed')};
}
function publicPayload_(){
  var records=publicRead_();
  var months=['ทั้งหมด'].concat(Array.from(new Set(records.filter(function(r){return r.paidDate;}).map(function(r){return r.paidDate.slice(0,7);}))).sort().reverse()).concat(['ไม่ระบุเดือน']);
  var orderMonths=['ทั้งหมด'].concat(Array.from(new Set(records.filter(function(r){return r.contract&&r.issueDate;}).map(function(r){return r.issueDate.slice(0,7);}))).sort().reverse()).concat(['ไม่ระบุเดือน']);
  var views={},orders={};
  ['ทั้งหมด'].concat(PUBLIC_STAFF).forEach(function(staff){
    views[staff]={};months.forEach(function(month){views[staff][month]=publicSummaryView_(records,staff,month);});
    orders[staff]={};orderMonths.forEach(function(month){orders[staff][month]=publicOrderView_(records,staff,month);});
  });
  return {version:3,updatedAt:new Date().toISOString(),months:months,orderMonths:orderMonths,views:views,orders:orders};
}
function doGet(){
  var payload;
  try{
    var cache=CacheService.getScriptCache(),cached=cache.get('public-v3-dropdown');
    payload=cached?JSON.parse(cached):publicPayload_();
    if(!cached){var json=JSON.stringify(payload);if(json.length<90000)cache.put('public-v3-dropdown',json,60);}
  }catch(error){payload={version:3,error:'ไม่สามารถอัปเดตข้อมูลได้ในขณะนี้'};}
  return ContentService.createTextOutput('receivePublicDashboard('+JSON.stringify(payload)+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}
function checkSummary(){var result=publicPayload_();if(result.version!==2)throw new Error('รุ่นข้อมูลไม่ถูกต้อง');return {updatedAt:result.updatedAt,months:result.months.length,orderMonths:result.orderMonths.length};}
