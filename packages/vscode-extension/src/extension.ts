import { ExtensionContext } from "vscode";
import { registerCommands } from "./contributes/commands.js";
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
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node.js";
import * as path from "node:path";
import { DslLibraryFileSystemProvider } from "./providers/dslLibraryFileSystemProvider.js";

export let packagePublisher: string = "";
export let webApi: WebApi | null = null;
let client: LanguageClient;

export async function activate(context: ExtensionContext) {
  packagePublisher = getPackagePublisher(context);

  const { fileSystemService, authenticationService, httpService, scriptService, scmService } =
    await setupServices(context);

  const authProvider = registerAuthenticationProvider(
    context,
    fileSystemService,
    authenticationService,
  );

  await registerCommands(scriptService, scmService);
  const { scriptTreeDataProvider, extraTablesTreeDataProvider } = registerViews(
    context,
    authProvider,
    httpService,
  );

  DslLibraryFileSystemProvider.register(context);
  client = await startLanguageClient(context);

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
 * This function is called when the extension is deactivated.
 * It stops the language client if it exists, allowing for graceful shutdown of the language server and cleanup of resources.
 */
export function deactivate(): Thenable<void> | undefined {
  if (client) {
    return client.stop();
  }
  return undefined;
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

/**
 * Starts language client and server
 */
async function startLanguageClient(context: ExtensionContext): Promise<LanguageClient> {
  const serverModule = context.asAbsolutePath(path.join("out", "language", "main.cjs"));
  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
  // By setting `process.env.DEBUG_BREAK` to a truthy value, the language server will wait until a debugger is attached.
  const debugOptions = {
    execArgv: [
      "--nolazy",
      `--inspect${process.env.DEBUG_BREAK ? "-brk" : ""}=${process.env.DEBUG_SOCKET || "6009"}`,
    ],
  };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: "crmscript" },
      { scheme: "file", language: "crmscript-definition" },
    ],
  };

  // Create the language client and start the client.
  const client = new LanguageClient("crmscript", "CrmScript", serverOptions, clientOptions);

  // Start the client. This will also launch the server
  await client.start();
  return client;
}
