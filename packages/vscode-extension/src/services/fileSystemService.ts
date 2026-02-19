import { Uri, workspace, window, FileSystemError } from "vscode";
import { posix } from "path";
import { IFileSystemHandler } from "../handlers/fileSystemHandler";
import { CRMScriptEntity, ScriptType } from "@superoffice/webapi";
import { Node } from "../contributes/scriptTreeDataProvider";

export type SuoFile = {
  contextIdentifier: string;
};

export interface IFileSystemService {
  readSuoFile(): Promise<SuoFile | undefined>;
  writeSuoFile(content: string): Promise<void>;
  writeScriptToFile(content: CRMScriptEntity, node: Node): Promise<Uri>;
  //   readScriptFile(fileUri: Uri): Promise<string | undefined>;
}

export class FileSystemService implements IFileSystemService {
  constructor(private readonly fileSystemHandler: IFileSystemHandler) {}

  get suoFilePath(): string {
    return `./.superoffice/.suo`;
  }

  public async readSuoFile(): Promise<SuoFile | undefined> {
    const fileUri = this.getSuoFileUriInWorkspace();
    try {
      const content = await this.fileSystemHandler.readFile(fileUri);
      return content ? (JSON.parse(content) as SuoFile) : undefined;
    } catch (error) {
      console.log(`Failed to parse file at ${fileUri.fsPath}:`, error);
      return undefined;
    }
  }

  public async writeSuoFile(content: string): Promise<void> {
    const fileUri = this.getSuoFileUriInWorkspace();

    const directoryUri = fileUri.with({
      path: fileUri.path.substring(0, fileUri.path.lastIndexOf("/")),
    });

    await this.ensureDirectoryExists(directoryUri);

    try {
      await this.fileSystemHandler.writeFile(fileUri, content);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      window.showErrorMessage(`Failed to write SUO file: ${errorMessage}`);
    }
  }

  /**
   * Get the full URI for a file located within the current workspace.
   *
   * @param relativePath The relative path to the desired file within the workspace.
   * @returns The full URI pointing to the file in the current workspace.
   * @throws {Error} If there's no workspace currently opened in VSCode.
   */
  private getSuoFileUriInWorkspace(): Uri {
    return this.getFileUriInWorkspace(this.suoFilePath);
  }

  public async writeScriptToFile(crmscriptEntity: CRMScriptEntity, node: Node): Promise<Uri> {
    try {
      const fileType = this.getFileType(crmscriptEntity);

      if (!node.archiveListItem?.columnData || !crmscriptEntity.includeId || !fileType) {
        throw new Error("Missing required properties: archiveListItem, includeId, or fileType");
      }

      const filePath = this.joinPaths(
        node.archiveListItem.columnData["path"].displayValue as string,
        crmscriptEntity.includeId + fileType,
      );
      const fileUri = this.getFileUriInWorkspace(filePath);
      const dirUri = fileUri.with({ path: fileUri.path.replace(/\/[^/]+$/, "") });

      await this.ensureDirectoryExists(dirUri);

      await this.fileSystemHandler.writeFile(fileUri, crmscriptEntity.sourceCode ?? "");
      return fileUri;
    } catch (error) {
      if (error instanceof FileSystemError) {
        throw new Error(
          `Failed to write file: ${crmscriptEntity.includeId}. Reason: ${error.message}`,
        );
      }
      throw new Error(`An unexpected error occurred while writing to file`);
    }
  }

  private joinPaths(...paths: string[]): string {
    return paths
      .filter((p) => p)
      .join("/")
      .replace(/\/+/g, "/");
  }

  private getFileType(scriptEntity: CRMScriptEntity): string | undefined {
    if (scriptEntity.scriptType === ScriptType.CRMScript) {
      return ".crmscript";
    } else if (scriptEntity.scriptType === ScriptType.JavaScript) {
      return ".tsfso";
    }
    return undefined;
  }
  /**
   * Ensures that the directory for the given URI exists. If it does not exist, it will be created.
   *
   * @param uri The URI of the directory to check or create.
   * @throws {Error} If a file exists at the given URI or if directory creation fails.
   */
  private async ensureDirectoryExists(uri: Uri): Promise<void> {
    const directoryExists = await this.fileSystemHandler.exists(uri);
    if (!directoryExists) {
      await workspace.fs.createDirectory(uri);
    }
  }

  /**
   * Get the full URI for a file located within the current workspace.
   *
   * @param relativePath The relative path to the desired file within the workspace.
   * @returns The full URI pointing to the file in the current workspace.
   * @throws {Error} If there's no workspace currently opened in VSCode.
   */
  private getFileUriInWorkspace(relativePath: string): Uri {
    const workspaceFolder = workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
      throw new Error("No workspace is currently open.");
    }

    return workspaceFolder.uri.with({
      path: posix.join(workspaceFolder.uri.path, relativePath),
    });
  }
}
