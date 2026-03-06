import { createHash } from "crypto";
import {
  Disposable,
  FileSystemWatcher,
  scm,
  SourceControl,
  SourceControlResourceGroup,
  SourceControlResourceState,
  Uri,
  window,
  workspace,
} from "vscode";
import { IFileSystemHandler } from "../handlers/fileSystemHandler";
import { ScmTextDocumentContentProvider } from "../providers/scmTextDocumentContentProvider";

export interface IScmService {
  initialize(): Promise<void>;
  trackScript(localUri: Uri, originalContent: string): Promise<void>;
  discardChanges(localUri: Uri): Promise<void>;
  openFile(localUri: Uri): Promise<void>;
  dispose(): void;
}

/**
 * Registers a custom Source Control provider for SuperOffice scripts.
 * Surfaces locally modified scripts in VS Code's Source Control panel (SCM view).
 * Clicking a changed file opens a diff between the local version and the server
 * version captured at download time.
 *
 * Persistence mirrors Git's object store:
 *   .superoffice/objects/<sha1>  — deduplicated content blobs
 *   .superoffice/index.json      — maps workspace-relative path → sha1
 */
export class ScmService implements IScmService {
  private readonly _sourceControl: SourceControl;
  private readonly _changesGroup: SourceControlResourceGroup;
  private readonly _watcher: FileSystemWatcher;
  private readonly _disposables: Disposable[] = [];
  private readonly _workspaceRoot: Uri;
  private _debounceTimer: ReturnType<typeof setTimeout> | undefined;

  /** URI of the index file that maps workspace-relative paths to SHA1 hashes. */
  private get _indexUri(): Uri {
    return this._workspaceRoot.with({
      path: `${this._workspaceRoot.path}/.superoffice/index.json`,
    });
  }

  /** URI of a content object identified by its SHA1 hash. */
  private _objectUri(sha1: string): Uri {
    return this._workspaceRoot.with({
      path: `${this._workspaceRoot.path}/.superoffice/objects/${sha1}`,
    });
  }

  constructor(
    private readonly fileSystemHandler: IFileSystemHandler,
    private readonly scmTextDocumentContentProvider: ScmTextDocumentContentProvider,
  ) {
    const workspaceRoot = workspace.workspaceFolders?.[0]?.uri;

    if (!workspaceRoot) {
      throw new Error("No workspace folder is open.");
    }

    this._workspaceRoot = workspaceRoot;

    this._sourceControl = scm.createSourceControl(
      "superoffice",
      "SuperOffice Scripts",
      workspaceRoot,
    );

    this._changesGroup = this._sourceControl.createResourceGroup("changes", "Changes");
    this._changesGroup.hideWhenEmpty = true;

    // Watch for changes to script files in the workspace
    this._watcher = workspace.createFileSystemWatcher("**/*.{tsfso,crmscript}");
    this._disposables.push(
      this._watcher.onDidChange(() => this._scheduleRefresh()),
      this._watcher.onDidCreate(() => this._scheduleRefresh()),
      this._watcher.onDidDelete(() => this._scheduleRefresh()),
      this._watcher,
    );
  }

  /**
   * Restores tracked originals from disk on extension activation.
   * Reads index.json to find all tracked paths, resolves the SHA1 object for each,
   * and repopulates the in-memory OriginalContentProvider map.
   */
  public async initialize(): Promise<void> {
    const index = await this._readIndex();
    const entries = Object.entries(index);

    if (entries.length === 0) {
      return;
    }

    for (const [relativePath, sha1] of entries) {
      const content = await this.fileSystemHandler.readFile(this._objectUri(sha1));
      if (content !== undefined) {
        const localUri = this._workspaceRoot.with({
          path: `${this._workspaceRoot.path}${relativePath}`,
        });
        this.scmTextDocumentContentProvider.store(localUri, content);
      }
    }

    await this._refresh();
  }

