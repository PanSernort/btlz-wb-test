/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
    return knex.schema.createTable("tariffs_box", (table) => {
        table.increments("id").primary();
        table.date("date").notNullable();
        table.string("warehouse_name").notNullable();
        table.string("geo_name").notNullable().defaultTo("");
        table.decimal("box_delivery_base", 10, 2).notNullable();
        table.decimal("box_delivery_liter", 10, 2).notNullable();
        table.string("box_delivery_coef_expr").notNullable();
        table.decimal("box_storage_base", 10, 4).notNullable();
        table.decimal("box_storage_liter", 10, 4).notNullable();
        table.string("box_storage_coef_expr").notNullable();
        table.date("dt_next_box").nullable();
        table.date("dt_till_max").nullable();
        table.timestamp("created_at").defaultTo(knex.fn.now());
        table.timestamp("updated_at").defaultTo(knex.fn.now());
        table.unique(["date", "warehouse_name"]);
    });
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
    return knex.schema.dropTable("tariffs_box");
}
