import { ExtensionContext, window } from "vscode";
import { ScriptTreeDataProvider } from "../providers/scriptTreeDataProvider";
import { SuperOfficeAuthenticationProvider } from "../providers/authenticationProvider";
import { HttpService } from "../services/httpService";
import { ExtraTablesTreeDataProvider } from "../providers/extraTablesTreeDataProvider";

export enum Views {
  ScriptExplorer = "ejfasting.view.scripts",
  ExtraTablesExplorer = "ejfasting.view.extraTables",
}

export function registerViews(
  context: ExtensionContext,
  authProvider: SuperOfficeAuthenticationProvider,
  httpService: HttpService,
) {
  const scriptTreeDataProvider = new ScriptTreeDataProvider(context, authProvider, httpService);
  const scriptViewProvider = window.registerTreeDataProvider(
    Views.ScriptExplorer,
    scriptTreeDataProvider,
  );

  const extraTablesTreeDataProvider = new ExtraTablesTreeDataProvider(
    context,
    authProvider,
    httpService,
  );
  const extraTablesDataProvider = window.registerTreeDataProvider(
    Views.ExtraTablesExplorer,
    extraTablesTreeDataProvider,
  );

  context.subscriptions.push(scriptViewProvider, extraTablesDataProvider);
  return { scriptTreeDataProvider, extraTablesTreeDataProvider };
}
