import { ExtensionContext, window } from "vscode";
import { registerCommands } from "./contributes/commands";
import { registerAuthenticationProvider } from "./contributes/authenticationProvider";
import { FileSystemService } from "./services/fileSystemService";
import { FileSystemHandler } from "./handlers/fileSystemHandler";
import { getPackagePublisher } from "./utils";
import { AuthenticationService } from "./services/authenticationService";
import { HttpService } from "./services/httpService";
import { registerViews } from "./contributes/views";
import { WebApi } from "@superoffice/webapi";
import { SuperOfficeAuthenticationSession } from "./contributes/authenticationProvider.types";
import { ScriptService } from "./services/scriptService";

export let packagePublisher: string = "";
export let webApi: WebApi | null = null;

export async function activate(context: ExtensionContext) {
  packagePublisher = getPackagePublisher(context);

  const { fileSystemService, authenticationService, httpService, scriptService } = setupServices();

  const authProvider = registerAuthenticationProvider(
    context,
    fileSystemService,
    authenticationService,
  );

  await registerCommands(httpService, scriptService);
  const { scriptTreeDataProvider, extraTablesTreeDataProvider } = registerViews(
    context,
    authProvider,
    httpService,
  );

  authProvider.onDidChangeSessions(() => {
    webApi = null; // Clear cached WebApi instance on session change
    window.showInformationMessage("Authentication session changed. Refreshing views...");
    webApi = setupWebApi(authProvider.getCurrentSession()!);
    scriptTreeDataProvider.refresh();
    extraTablesTreeDataProvider.refresh();
  });
}

/**
 * Sets up the WebApi instance using the current authentication session. This is called whenever the authentication session changes to ensure we have a valid token for API calls.
 */
function setupWebApi(session: SuperOfficeAuthenticationSession): WebApi {
  const webApi = new WebApi(session.webApiUri);
  webApi.authenticateWithToken(session.accessToken);
  return webApi;
}

function setupServices() {
  const fileSystemHandler = new FileSystemHandler();
  const fileSystemService = new FileSystemService(fileSystemHandler);
  const authenticationService = new AuthenticationService();
  const httpService = new HttpService();
  const scriptService = new ScriptService(httpService, fileSystemService);
  return { fileSystemService, authenticationService, httpService, scriptService };
}
