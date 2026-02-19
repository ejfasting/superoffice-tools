import { Uri, workspace, window } from "vscode";
import { SuoFile } from "../types/suoFile";
import { posix } from "path";
import { IFileSystemHandler } from "../handlers/fileSystemHandler";

export interface IFileSystemService {
  readSuoFile(): Promise<SuoFile | undefined>;
  writeSuoFile(content: string): Promise<void>;
  //   writeScriptToFile(content: ScriptEntity): Promise<Uri>;
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
    const filePath = this.suoFilePath;
    const fileUri = Uri.file(filePath);

    const directoryUri = fileUri.with({
      path: fileUri.path.substring(0, fileUri.path.lastIndexOf("/")),
    });

    await this.ensureDirectoryExists(directoryUri);

    try {
      await this.fileSystemHandler.writeFile(fileUri, content);
    } catch (error) {
      window.showErrorMessage(`Failed to write SUO file: ${error}`);
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
    const workspaceFolder = workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
      throw new Error("No workspace is currently open.");
    }

    return workspaceFolder.uri.with({
      path: posix.join(workspaceFolder.uri.path, this.suoFilePath),
    });

    //return Uri.joinPath(workspaceFolder.uri, relativePath);
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
}
