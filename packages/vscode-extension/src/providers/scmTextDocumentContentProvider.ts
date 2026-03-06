import { CancellationToken, EventEmitter, TextDocumentContentProvider, Uri } from "vscode";
import { ORIGINAL_SCHEME } from "../contributes/sourceControl";

/**
 * Provides stored "original" (server) content for downloaded scripts.
 * Registered under the `superoffice-original://` URI scheme so that VS Code
 * can diff the server version against the locally edited file.
 */
export class ScmTextDocumentContentProvider implements TextDocumentContentProvider {
  private readonly _onDidChange = new EventEmitter<Uri>();
  readonly onDidChange = this._onDidChange.event;

  /** Maps stringified URI path → original source code from the server. */
  private readonly _contents = new Map<string, string>();

  /**
   * Stores the original server content for a given local file URI.
   * The local URI is converted to the virtual `superoffice-original://` scheme.
   */
  public store(localUri: Uri, originalContent: string): void {
    const key = this.toKey(localUri);
    this._contents.set(key, originalContent);
    this._onDidChange.fire(this.toOriginalUri(localUri));
  }

  /**
   * Removes the stored original for a given local file URI.
   */
  public remove(localUri: Uri): void {
    this._contents.delete(this.toKey(localUri));
  }

  /**
   * Returns the virtual `superoffice-original://` URI for a local file URI.
   */
  public toOriginalUri(localUri: Uri): Uri {
    return localUri.with({ scheme: ORIGINAL_SCHEME });
  }

  /**
   * Returns all local URIs that currently have stored originals.
   */
  public getTrackedUris(): Uri[] {
    return Array.from(this._contents.keys()).map((key) => Uri.parse(key));
  }

  /**
   * Returns the stored original content for a given local file URI, or undefined if not tracked.
   */
  public getOriginalContent(localUri: Uri): string | undefined {
    return this._contents.get(this.toKey(localUri));
  }

  /** Called by VS Code when content for a `superoffice-original://` URI is needed. */
  public provideTextDocumentContent(uri: Uri, _token: CancellationToken): string {
    // Strip the scheme back to the local path key
    const localUri = uri.with({ scheme: "file" });
    return this._contents.get(this.toKey(localUri)) ?? "";
  }

  public dispose(): void {
    this._onDidChange.dispose();
  }

  private toKey(localUri: Uri): string {
    // Normalise to file:// URI string so paths are consistent across platforms
    return localUri.with({ scheme: "file" }).toString();
  }
}
