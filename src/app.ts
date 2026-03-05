import knex, { migrate, seed } from "#postgres/knex.js";
import { startScheduler } from "#scheduler/index.js";
import logger from "#utils/logger.js";

try {
    await migrate.latest();
    await seed.run();
    logger.info("DB ready");
} catch (err) {
    logger.error("Startup failed:", err);
    await knex.destroy();
    process.exit(1);
}

const stop = startScheduler();

const shutdown = async () => {
    stop();
    await knex.destroy();
    process.exit(0);
};

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
