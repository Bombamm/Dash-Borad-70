# Dashboard 70 public summary deployment

Replace the current Apps Script source with `PublicSummary.gs`, save, run `checkSummary`, then create a new web-app deployment version while preserving:

- Execute as: owner
- Access: Anyone
- OAuth scope: `https://www.googleapis.com/auth/spreadsheets.readonly`
- Advanced Google service: Google Sheets API v4

Keep the existing web-app URL. The response schema becomes version 2 and includes aggregate-only contract-issue totals. It does not expose vendors, contract numbers, or record rows.
