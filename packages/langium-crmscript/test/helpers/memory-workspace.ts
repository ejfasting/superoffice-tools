import {
  EmptyFileSystemProvider,
  URI,
  type FileSystemProvider,
  type WorkspaceFolder,
} from "langium";
import type { LangiumSharedServices } from "langium/lsp";
import { createCrmscriptServices } from "../../src/crmscript-module.js";

export const MEMORY_WORKSPACE_ROOT = URI.parse("memory:///workspace");

/**
 * Builds a full set of Crmscript services backed by an in-memory file system, with a workspace
 * already initialized at {@link MEMORY_WORKSPACE_ROOT}. `files` is keyed by absolute URI string;
 * the returned `store` is the live backing map and can be mutated to change what the workspace's
 * files "on disk" contain.
 */
export async function createMemoryWorkspace(
  files: Record<string, string> = {},
): Promise<{ shared: LangiumSharedServices; store: Map<string, string> }> {
  const store = new Map(Object.entries(files));
  const empty = new EmptyFileSystemProvider();
  const fileSystemProvider: FileSystemProvider = {
    stat: (uri) => empty.stat(uri),
    statSync: (uri) => empty.statSync(uri),
    exists: (uri) => Promise.resolve(store.has(uri.toString())),
    existsSync: (uri) => store.has(uri.toString()),
    readBinary: () => empty.readBinary(),
    readBinarySync: () => empty.readBinarySync(),
    readDirectory: () => empty.readDirectory(),
    readDirectorySync: () => empty.readDirectorySync(),
    readFile: (uri) => {
      const content = store.get(uri.toString());
      return content === undefined
        ? Promise.reject(new Error(`Not found: ${uri.toString()}`))
        : Promise.resolve(content);
    },
    readFileSync: (uri) => {
      const content = store.get(uri.toString());
      if (content === undefined) throw new Error(`Not found: ${uri.toString()}`);
      return content;
    },
  };

  const { shared } = await createCrmscriptServices({
    fileSystemProvider: () => fileSystemProvider,
  });
  const folder: WorkspaceFolder = { name: "workspace", uri: MEMORY_WORKSPACE_ROOT.toString() };
  // `initialize` records the workspace folders (read by the `workspaceFolders` getter);
  // `initializeWorkspace` performs the startup scan and resolves `ready`. A real LSP client
  // triggers both in sequence via the `initialize` request and `initialized` notification.
  shared.workspace.WorkspaceManager.initialize({
    processId: null,
    rootUri: null,
    capabilities: {},
    workspaceFolders: [folder],
  });
  await shared.workspace.WorkspaceManager.initializeWorkspace([folder]);
  return { shared, store };
}
