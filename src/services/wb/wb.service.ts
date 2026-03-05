import https from "https";
import axios from "axios";
import env from "#config/env/env.js";
import type { WbTariffBoxResponse } from "#types/wb.js";

const wbClient = axios.create({
    baseURL: "https://common-api.wildberries.ru",
    timeout: 30000,
    httpsAgent: new https.Agent({ keepAlive: false }),
    headers: {
        Authorization: env.WB_API_TOKEN,
        Connection: "close",
    },
});

export async function fetchBoxTariffs(date: string): Promise<WbTariffBoxResponse> {
    const { data } = await wbClient.get<WbTariffBoxResponse>("/api/v1/tariffs/box", {
        params: { date },
    });
    return data;
}
