export interface WbTariffBoxWarehouse {
    boxDeliveryBase: string;
    boxDeliveryCoefExpr: string;
    boxDeliveryLiter: string;
    boxDeliveryMarketplaceBase: string;
    boxDeliveryMarketplaceCoefExpr: string;
    boxDeliveryMarketplaceLiter: string;
    boxStorageBase: string;
    boxStorageCoefExpr: string;
    boxStorageLiter: string;
    geoName: string;
    warehouseName: string;
}

export interface WbTariffBoxData {
    dtNextBox: string;
    dtTillMax: string;
    warehouseList: WbTariffBoxWarehouse[];
}

export interface WbTariffBoxResponse {
    response: {
        data: WbTariffBoxData;
    };
}
