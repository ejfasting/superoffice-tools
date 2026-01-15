import * as vscode from "vscode";
import { versionStr, max } from "./data";
import { randomInt } from "node:crypto";

export function activate(_: vscode.ExtensionContext) {
  console.log("test: activate called");
  vscode.commands.registerCommand("dummy.helloWorldTs", () => {
    const temp = `[${randomInt(max)}] Hello World to ${versionStr}! I am here! ddd`;
    vscode.window.showInformationMessage(temp);
  });
}
