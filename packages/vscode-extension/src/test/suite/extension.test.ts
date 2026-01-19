import * as assert from "assert";
import * as vscode from "vscode";
import { Command } from "../../constants/commands";

suite("Extension Test Suite", () => {
  suiteTeardown(() => {
    vscode.window.showInformationMessage("All tests done!");
  });

  test("Sample test", () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });

  test("Extension activated", async function () {
    this.timeout(10000); // Increase timeout
    const extension = vscode.extensions.getExtension("ejfasting.vscode-extension");
    assert.ok(extension, "Extension not found");
    await extension.activate();
    assert.strictEqual(extension.isActive, true, "Extension should be active");
  });

  test("Command registered", async function () {
    const commands = await vscode.commands.getCommands(true);
    const isRegistered = commands.includes(Command.ShowGreeting);
    assert.strictEqual(isRegistered, true, "Command 'ejfasting.showGreeting' should be registered");
  });
});
