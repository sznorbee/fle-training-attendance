import { JWT } from "google-auth-library";
import type { Grid } from "./layout";
import type { CellValue } from "./marks";

const API = "https://sheets.googleapis.com/v4/spreadsheets";

export type CellUpdate = { sheet: string; cell: string; value: CellValue };

export type SheetsClient = {
  /** Header rows and the roster columns (A–E) of a worksheet, as a grid. */
  readTable(sheet: string): Promise<Grid>;
  writeCells(updates: CellUpdate[]): Promise<void>;
};

const quoteSheet = (name: string) => `'${name.replaceAll("'", "''")}'`;

/** Returns `null` when the Google Sheets sync is not configured. */
export function createSheetsClient(): SheetsClient | null {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replaceAll("\\n", "\n");
  if (!spreadsheetId || !email || !key) return null;

  const auth = new JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  const base = `${API}/${encodeURIComponent(spreadsheetId)}`;

  return {
    async readTable(sheet) {
      const params = new URLSearchParams({ valueRenderOption: "UNFORMATTED_VALUE" });
      params.append("ranges", `${quoteSheet(sheet)}!1:2`);
      params.append("ranges", `${quoteSheet(sheet)}!A:E`);
      const { data } = await auth.request<{ valueRanges: Array<{ values?: Grid }> }>({
        url: `${base}/values:batchGet?${params}`,
      });
      const [header, roster] = data.valueRanges.map((range) => range.values ?? []);
      return [header[0] ?? [], header[1] ?? [], ...roster.slice(2)];
    },

    async writeCells(updates) {
      if (updates.length === 0) return;
      await auth.request({
        url: `${base}/values:batchUpdate`,
        method: "POST",
        data: {
          valueInputOption: "RAW",
          data: updates.map(({ sheet, cell, value }) => ({
            range: `${quoteSheet(sheet)}!${cell}`,
            values: [[value]],
          })),
        },
      });
    },
  };
}
