import * as vscode from "vscode";
import { versionStr, max } from "./data";
import { randomInt } from "node:crypto";
import { Command } from "./constants/commands";

export async function activate(_context: vscode.ExtensionContext) {
  vscode.commands.registerCommand(Command.ShowGreeting, () => {
    const temp = `[${randomInt(max)}] Hello World to ${versionStr}! I am here! ddd`;
    vscode.window.showInformationMessage(temp);
  });
}
