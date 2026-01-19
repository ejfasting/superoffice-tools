import * as assert from "assert";
import * as vscode from "vscode";
import { HttpHandler } from "../../handlers/httpHandler";
import { MockHttpHandler } from "../mock/mockHttpHandler";
import { ODataResponse } from "../../types/api/odata";
import { Script } from "../../types/api/script";
import { odataScriptsResponse, odataScriptResponse } from "../mock/data/odata";

interface testResponse {
  userId: number;
  id: number;
  title: string;
  body: string;
}

suite("HttpHandler Test Suite", () => {
  let handler: HttpHandler;
  let mockHandler = new MockHttpHandler();

  suiteTeardown(() => {
    vscode.window.showInformationMessage("All tests done!");
  });

  setup(() => {
    handler = new HttpHandler("https://jsonplaceholder.typicode.com");

    mockHandler.setMockResponse("/scripts", {
      ok: true,
      status: 200,
      statusText: "OK",
      data: odataScriptsResponse,
      headers: new Headers(),
    });

    mockHandler.setMockResponse("/script", {
      ok: true,
      status: 200,
      statusText: "OK",
      data: odataScriptResponse,
      headers: new Headers(),
    });
  });

  test("Sample request", async function () {
    this.timeout(10000);
    const response = await handler.get<testResponse>("/posts/1");
    assert.strictEqual(response.data.id, 1);
  });

  test("Mock HTTP handler with multiple scripts data", async function () {
    this.timeout(2000);
    const response = await mockHandler.get<ODataResponse<Script>>("/scripts");

    assert.strictEqual(response.data.value.length, 3);
    assert.strictEqual(response.data.value[0].Name, "ValidationScript");
  });

  test("Mock HTTP handler with one script data", async function () {
    this.timeout(2000);
    const response = await mockHandler.get<ODataResponse<Script>>("/script");

    assert.strictEqual(response.data.value.length, 1);
    assert.strictEqual(response.data.value[0].Name, "TestScript");
  });
});
