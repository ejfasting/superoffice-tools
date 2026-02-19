import { ArchiveListItem } from "@superoffice/webapi";

import { TextDocument, Uri, window, workspace, WorkspaceEdit, Position } from "vscode";
import { IFileSystemService } from "./fileSystemService";
import { Node } from "../contributes/scriptTreeDataProvider";
import { IHttpService } from "./httpService";

export interface IScriptService {
  viewScriptDetails(params: ArchiveListItem): Promise<void>;
  downloadScript(params: Node): Promise<void>;
  downloadFolderRecursive(
    node: Node,
  ): Promise<{ downloadedCount: number; totalSize: number; errors: string[] }>;
}

const openedScripts = new Map<string, TextDocument>();

export class ScriptService implements IScriptService {
  constructor(
    private readonly httpService: IHttpService,
    private readonly fileSystemService: IFileSystemService,
  ) {}

  /**
   * View script details by opening a new text document with the script's JSON data. Caches opened documents to avoid duplicates.
   */
  public async viewScriptDetails(params: ArchiveListItem): Promise<void> {
    if (!params || !params.primaryKey) {
      window.showErrorMessage("No script data provided.");
      return;
    }

    const doc = openedScripts.get(params.primaryKey.toString());

    if (doc) {
      await window.showTextDocument(doc);
    } else {
      const jsonString = JSON.stringify(params, null, 2);

      const uri = Uri.parse(`untitled:Script_${params.primaryKey}.json`);
      const document = await workspace.openTextDocument(uri);
      const edit = new WorkspaceEdit();
      edit.insert(uri, new Position(0, 0), jsonString);
      await workspace.applyEdit(edit);
      await window.showTextDocument(document);

      openedScripts.set(params.primaryKey.toString(), document);
    }
  }
  /**
   * Download a single script and open it in the editor
   */
  public async downloadScript(params: Node) {
    if (!params || !params.archiveListItem?.primaryKey) {
      window.showErrorMessage("No script data provided.");
      return;
    }
    const scriptEntity = await this.httpService.getScriptEntity(
      params.archiveListItem?.primaryKey ?? 0,
    );
    const filePath = await this.fileSystemService.writeScriptToFile(scriptEntity, params);

    const document = await workspace.openTextDocument(filePath);
    await window.showTextDocument(document);
  }

  /**
   * Recursively download all scripts in a folder
   */
  async downloadFolderRecursive(
    node: Node,
  ): Promise<{ downloadedCount: number; totalSize: number; errors: string[] }> {
    const results = { downloadedCount: 0, totalSize: 0, errors: [] as string[] };

    if (!node || !node.children) {
      window.showErrorMessage("No script data provided.");
      return results;
    }

    for (const childNode of node.children) {
      try {
        if (childNode.contextValue === "folder" && childNode.children) {
          // Recursively process subfolders
          const subResults = await this.downloadFolderRecursive(childNode);
          results.downloadedCount += subResults.downloadedCount;
          results.totalSize += subResults.totalSize;
          results.errors.push(...subResults.errors);
        } else if (childNode.contextValue === "script") {
          if (!childNode.archiveListItem?.columnData?.["ejscriptId"].displayValue) {
            console.log(`superoffice-vscode: Could not find scriptInfo for ${childNode.label}`);
            results.errors.push(`Missing script info for ${childNode.label}`);
            continue;
          }

          await this.downloadScript(childNode);
          results.downloadedCount++;
          console.log(
            `superoffice-vscode: Downloaded script: ${childNode.archiveListItem?.columnData["ejscriptId"].displayValue}`,
          );
        }
      } catch (error) {
        const errorMsg = `Failed to download ${childNode.label}: ${String(error)}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    return results;
  }
}
