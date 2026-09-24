import { describe, expect, it } from "vitest";
import { UriUtils } from "langium";
import type { LangiumSharedServices } from "langium/lsp";
import { FileChangeType } from "vscode-languageserver";
import {
  INCLUDE_MAPPING_PATH,
  WorkspaceIncludeHost,
} from "../../src/includes/workspace-include-host.js";
import {
  createMemoryWorkspace,
  MEMORY_WORKSPACE_ROOT as ROOT,
} from "../helpers/memory-workspace.js";

async function createHost(files: Record<string, string> = {}) {
  const { shared, store } = await createMemoryWorkspace(files);
  return { host: new WorkspaceIncludeHost(shared as LangiumSharedServices), store, shared };
}

function mappingFile(entries: Record<string, string>): Record<string, string> {
  return { [UriUtils.joinPath(ROOT, INCLUDE_MAPPING_PATH).toString()]: JSON.stringify(entries) };
}

describe("WorkspaceIncludeHost", () => {
  it("resolves a name from the mapping and reads the mapped file's content", async () => {
    const libUri = UriUtils.joinPath(ROOT, "scripts/lib.crmscript");
    const { host } = await createHost({
      ...mappingFile({ lib: "scripts/lib.crmscript" }),
      [libUri.toString()]: "Company c; c.load(2);",
    });
    await host.whenReady();

    const location = host.resolveIncludeName("lib");
    expect(location).toBe(libUri.toString());
    await expect(host.readContent(location!)).resolves.toBe("Company c; c.load(2);");
  });

  it("resolves multiple independent entries", async () => {
    const { host } = await createHost({
      ...mappingFile({ a: "a.crmscript", b: "nested/b.tsfso" }),
      [UriUtils.joinPath(ROOT, "a.crmscript").toString()]: "A",
      [UriUtils.joinPath(ROOT, "nested/b.tsfso").toString()]: "B",
    });
    await host.whenReady();

    await expect(host.readContent(host.resolveIncludeName("a")!)).resolves.toBe("A");
    await expect(host.readContent(host.resolveIncludeName("b")!)).resolves.toBe("B");
  });

  it("returns undefined for a name that is not in the mapping", async () => {
    const { host } = await createHost(mappingFile({ lib: "scripts/lib.crmscript" }));
    await host.whenReady();

    expect(host.resolveIncludeName("missing")).toBeUndefined();
  });

  it("treats a missing mapping file as an empty mapping", async () => {
    const { host } = await createHost();
    await host.whenReady();

    expect(host.resolveIncludeName("lib")).toBeUndefined();
  });

  it("treats invalid JSON in the mapping file as an empty mapping", async () => {
    const { host } = await createHost({
      [UriUtils.joinPath(ROOT, INCLUDE_MAPPING_PATH).toString()]: "not json",
    });
    await host.whenReady();

    expect(host.resolveIncludeName("lib")).toBeUndefined();
  });

  it("loads the mapping only once across repeated calls", async () => {
    const { host, store } = await createHost(mappingFile({ lib: "scripts/lib.crmscript" }));

    await host.whenReady();
    store.set(UriUtils.joinPath(ROOT, INCLUDE_MAPPING_PATH).toString(), JSON.stringify({}));
    await host.whenReady();

    expect(host.resolveIncludeName("lib")).toBe(
      UriUtils.joinPath(ROOT, "scripts/lib.crmscript").toString(),
    );
  });

  it("reloads the mapping when the mapping file changes on disk", async () => {
    const { host, store, shared } = await createHost(mappingFile({ lib: "scripts/lib.crmscript" }));
    await host.whenReady();
    expect(host.resolveIncludeName("lib")).toBeDefined();

    store.set(UriUtils.joinPath(ROOT, INCLUDE_MAPPING_PATH).toString(), JSON.stringify({}));
    shared.lsp.DocumentUpdateHandler.didChangeWatchedFiles?.({
      changes: [
        {
          uri: UriUtils.joinPath(ROOT, INCLUDE_MAPPING_PATH).toString(),
          type: FileChangeType.Changed,
        },
      ],
    });
    await host.whenReady();

    expect(host.resolveIncludeName("lib")).toBeUndefined();
  });

  it("ignores changes to files other than the mapping file", async () => {
    const { host, store, shared } = await createHost(mappingFile({ lib: "scripts/lib.crmscript" }));
    await host.whenReady();
    const before = host.resolveIncludeName("lib");

    store.set(UriUtils.joinPath(ROOT, INCLUDE_MAPPING_PATH).toString(), JSON.stringify({}));
    shared.lsp.DocumentUpdateHandler.didChangeWatchedFiles?.({
      changes: [
        {
          uri: UriUtils.joinPath(ROOT, "unrelated.crmscript").toString(),
          type: FileChangeType.Changed,
        },
      ],
    });

    // The cache was not invalidated, so it still reflects the mapping at load time.
    expect(host.resolveIncludeName("lib")).toBe(before);
  });
});
