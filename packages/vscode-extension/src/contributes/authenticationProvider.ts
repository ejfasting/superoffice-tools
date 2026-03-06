import { ExtensionContext } from "vscode";
import { IFileSystemService } from "../services/fileSystemService";
import { AuthenticationService } from "../services/authenticationService";
import { packagePublisher } from "../extension";
import { SuperOfficeAuthenticationProvider } from "../providers/authenticationProvider";

export function registerAuthenticationProvider(
  context: ExtensionContext,
  fileSystemService: IFileSystemService,
  authenticationService: AuthenticationService,
) {
  const authProvider = new SuperOfficeAuthenticationProvider(
    context,
    fileSystemService,
    authenticationService,
    packagePublisher,
  );
  context.subscriptions.push(authProvider);
  return authProvider;
}
