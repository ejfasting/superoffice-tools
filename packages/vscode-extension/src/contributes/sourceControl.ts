import { ExtensionContext, workspace } from "vscode";
import { ScmTextDocumentContentProvider } from "../providers/scmTextDocumentContentProvider";
import { ScmService } from "../services/scmService";
import { IFileSystemHandler } from "../handlers/fileSystemHandler";

export const ORIGINAL_SCHEME = "superoffice-original";

export async function registerSourceControl(
  context: ExtensionContext,
  fileSystemHandler: IFileSystemHandler,
): Promise<ScmService> {
  const scmTextDocumentContentProvider = new ScmTextDocumentContentProvider();

  context.subscriptions.push(
    workspace.registerTextDocumentContentProvider(ORIGINAL_SCHEME, scmTextDocumentContentProvider),
  );

  const scmService = new ScmService(fileSystemHandler, scmTextDocumentContentProvider);
  context.subscriptions.push(scmService);
  await scmService.initialize();

  return scmService;
}
