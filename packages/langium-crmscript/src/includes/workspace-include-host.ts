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
 * The mapping is loaded once and cached; edits to the file are picked up through Langium's
 * workspace file watcher, which watches every file in the workspace.
 *
 * `services` is only read lazily (at first use, not in the constructor): `WorkspaceManager`
 * depends on `LangiumDocuments`, which depends on `LangiumDocumentFactory`, which constructs
 * this host, so reading `services.workspace.WorkspaceManager` here eagerly would be a cyclic
 * dependency. For the same reason, resolving the workspace root never awaits
 * `WorkspaceManager.ready` (see {@link getWorkspaceRoot}).
 */
export class WorkspaceIncludeHost implements IncludeHost {
  private mapping: Map<string, URI> | undefined;
  private loading: Promise<void> | undefined;
  private watching = false;

  constructor(private readonly services: LangiumSharedServices) {}

  /**
   * Loads the include mapping if it hasn't been loaded yet, or if it was invalidated by a
   * change to {@link INCLUDE_MAPPING_PATH}. Callers must await this before relying on
   * {@link resolveIncludeName}, which is synchronous.
   */
  whenReady(): Promise<void> {
    this.loading ??= this.load();
    return this.loading;
  }

  resolveIncludeName(name: string): string | undefined {
    return this.mapping?.get(name)?.toString();
  }

  readContent(location: string): Promise<string> {
    return this.services.workspace.FileSystemProvider.readFile(URI.parse(location));
  }

  private async load(): Promise<void> {
    this.watchForMappingChanges();
    const mapping = new Map<string, URI>();
    const root = this.getWorkspaceRoot();
    if (root) {
      try {
        const raw = await this.services.workspace.FileSystemProvider.readFile(
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
    this.mapping = mapping;
  }

  private watchForMappingChanges(): void {
    if (this.watching) return;
    this.watching = true;
    this.services.lsp.DocumentUpdateHandler.onWatchedFilesChange((params) => {
      if (params.changes.some((change) => change.uri.endsWith(INCLUDE_MAPPING_PATH))) {
        this.mapping = undefined;
        this.loading = undefined;
      }
    });
  }

  private getWorkspaceRoot(): URI | undefined {
    // `workspaceFolders` is populated by `WorkspaceManager.initialize`, which always runs
    // before the initial workspace scan (`initializeWorkspace`, tracked by `ready`) starts.
    // Awaiting `ready` here would deadlock: that scan parses the workspace's documents, which
    // wait on `whenReady()` to resolve includes, before `ready` itself can resolve.
    const folder = this.services.workspace.WorkspaceManager.workspaceFolders?.[0];
    return folder ? URI.parse(folder.uri) : undefined;
  }
}