  /**
   * Stores the server-side original for a script both in memory and on disk.
   *
   * On disk this writes two things (mirroring Git):
   *   1. A content-addressable object file at .superoffice/objects/<sha1>
   *      (skipped if an identical object already exists — free deduplication).
   *   2. An updated .superoffice/index.json entry mapping the file's
   *      workspace-relative path to its SHA1 hash.
   *
   * Called immediately after a script is downloaded and written to disk.
   */
  public async trackScript(localUri: Uri, originalContent: string): Promise<void> {
    this.scmTextDocumentContentProvider.store(localUri, originalContent);
    await this._persistOriginal(localUri, originalContent);
    await this._refresh();
  }

  /**
   * Overwrites the local file with the original server content captured at download
   * time, discarding any local edits — analogous to `git checkout -- <file>`.
   */
  public async discardChanges(localUri: Uri): Promise<void> {
    const original = this.scmTextDocumentContentProvider.getOriginalContent(localUri);
    if (original === undefined) {
      return;
    }
    await this.fileSystemHandler.writeFile(localUri, original);
    await this._refresh();
  }

  /**
   * Opens a local file in the editor.
   */
  public async openFile(localUri: Uri): Promise<void> {
    const document = await workspace.openTextDocument(localUri);
    await window.showTextDocument(document);
  }

  /**
   * Cleans up resources when the extension is deactivated.
   */
  public dispose(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    this._sourceControl.dispose();
    this._changesGroup.dispose();
    this._disposables.forEach((d) => d.dispose());
    this.scmTextDocumentContentProvider.dispose();
  }

  private _scheduleRefresh(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = setTimeout(() => void this._refresh(), 300);
  }

  /** Computes the SHA1 hex digest of the given string content (UTF-8). */
  private _computeSha1(content: string): string {
    return createHash("sha1").update(content, "utf8").digest("hex");
  }

  /** Reads and parses index.json, returning an empty object if it doesn't exist yet. */
  private async _readIndex(): Promise<Record<string, string>> {
    const raw = await this.fileSystemHandler.readFile(this._indexUri);
    if (!raw) {
      return {};
    }
    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      return {};
    }
  }

  /** Persists the updated index to .superoffice/index.json. */
  private async _writeIndex(index: Record<string, string>): Promise<void> {
    const dirUri = this._indexUri.with({
      path: this._indexUri.path.replace(/\/[^/]+$/, ""),
    });
    await workspace.fs.createDirectory(dirUri);
    await this.fileSystemHandler.writeFile(this._indexUri, JSON.stringify(index, null, 2));
  }

  /**
   * Persists a script's original content using a Git-style content-addressable store.
   * The object file is only written when the SHA1 is not yet present (deduplication).
   */
  private async _persistOriginal(localUri: Uri, content: string): Promise<void> {
    const sha1 = this._computeSha1(content);
    const objectUri = this._objectUri(sha1);

    if (!(await this.fileSystemHandler.exists(objectUri))) {
      const objectsDir = objectUri.with({ path: objectUri.path.replace(/\/[^/]+$/, "") });
      await workspace.fs.createDirectory(objectsDir);
      await this.fileSystemHandler.writeFile(objectUri, content);
    }

    const relativePath = localUri.path.slice(this._workspaceRoot.path.length);
    const index = await this._readIndex();
    index[relativePath] = sha1;
    await this._writeIndex(index);
  }

  private async _refresh(): Promise<void> {
    const trackedUris = this.scmTextDocumentContentProvider.getTrackedUris();
    const resourceStates: SourceControlResourceState[] = [];

    for (const localUri of trackedUris) {
      const originalContent = this.scmTextDocumentContentProvider.getOriginalContent(localUri);
      const localContent = await this.fileSystemHandler.readFile(localUri);

      // Only surface the file if its local content differs from the server original
      if (localContent === undefined || localContent === originalContent) {
        continue;
      }

      const originalUri = this.scmTextDocumentContentProvider.toOriginalUri(localUri);

      resourceStates.push({
        resourceUri: localUri,
        command: {
          title: "Show Changes",
          command: "vscode.diff",
          arguments: [originalUri, localUri, `${this._getFilename(localUri)} (SuperOffice)`],
        },
        decorations: {
          strikeThrough: false,
          tooltip: "Modified locally",
        },
      });
    }

    this._changesGroup.resourceStates = resourceStates;
    this._sourceControl.count = resourceStates.length;
  }

  private _getFilename(uri: Uri): string {
    return uri.path.split("/").pop() ?? uri.path;
  }
}
