import knex from "#postgres/knex.js";
import type { WbTariffBoxData } from "#types/wb.js";

export interface TariffBoxRow {
    id: number;
    date: Date;
    warehouse_name: string;
    geo_name: string;
    box_delivery_base: number;
    box_delivery_liter: number;
    box_delivery_coef_expr: string;
    box_storage_base: number;
    box_storage_liter: number;
    box_storage_coef_expr: string;
    dt_next_box: Date | null;
    dt_till_max: Date | null;
    created_at: Date;
    updated_at: Date;
}

function parseRu(val: string): number {
    if (val === "-" || val === "") return 0;
    return parseFloat(val.replace(",", "."));
}

function parseDate(val: string): string | null {
    return val ? val : null;
}

interface TariffBoxInsert {
    date: string;
    warehouse_name: string;
    geo_name: string;
    box_delivery_base: number;
    box_delivery_liter: number;
    box_delivery_coef_expr: string;
    box_storage_base: number;
    box_storage_liter: number;
    box_storage_coef_expr: string;
    dt_next_box: string | null;
    dt_till_max: string | null;
    updated_at: ReturnType<typeof knex.fn.now>;
}

export async function upsertTariffs(date: string, data: WbTariffBoxData): Promise<void> {
    const rows: TariffBoxInsert[] = data.warehouseList.map((wh) => ({
        date,
        warehouse_name: wh.warehouseName,
        geo_name: wh.geoName,
        box_delivery_base: parseRu(wh.boxDeliveryBase),
        box_delivery_liter: parseRu(wh.boxDeliveryLiter),
        box_delivery_coef_expr: wh.boxDeliveryCoefExpr,
        box_storage_base: parseRu(wh.boxStorageBase),
        box_storage_liter: parseRu(wh.boxStorageLiter),
        box_storage_coef_expr: wh.boxStorageCoefExpr,
        dt_next_box: parseDate(data.dtNextBox),
        dt_till_max: parseDate(data.dtTillMax),
        updated_at: knex.fn.now(),
    }));

    await knex("tariffs_box")
        .insert(rows)
        .onConflict(["date", "warehouse_name"])
        .merge(["geo_name", "box_delivery_base", "box_delivery_liter", "box_delivery_coef_expr", "box_storage_base", "box_storage_liter", "box_storage_coef_expr", "dt_next_box", "dt_till_max", "updated_at"]);
}

function parseCoef(val: string): number {
    if (val === "-" || val === "" || val == null) return 0;
    const num = parseFloat(String(val).replace(",", "."));
    return Number.isNaN(num) ? 0 : num;
}

export async function getTariffsByDate(date: string): Promise<TariffBoxRow[]> {
    const rows = await knex<TariffBoxRow>("tariffs_box").where("date", date).select("*");
    return rows.sort((a, b) => parseCoef(a.box_delivery_coef_expr) - parseCoef(b.box_delivery_coef_expr));
}
