import { authentication, ExtensionContext, window } from "vscode";
import { registerCommands } from "./contributes/commands";
import { SuperOfficeAuthenticationProvider } from "./contributes/authenticationProvider";
import { FileSystemService } from "./services/fileSystemService";
import { FileSystemHandler } from "./handlers/fileSystemHandler";
import { getPackagePublisher } from "./utils";
import { AuthenticationService } from "./services/authenticationService";

export let packagePublisher: string = "";

export async function activate(context: ExtensionContext) {
  packagePublisher = getPackagePublisher(context);
  await registerCommands();
  registerAuthenticationProvider(context);

  const session = await authentication.getSession(packagePublisher, [], { createIfNone: false });
  if (session) {
    window.showInformationMessage(`Welcome back ${session.account.label}`);
  }
}

function registerAuthenticationProvider(context: ExtensionContext) {
  const fileSystemHandler = new FileSystemHandler();
  const fileSystemService = new FileSystemService(fileSystemHandler);
  const authenticationService = new AuthenticationService();
  const authProvider = new SuperOfficeAuthenticationProvider(
    context,
    fileSystemService,
    authenticationService,
    packagePublisher,
  );
  context.subscriptions.push(authProvider);

  authProvider.onDidChangeSessions(() => {
    // treeViewDataProvider.refresh();
    // extraTablesTreeViewDataProvider.refresh();
  });
}
