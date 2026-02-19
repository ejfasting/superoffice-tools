import { env, EventEmitter, ProgressLocation, Uri, UriHandler, window, Disposable } from "vscode";
import { v4 as uuid } from "uuid";
import * as crypto from "crypto";
import { PromiseAdapter, promiseFromEvent } from "../utils";
import { Token, UserClaims } from "./authenticationService.types";

const CLIENT_ID = `1a5764a8090f136cc9d30f381626d5fa`;

export interface IAuthenticationService {
  login(environment: string): Promise<Token>;
  getClaimsFromToken(token: string): UserClaims;
}

class UriEventHandler extends EventEmitter<Uri> implements UriHandler {
  public handleUri(uri: Uri) {
    this.fire(uri);
  }
}

export class AuthenticationService implements IAuthenticationService, Disposable {
  private _pendingStates: string[] = [];
  private _codeVerifiers = new Map<string, string>();
  private _scopes = new Map<string, string[]>();
  private _codeExchangePromises = new Map<
    string,
    { promise: Promise<string>; cancel: EventEmitter<void> }
  >();
  private _uriHandler = new UriEventHandler();
  private _disposable: Disposable;
  private _environment: string = "";

  get redirectUri() {
    return `https://ejfasting.github.io/superoffice-tools/`;
  }

  constructor() {
    this._disposable = Disposable.from(window.registerUriHandler(this._uriHandler));
  }
  /**
   * Dispose the registered services
   */
  public dispose(): void {
    this._disposable.dispose();
  }

  /**
   * Log in to OpenId Connect
   */
  public async login(environment: string): Promise<Token> {
    this._environment = environment;

    return await window.withProgress<Token>(
      {
        location: ProgressLocation.Notification,
        title: "Signing in to SuperOffice...",
        cancellable: true,
      },
      async (_, token) => {
        const nonce: string = uuid() as string;
        const scopes = ["openid"];
        const codeVerifier = this.toBase64UrlEncoding(crypto.randomBytes(32));
        const codeChallenge = this.toBase64UrlEncoding(this.sha256(codeVerifier));
        const callbackUri = await env.asExternalUri(Uri.parse(this.redirectUri));
        const callbackQuery = new URLSearchParams(callbackUri.query);
        const state = callbackQuery.get("state") || nonce;

        this._pendingStates.push(state);
        this._codeVerifiers.set(state, codeVerifier);
        this._scopes.set(state, scopes);

        const searchParams = new URLSearchParams([
          ["response_type", "code"],
          ["client_id", CLIENT_ID],
          ["redirect_uri", this.redirectUri],
          ["state", state],
          ["scope", scopes.join(" ")],
          ["code_challenge_method", "S256"],
          ["code_challenge", codeChallenge],
        ]);

        const uri = Uri.parse(
          `https://${this._environment}.superoffice.com/login/common/oauth/authorize?${searchParams.toString()}`,
        );

        await env.openExternal(uri);

        let codeExchangePromise = this._codeExchangePromises.get(scopes.join(" "));
        if (!codeExchangePromise) {
          codeExchangePromise = promiseFromEvent(this._uriHandler.event, this.handleUri(scopes));
          this._codeExchangePromises.set(scopes.join(" "), codeExchangePromise);
        }

        try {
          return await Promise.race([
            codeExchangePromise.promise,
            new Promise<string>((_, reject) => setTimeout(() => reject("Cancelled"), 60000)),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            promiseFromEvent<any, any>(token.onCancellationRequested, (_, __, reject) => {
              reject("User Cancelled");
            }).promise,
          ]);
        } finally {
          this._pendingStates = this._pendingStates.filter((n) => n !== state);
          codeExchangePromise?.cancel.fire();
          this._codeExchangePromises.delete(scopes.join(" "));
        }
      },
    );
  }

  private toBase64UrlEncoding(buffer: Buffer): string {
    return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  private sha256(buffer: string | Uint8Array): Buffer {
    return crypto.createHash("sha256").update(buffer).digest();
  }

  public getClaimsFromToken(token: string): UserClaims {
    const arrayToken = token.split(".");
    const userClaims = JSON.parse(atob(arrayToken[1])) as UserClaims;
    return userClaims;
  }

  /**
   * Handle the redirect to VS Code (after sign in from Auth0)
   * @param scopes
   * @returns
   */
  private handleUri: (scopes: readonly string[]) => PromiseAdapter<Uri, string> =
    (scopes) => async (uri, resolve, reject) => {
      const query = new URLSearchParams(uri.fragment);
      const code = query.get("code");
      const state = query.get("state");

      if (!code) {
        reject(window.showErrorMessage("No code received"));
        return;
      }
      if (!state) {
        reject(window.showErrorMessage("No state received"));
        return;
      }

      const codeVerifier = this._codeVerifiers.get(state);
      if (!codeVerifier) {
        reject(new Error("No code verifier"));
        return;
      }

      // Check if it is a valid auth request started by the extension
      if (!this._pendingStates.some((n) => n === state)) {
        reject(window.showErrorMessage("State not found"));
        return;
      }

      const body = `client_id=${CLIENT_ID}&code=${code}&grant_type=authorization_code&redirect_uri=${this.redirectUri}&code_verifier=${codeVerifier}`;

      const response = await fetch(
        `https://${this._environment}.superoffice.com/login/common/oauth/tokens`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body,
        },
      );

      resolve(code);
    };
}
