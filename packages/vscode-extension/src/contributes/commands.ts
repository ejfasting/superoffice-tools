import { authentication, commands, window } from "vscode";
import { versionStr, max } from "../data";
import { randomInt } from "node:crypto";
import { packagePublisher } from "../extension";

export enum Commands {
  ShowGreeting = "ejfasting.showGreeting",
  Authenticate = "ejfasting.authenticate",
}

export async function registerCommands() {
  commands.registerCommand(Commands.ShowGreeting, () => {
    const temp = `[${randomInt(max)}] Hello World to ${versionStr}! I am here! ddd`;
    window.showInformationMessage(temp);
  });

  commands.registerCommand(Commands.Authenticate, async () => {
    const session = await authentication.getSession(packagePublisher, [], {
      createIfNone: true,
    });
    console.log(session);
  });
}
