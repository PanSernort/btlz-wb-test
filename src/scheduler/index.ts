import { fetchBoxTariffs } from "#services/wb/wb.service.js";
import { upsertTariffs } from "#services/tariffs/tariffs.service.js";
import { syncTariffsToSheets } from "#services/sheets/sheets.service.js";
import { getMoscowDate } from "#utils/date.js";
import logger from "#utils/logger.js";

const HOUR_MS = 60 * 60 * 1000;

async function collectTariffs(): Promise<void> {
    const date = getMoscowDate();
    const { response } = await fetchBoxTariffs(date);
    await upsertTariffs(date, response.data);
    logger.info(`[wb] Stored ${response.data.warehouseList.length} warehouses for ${date}`);
}

async function syncSheets(): Promise<void> {
    await syncTariffsToSheets();
    logger.info("[sheets] Tariffs synced to Google Sheets");
}

async function runJob(): Promise<void> {
    try {
        await collectTariffs();
    } catch (err) {
        logger.error("[wb] Failed to collect tariffs:", err);
    }

    try {
        await syncSheets();
    } catch (err) {
        logger.error("[sheets] Failed to sync:", err);
    }
}

export function startScheduler(): () => void {
    logger.info("[scheduler] Starting — running initial job");
    void runJob();
    const id = setInterval(() => void runJob(), HOUR_MS);
    logger.info("[scheduler] Scheduled hourly job");
    return () => clearInterval(id);
}
