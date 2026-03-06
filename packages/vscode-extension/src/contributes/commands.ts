import { authentication, commands, window, SourceControlResourceState } from "vscode";
import { packagePublisher } from "../extension";
import { SuperOfficeAuthenticationSession } from "../providers/authenticationProvider.types";
import { ArchiveListItem } from "@superoffice/webapi";
import { HttpService } from "../services/httpService";
import { Node } from "../providers/scriptTreeDataProvider";
import { ScriptService } from "../services/scriptService";
import { IScmService } from "../services/scmService";

export enum Commands {
  Authenticate = "ejfasting.authenticate",
  ViewScriptDetails = "ejfasting.script.viewDetails",
  DownloadScript = "ejfasting.script.download",
  DownloadScriptFolder = "ejfasting.script.downloadFolder",
  DiscardChanges = "ejfasting.scm.discardChanges",
  OpenFile = "ejfasting.scm.openFile",
}

export async function registerCommands(
  httpService: HttpService,
  scriptService: ScriptService,
  scriptSourceControlService: IScmService,
) {
  commands.registerCommand(Commands.Authenticate, async () => {
    const session = (await authentication.getSession(`${packagePublisher.toLowerCase()}`, [], {
      createIfNone: true,
    })) as SuperOfficeAuthenticationSession;
    window.showInformationMessage(`Authenticated as ${session?.account.label}`);
  });

  commands.registerCommand(Commands.ViewScriptDetails, async (params: ArchiveListItem) => {
    await scriptService.viewScriptDetails(params);
  });

  commands.registerCommand(Commands.DownloadScript, async (params: Node) => {
    await scriptService.downloadScript(params);
  });

  commands.registerCommand(Commands.DownloadScriptFolder, async (params: Node) => {
    const results = await scriptService.downloadFolderRecursive(params);
    window.showInformationMessage(
      `Downloaded ${results.downloadedCount} scripts with total size ${results.totalSize}. ${results.errors.length} errors occurred.`,
    );
  });

  commands.registerCommand(
    Commands.DiscardChanges,
    async (resource: SourceControlResourceState) => {
      const filename = resource.resourceUri.path.split("/").pop() ?? resource.resourceUri.path;
      const confirmed = await window.showWarningMessage(
        `Discard changes to ${filename}? This will restore the version last downloaded from SuperOffice (might not be latest!).`,
        { modal: true },
        "Discard",
      );

      if (confirmed !== "Discard") {
        return;
      }

      await scriptSourceControlService.discardChanges(resource.resourceUri);
    },
  );

  commands.registerCommand(Commands.OpenFile, async (resource: SourceControlResourceState) => {
    await scriptSourceControlService.openFile(resource.resourceUri);
  });
}
