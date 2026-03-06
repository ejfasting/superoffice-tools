import { ExtensionContext } from "vscode";
import { registerCommands } from "./contributes/commands";
import { registerAuthenticationProvider } from "./contributes/authenticationProvider";
import { FileSystemService } from "./services/fileSystemService";
import { FileSystemHandler } from "./handlers/fileSystemHandler";
import { getPackagePublisher } from "./utils";
import { AuthenticationService } from "./services/authenticationService";
import { HttpService } from "./services/httpService";
import { registerViews } from "./contributes/views";
import { WebApi } from "@superoffice/webapi";
import { SuperOfficeAuthenticationSession } from "./providers/authenticationProvider.types";
import { ScriptService } from "./services/scriptService";
import { registerSourceControl } from "./contributes/sourceControl";

export let packagePublisher: string = "";
export let webApi: WebApi | null = null;

export async function activate(context: ExtensionContext) {
  packagePublisher = getPackagePublisher(context);

  const { fileSystemService, authenticationService, httpService, scriptService, scmService } =
    await setupServices(context);

  const authProvider = registerAuthenticationProvider(
    context,
    fileSystemService,
    authenticationService,
  );

  await registerCommands(httpService, scriptService, scmService);
  const { scriptTreeDataProvider, extraTablesTreeDataProvider } = registerViews(
    context,
    authProvider,
    httpService,
  );

  /**
   * This is called whenever the authentication session changes. It clears the cached WebApi instance and sets up a new one with the current session. It also refreshes the script and extra tables tree data providers to reflect any changes.
   */
  authProvider.onDidChangeSessions(() => {
    scriptTreeDataProvider.refresh();
    extraTablesTreeDataProvider.refresh();

    webApi = null; // Clear cached WebApi instance on session change
    const currentSession = authProvider.getCurrentSession();
    if (!currentSession) {
      return;
    }
    webApi = setupWebApi(currentSession);
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

/**
 * Initializes the various services used by the extension, such as file system, authentication, HTTP, script management, and source control. This is called during extension activation to set up the necessary infrastructure for the extension's functionality.
 */
async function setupServices(context: ExtensionContext) {
  const fileSystemHandler = new FileSystemHandler();
  const fileSystemService = new FileSystemService(fileSystemHandler);
  const authenticationService = new AuthenticationService();
  const httpService = new HttpService();
  const scmService = await registerSourceControl(context, fileSystemHandler);
  const scriptService = new ScriptService(httpService, fileSystemService, scmService);
  return {
    fileSystemService,
    authenticationService,
    httpService,
    scriptService,
    scmService,
  };
}
