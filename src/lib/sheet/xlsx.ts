import ExcelJS from "exceljs";
import type { Grid } from "./layout";

export type Worksheet = { name: string; grid: Grid };

/** Reads every visible worksheet of an .xlsx file into plain value grids. */
export async function readWorkbook(data: ArrayBuffer): Promise<Worksheet[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);

  return workbook.worksheets
    .filter((sheet) => sheet.state === "visible")
    .map((sheet) => {
      const grid: Grid = [];
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const values: unknown[] = [];
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          values[colNumber - 1] = plainValue(cell.value);
        });
        grid[rowNumber - 1] = values;
      });
      return { name: sheet.name.trim(), grid };
    });
}

function plainValue(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || value instanceof Date) return value;
  if ("richText" in value) return value.richText.map((part) => part.text).join("");
  if ("text" in value) return value.text;
  if ("formula" in value || "sharedFormula" in value) return null; // computed cells are not data
  return null;
}
