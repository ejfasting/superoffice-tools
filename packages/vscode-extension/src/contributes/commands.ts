import { authentication, commands, window } from "vscode";
import { versionStr, max } from "../data";
import { randomInt } from "node:crypto";
import { packagePublisher } from "../extension";
import { SuperOfficeAuthenticationSession } from "./authenticationProvider.types";
import { ArchiveListItem } from "@superoffice/webapi";
import { HttpService } from "../services/httpService";
import { Node } from "./scriptTreeDataProvider";
import { ScriptService } from "../services/scriptService";

export enum Commands {
  ShowGreeting = "ejfasting.showGreeting",
  Authenticate = "ejfasting.authenticate",
  ViewScriptDetails = "ejfasting.script.viewDetails",
  DownloadScript = "ejfasting.script.download",
  DownloadScriptFolder = "ejfasting.script.downloadFolder",
}

export async function registerCommands(httpService: HttpService, scriptService: ScriptService) {
  commands.registerCommand(Commands.ShowGreeting, () => {
    const temp = `[${randomInt(max)}] Hello World to ${versionStr}! I am here! ddd`;
    window.showInformationMessage(temp);
  });

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
}
