import { describe, expect, it } from "vitest";
import { createEmptyData } from "./data";
import { BACKUP_VERSION, createBackup, validateBackup } from "./backup";

describe("backup do OrbiCore", () => {
  it("cria e valida um backup completo", () => {
    const data = createEmptyData();
    const backup = createBackup(data, "2026-08-07T12:00:00.000Z");
    const result = validateBackup(backup);

    expect(backup.version).toBe(BACKUP_VERSION);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.backup.counts.contracts).toBe(0);
  });

  it("continua aceitando backups antigos da versão 1", () => {
    const result = validateBackup({
      format: "orbicore-backup",
      version: 1,
      exportedAt: "2026-01-01T00:00:00.000Z",
      data: createEmptyData(),
    });

    expect(result.ok).toBe(true);
  });

  it("rejeita arquivo estranho ou incompleto", () => {
    expect(validateBackup({ format: "outro", version: 1 }).ok).toBe(false);
    expect(validateBackup({
      format: "orbicore-backup",
      version: 2,
      exportedAt: "2026-01-01T00:00:00.000Z",
      data: { profile: {} },
    }).ok).toBe(false);
  });
});
