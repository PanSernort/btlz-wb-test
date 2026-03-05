/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function seed(knex) {
    const raw = process.env.SPREADSHEET_IDS ?? "";
    const ids = raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

    if (ids.length === 0) return;

    await knex("spreadsheets")
        .insert(ids.map((id) => ({ spreadsheet_id: id })))
        .onConflict(["spreadsheet_id"])
        .ignore();
}
