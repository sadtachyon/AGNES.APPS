const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

class LocalProjects {
  constructor(storePath, openPath) {
    this.storePath = storePath;
    this.openPath = openPath;
    this.entries = new Map();
  }
  async load() {
    try {
      const rows = JSON.parse(await fs.readFile(this.storePath, "utf8"));
      if (!Array.isArray(rows))
        throw new Error("Invalid local project registry");
      for (const row of rows)
        if (
          row &&
          typeof row.token === "string" &&
          typeof row.path === "string" &&
          path.isAbsolute(row.path) &&
          ["file", "folder"].includes(row.kind)
        )
          this.entries.set(row.token, row);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  async remember(selectedPath, kind) {
    if (!["file", "folder"].includes(kind) || !path.isAbsolute(selectedPath))
      throw new Error("Invalid selection");
    const resolved = await fs.realpath(selectedPath);
    const stats = await fs.stat(resolved);
    if (kind === "folder" ? !stats.isDirectory() : !stats.isFile())
      throw new Error("Selection type mismatch");
    const existing = [...this.entries.values()].find(
      (row) => row.path === resolved && row.kind === kind,
    );
    const item = {
      token: existing?.token || randomUUID(),
      path: resolved,
      name: path.basename(resolved) || resolved,
      kind,
      modified: stats.mtime.toISOString(),
    };
    const next = new Map(this.entries);
    next.set(item.token, item);
    await fs.mkdir(path.dirname(this.storePath), { recursive: true });
    const temp = this.storePath + ".tmp";
    await fs.writeFile(temp, JSON.stringify([...next.values()]), "utf8");
    await fs.rename(temp, this.storePath);
    this.entries = next;
    return item;
  }
  async open(token) {
    const item = typeof token === "string" ? this.entries.get(token) : null;
    if (!item)
      return {
        ok: false,
        error: "Selecione este arquivo ou pasta novamente em Editar projeto.",
      };
    try {
      const stats = await fs.stat(item.path);
      if (item.kind === "folder" ? !stats.isDirectory() : !stats.isFile())
        throw new Error("Type changed");
      const error = await this.openPath(item.path);
      return error
        ? {
            ok: false,
            error:
              "O Windows não conseguiu abrir este item. Verifique o programa padrão.",
          }
        : { ok: true };
    } catch {
      return {
        ok: false,
        error:
          "Arquivo ou pasta não encontrado. Ele pode ter sido movido; selecione-o novamente em Editar projeto.",
      };
    }
  }
}
module.exports = { LocalProjects };
