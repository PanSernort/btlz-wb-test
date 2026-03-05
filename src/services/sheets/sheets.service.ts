import { existsSync, readFileSync } from "fs";
import { google } from "googleapis";
import knex from "#postgres/knex.js";
import { getTariffsByDate, type TariffBoxRow } from "#services/tariffs/tariffs.service.js";
import { getMoscowDate } from "#utils/date.js";
import env from "#config/env/env.js";

const SHEET_NAME = "stocks_coefs";

const HEADERS = ["Склад", "Регион", "Коэф. доставки", "Доставка (база)", "Доставка (литр)", "Коэф. хранения", "Хранение (база)", "Хранение (литр)", "Дата тарифа", "Тариф действует до"];

let cachedCredentials: Record<string, unknown> | null = null;

function getCredentials(): Record<string, unknown> {
    if (cachedCredentials !== null) return cachedCredentials;

    if (!existsSync(env.GOOGLE_CREDENTIALS_PATH)) {
        throw new Error(`Google credentials file not found: ${env.GOOGLE_CREDENTIALS_PATH}`);
    }

    cachedCredentials = JSON.parse(readFileSync(env.GOOGLE_CREDENTIALS_PATH, "utf-8")) as Record<string, unknown>;
    return cachedCredentials;
}

function getAuth() {
    return new google.auth.GoogleAuth({
        credentials: getCredentials(),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
}

function toDateString(val: Date | null): string {
    if (!val) return "";
    return new Date(val).toISOString().split("T")[0];
}

function formatRows(tariffs: TariffBoxRow[]): string[][] {
    return tariffs.map((t) => [
        t.warehouse_name,
        t.geo_name,
        t.box_delivery_coef_expr,
        String(t.box_delivery_base),
        String(t.box_delivery_liter),
        t.box_storage_coef_expr,
        String(t.box_storage_base),
        String(t.box_storage_liter),
        toDateString(t.date),
        toDateString(t.dt_till_max),
    ]);
}

async function ensureSheet(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string): Promise<void> {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = spreadsheet.data.sheets?.some((s) => s.properties?.title === SHEET_NAME);

    if (!exists) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
            },
        });
    }
}

export async function syncTariffsToSheets(): Promise<void> {
    const [spreadsheets, tariffs] = await Promise.all([knex<{ spreadsheet_id: string }>("spreadsheets").select("spreadsheet_id"), getTariffsByDate(getMoscowDate())]);

    if (spreadsheets.length === 0) return;

    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const values = [HEADERS, ...formatRows(tariffs)];

    await Promise.all(
        spreadsheets.map(async ({ spreadsheet_id }) => {
            await ensureSheet(sheets, spreadsheet_id);
            await sheets.spreadsheets.values.clear({
                spreadsheetId: spreadsheet_id,
                range: SHEET_NAME,
            });
            await sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheet_id,
                range: `${SHEET_NAME}!A1`,
                valueInputOption: "RAW",
                requestBody: { values },
            });
        }),
    );
}
