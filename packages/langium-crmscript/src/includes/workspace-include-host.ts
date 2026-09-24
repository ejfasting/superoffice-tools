import { URI, UriUtils } from "langium";
import type { LangiumSharedServices } from "langium/lsp";
import type { IncludeHost } from "@ejfasting/script-core/includes";

/**
 * Workspace-relative path to the JSON file mapping include names to the workspace-relative
 * path of the file that defines them, e.g. `{ "lib": "#Scripts/javascripts/lib.tsfso" }`.
 */
export const INCLUDE_MAPPING_PATH = ".superoffice/include-mapping.json";

/**
 * Resolves `#include` directives against {@link INCLUDE_MAPPING_PATH} in the workspace root.
 * The mapping is loaded once (synchronously, since `resolveIncludeName` is synchronous) and
 * cached; edits to the file are picked up through Langium's workspace file watcher, which
 * watches every file in the workspace. Reading an include's own content, which can be much
 * larger and live on a network drive, stays asynchronous so it never blocks the language
 * server's event loop.
 *
 * `services` is only read lazily (at first use, not in the constructor): `WorkspaceManager`
 * depends on `LangiumDocuments`, which depends on `LangiumDocumentFactory`, which constructs
 * this host, so reading `services.workspace.WorkspaceManager` here eagerly would be a cyclic
 * dependency. For the same reason, resolving the workspace root never awaits
 * `WorkspaceManager.ready` (see {@link getWorkspaceRoot}).
 */
export class WorkspaceIncludeHost implements IncludeHost {
  private mapping: Map<string, URI> | undefined;
  private watching = false;

  constructor(private readonly services: LangiumSharedServices) {}

  resolveIncludeName(name: string): string | undefined {
    this.mapping ??= this.loadMapping();
    return this.mapping.get(name)?.toString();
  }

  readContent(location: string): Promise<string> {
    return this.services.workspace.FileSystemProvider.readFile(URI.parse(location));
  }

  private loadMapping(): Map<string, URI> {
    this.watchForMappingChanges();
    const mapping = new Map<string, URI>();
    const root = this.getWorkspaceRoot();
    if (root) {
      try {
        const raw = this.services.workspace.FileSystemProvider.readFileSync(
          UriUtils.joinPath(root, INCLUDE_MAPPING_PATH),
        );
        const entries = JSON.parse(raw) as Record<string, string>;
        for (const [name, relativePath] of Object.entries(entries)) {
          mapping.set(name, UriUtils.joinPath(root, relativePath));
        }
      } catch {
        // No mapping file yet, or it isn't valid JSON: treat as an empty mapping.
      }
    }
    return mapping;
  }

  private watchForMappingChanges(): void {
    if (this.watching) return;
    this.watching = true;
    this.services.lsp.DocumentUpdateHandler.onWatchedFilesChange((params) => {
      if (params.changes.some((change) => change.uri.endsWith(INCLUDE_MAPPING_PATH))) {
        this.mapping = undefined;
      }
    });
  }

  private getWorkspaceRoot(): URI | undefined {
    // `workspaceFolders` is populated by `WorkspaceManager.initialize`, which always runs
    // before the initial workspace scan (`initializeWorkspace`, tracked by `ready`) starts, so
    // this is available well before any document is parsed.
    const folder = this.services.workspace.WorkspaceManager.workspaceFolders?.[0];
    return folder ? URI.parse(folder.uri) : undefined;
  }
}
