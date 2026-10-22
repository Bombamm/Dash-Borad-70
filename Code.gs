const SOURCE_ID = '1_mZfQJLd0nvw9twm3vDVl954JvdMwBXyULrqGypUbok';
function doGet() { return HtmlService.createHtmlOutputFromFile('Dashboard').setTitle('Dashboard งานเช่าและจ้างเหมาบริการ'); }
function getDashboardData() {
  const book = SpreadsheetApp.openById(SOURCE_ID), sheets = {}, headers = {};
  ['บ๋อมแบ๋ม','ส้ม','ดรีม','นุ้ย','หนุ่ม'].forEach(name => {
    const sheet = book.getSheetByName(name);
    if (!sheet) throw new Error('ไม่พบชีต ' + name);
    headers[name]=sheet.getRange(4,1,1,sheet.getLastColumn()).getDisplayValues()[0];
    if (sheet.getLastRow() < 5) { sheets[name] = []; return; }
    const range = sheet.getRange(5,1,sheet.getLastRow()-4,sheet.getLastColumn()), values = range.getValues(), displayed=range.getDisplayValues(), formulas = range.getFormulas();
    sheets[name] = values.map((row,i) => row.map((v,j) => {
      if (/TODAY\(\)/i.test(formulas[i][j])) return '';
      if(headers[name][j].includes('เลขที่สัญญา'))return displayed[i][j];
      return v instanceof Date ? Utilities.formatDate(v,'Asia/Bangkok','yyyy-MM-dd') : v;
    }));
  });
  return { updatedAt:new Date().toISOString(), sheets, headers };
}
