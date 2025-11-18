import { describe, test, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";

// vytvorenie mocku pre fs modul
vi.mock("fs", () => {
    const existsSync = vi.fn();

    return {
        __esModule: true,
        default: { existsSync },
        existsSync,
    };
});
// vytvorenie mocku pre fs-extra modul
vi.mock("fs-extra", () => {
    const readJsonSync = vi.fn();

    return {
        __esModule: true,
        default: { readJsonSync },
        readJsonSync,
    };
});


// testy pre ConfigManager
describe("ConfigManager cez public API", () => {
    const ORIGINAL_ENV = process.env;

    // resetovanie modulu a ENV premennych pred kazdym testom
    beforeEach(() => {
        vi.resetModules();
        process.env = { ...ORIGINAL_ENV };
    });
    
    // test pre správne načítanie konfiguracie z ENV premennych
    test("loads config from ENV", async () => {
        process.env.LOGCHIMP_SECRET_KEY = "secret";
        process.env.LOGCHIMP_API_HOST = "localhost";
        process.env.LOGCHIMP_SERVER_PORT = "3000";
        process.env.LOGCHIMP_VALKEY_URL = "redis://test";

        const mod = await import("../../src/utils/logchimpConfig");
        const config = mod.configManager.getConfig();

        expect(config.secretKey).toBe("secret");
        expect(config.serverHost).toBe("localhost");
        expect(config.serverPort).toBe(3000);
        expect(config.cacheUrl).toBe("redis://test");
    });

    // test pre hasConfigFile metódu keď súbor neexistuje
    test("returns false when config file is missing -> false", async () => {
        const fsModule = await import("fs"); 
        const existsSyncMock = (fsModule as any).existsSync as Mock; 
        existsSyncMock.mockReturnValue(false);
        const mod = await import("../../src/utils/logchimpConfig");
        expect(mod.configManager.hasConfigFile()).toBe(false); 
    });

    // test pre hasConfigFile metódu keď súbor existuje
    test("returns true when config file exists", async () => {
        const fsModule = await import("fs");
        const existsSyncMock = (fsModule as any).existsSync as Mock;
        existsSyncMock.mockReturnValue(true);
        const mod = await import("../../src/utils/logchimpConfig");
        expect(mod.configManager.hasConfigFile()).toBe(true);
    });

    // test pre načítanie konfigurácie zo súboru keď ENV nie sú nastavené
    test("loads config from file", async () => {
        const fsModule = await import("fs");
        // @ts-expect-error fs-extra je mock
        const fsExtraModule = await import("fs-extra");

        const existsSyncMock = (fsModule as any).existsSync as Mock;
        const readJsonMock = (fsExtraModule as any).readJsonSync as Mock;

        // simulujeme ze config subor existuje
        existsSyncMock.mockReturnValue(true);

        // realny tvar logchimp.config.json
        readJsonMock.mockReturnValue({
            server: {
                host: "from-file",
                port: 3001,
            },
            cache: {
                url: "redis://file",
            },
        });

        const mod = await import("../../src/utils/logchimpConfig");
        const config = mod.configManager.getConfig();

        expect(config.serverHost).toBe("from-file");
        expect(config.serverPort).toBe(3001);
        expect(config.cacheUrl).toBe("redis://file");
    });

    // test pre prioritu načítania konfigurácie (súbor pred ENV)
    test("file config overrides ENV values", async () => {
        const fsModule = await import("fs");
        // @ts-expect-error fs-extra je mock
        const fsExtraModule = await import("fs-extra");

        const existsSyncMock = (fsModule as any).existsSync as Mock;
        const readJsonMock = (fsExtraModule as any).readJsonSync as Mock;

        // simulujeme existenciu config suboru
        existsSyncMock.mockReturnValue(true);

        // obsah konfiguracneho suboru (realny tvar logchimp.config.json)
        readJsonMock.mockReturnValue({
            server: {
                host: "from-file",
            },
            cache: {
                url: "redis://file",
            }
        });

        // ENV nastavuje rovnaky kluc, ale implementacia preferuje subor
        process.env.LOGCHIMP_VALKEY_URL = "redis://env";

        const mod = await import("../../src/utils/logchimpConfig");
        const config = mod.configManager.getConfig();

        // zo suboru, ENV to neprepise
        expect(config.serverHost).toBe("from-file");

        // ENV ma nizsiu prioritu, takze ocekavame hodnotu zo suboru
        expect(config.cacheUrl).toBe("redis://file");
    });

    // test pre reload metódu a načítanie novej konfigurácie po zmene ENV premenných
    test("reload refreshes configuration", async () => {
        const fsModule = await import("fs");
        // @ts-expect-error fs-extra je mock
        const fsExtraModule = await import("fs-extra");

        const existsSyncMock = (fsModule as any).existsSync as Mock;
        const readJsonMock = (fsExtraModule as any).readJsonSync as Mock;

        // simulujeme ze config subor NEEXISTUJE → berieme len ENV
        existsSyncMock.mockReturnValue(false);

        // 1. krok — ENV ma hodnotu "first"
        process.env.LOGCHIMP_VALKEY_URL = "redis://first";

        // načítanie modulu (prvé getConfig)
        const mod = await import("../../src/utils/logchimpConfig");

        const firstConfig = mod.configManager.getConfig();
        expect(firstConfig.cacheUrl).toBe("redis://first");

        // 2. krok — zmeníme ENV na "second"
        process.env.LOGCHIMP_VALKEY_URL = "redis://second";

        // reload by mal prečítať nové ENV
        mod.configManager.reload();

        const secondConfig = mod.configManager.getConfig();
        expect(secondConfig.cacheUrl).toBe("redis://second");
    });

    // test pre správne prevedenie LOGCHIMP_DB_SSL na boolean databaseSsl
    test("parses DB_SSL as boolean", async () => {
        const fsModule = await import("fs");
        // @ts-expect-error fs-extra je mock
        const fsExtraModule = await import("fs-extra");

        const existsSyncMock = (fsModule as any).existsSync as Mock;
        const readJsonMock = (fsExtraModule as any).readJsonSync as Mock;

        existsSyncMock.mockReturnValue(false);
        readJsonMock.mockReset?.();

        // nastavime ENV pre SSL
        process.env.LOGCHIMP_DB_SSL = "true";

        const mod = await import("../../src/utils/logchimpConfig");
        const config = mod.configManager.getConfig();

        expect(config.databaseSsl).toBe(true);
    });

});
