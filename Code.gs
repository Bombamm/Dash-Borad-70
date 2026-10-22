const SOURCE_ID = '1_mZfQJLd0nvw9twm3vDVl954JvdMwBXyULrqGypUbok';
function doGet() { return HtmlService.createHtmlOutputFromFile('Dashboard').setTitle('Dashboard งานเช่าและจ้างเหมาบริการ'); }
function getDashboardData() {
  const book = SpreadsheetApp.openById(SOURCE_ID), sheets = {};
  ['บ๋อมแบ๋ม','ส้ม','ดรีม','นุ้ย','หนุ่ม'].forEach(name => {
    const sheet = book.getSheetByName(name);
    if (!sheet) throw new Error('ไม่พบชีต ' + name);
    if (sheet.getLastRow() < 5) { sheets[name] = []; return; }
    const range = sheet.getRange(5,1,sheet.getLastRow()-4,17), values = range.getValues(), formulas = range.getFormulas();
    sheets[name] = values.map((row,i) => row.map((v,j) => {
      if (j===16 && /TODAY\(\)/i.test(formulas[i][j])) return '';
      return v instanceof Date ? Utilities.formatDate(v,'Asia/Bangkok','yyyy-MM-dd') : v;
    }));
  });
  return { updatedAt:new Date().toISOString(), sheets };
}
