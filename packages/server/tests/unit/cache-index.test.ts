import { vi, describe, test, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";

// Mock kniznice iovalkey
vi.mock("iovalkey", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
    })),
  };
});

// Mock konfiguracie
vi.mock("../../src/utils/logchimpConfig", () => ({
  configManager: {
    getConfig: vi.fn(),
  },
}));

describe("valkey module", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("isActive is false -> valkey is null", async () => {
    const { configManager } = await import("../../src/utils/logchimpConfig");

    const getConfigMock = configManager.getConfig as unknown as Mock;
    getConfigMock.mockReturnValue({ cacheUrl: "" });

    const mod = await import("../../src/cache");
    expect(mod.isActive).toBe(false);
    expect(mod.valkey).toBeNull();
  });

  test("isActive is true -> makes Valkey instance", async () => {
    const { configManager } = await import("../../src/utils/logchimpConfig");

    const getConfigMock = configManager.getConfig as unknown as Mock;
    getConfigMock.mockReturnValue({ cacheUrl: "redis://test" });

    const ValkeyMock = (await import("iovalkey")).default;
    const mod = await import("../../src/cache");

    expect(mod.isActive).toBe(true);
    expect(ValkeyMock).toHaveBeenCalledWith("redis://test");
    expect(mod.valkey).not.toBeNull();
  });
});
