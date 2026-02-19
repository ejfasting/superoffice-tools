import {
  authentication,
  AuthenticationProvider,
  AuthenticationProviderAuthenticationSessionsChangeEvent,
  AuthenticationSession,
  commands,
  Disposable,
  EventEmitter,
  ExtensionContext,
  window,
} from "vscode";
import { SuoFile } from "../types/suoFile";
import { IFileSystemService } from "../services/fileSystemService";
import { IAuthenticationService } from "../services/authenticationService";

import { v4 as uuid } from "uuid";
import { Token } from "../services/authenticationService.types";

interface SuperOfficeAuthenticationSession extends AuthenticationSession {
  contextIdentifier: string;
  refreshToken?: string;
  webApiUri: string;
  claims: UserClaims;
  expiresAt?: number;
}

interface UserClaims {
  "http://schemes.superoffice.net/identity/ctx": string;
  "http://schemes.superoffice.net/identity/netserver_url": string;
  "http://schemes.superoffice.net/identity/webapi_url": string;
  iss: string;
}

export class SuperOfficeAuthenticationProvider implements AuthenticationProvider, Disposable {
  private currentSession: SuperOfficeAuthenticationSession | undefined;
  private _disposable: Disposable;
  private _onDidChangeSessions =
    new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();

  constructor(
    private context: ExtensionContext,
    private fileSystemService: IFileSystemService,
    private authenticationService: IAuthenticationService,
    private packagePublisher: string,
  ) {
    this._disposable = Disposable.from(
      authentication.registerAuthenticationProvider(
        this.packagePublisher.toLowerCase(),
        this.packagePublisher + ".sessions",
        this,
        {
          supportsMultipleAccounts: false,
        },
      ),
    );
  }

  get onDidChangeSessions() {
    return this._onDidChangeSessions.event;
  }

  /**
   * Check if the session is expired based on the expiresAt property
   * @param session the authentication session to check
   * @returns true if the session is expired, false otherwise
   */
  private isSessionExpired(session: SuperOfficeAuthenticationSession): boolean {
    return session.expiresAt! < Date.now();
  }

  /**
   * Find a session by its context identifier
   * @returns the found session or null if not found
   */
  private async retrieveSessionData(): Promise<SuperOfficeAuthenticationSession[] | null> {
    const sessionData = await this.context.secrets.get(
      `${this.packagePublisher.toLowerCase()}.sessions`,
    );
    return sessionData ? JSON.parse(sessionData) : null;
  }

  /**
   * Read .suo-file from the local workspace to get the context identifier for the session
   * @returns the .suo-file or undefined if not found
   */
  private async retrieveSuoFile(): Promise<SuoFile | undefined> {
    return await this.fileSystemService.readSuoFile();
  }

  /**
   * Find a session by its context identifier
   * @param sessions the list of sessions to search
   * @param contextIdentifier the context identifier to match
   * @returns the found session or undefined if not found
   */
  private findSessionByIdentifier(
    sessions: SuperOfficeAuthenticationSession[],
    contextIdentifier: string,
  ): SuperOfficeAuthenticationSession | undefined {
    return sessions.find((obj) => obj.contextIdentifier === contextIdentifier);
  }
  /**
   * Get the existing sessions
   * @param scopes
   * @returns
   */
  async getSessions(_scopes?: string[]): Promise<AuthenticationSession[]> {
    try {
      if (this.currentSession && !this.isSessionExpired(this.currentSession)) {
        return [this.currentSession];
      }

      const suoFile = await this.retrieveSuoFile();
      if (!suoFile) return [];

      const sessions = await this.retrieveSessionData();
      if (!sessions) return [];

      const session = this.findSessionByIdentifier(sessions, suoFile.contextIdentifier);
      if (!session || this.isSessionExpired(session)) {
        if (session) await this.removeSession(session.id);
        return [];
      }

      await this.setSession(session);
      return [session];
    } catch (error) {
      console.error("Failed to retrieve or parse sessions:", error);
      return [];
    }
  }

  /**
   * Create a new auth session
   * @param scopes
   * @returns
   */
  async createSession(_scopes: string[]): Promise<SuperOfficeAuthenticationSession> {
    const environment = await this.selectEnvironment();

    const tokenInformation = (await this.authenticationService.login(environment)) as Token;
    const userClaims = this.authenticationService.getClaimsFromToken(
      tokenInformation.id_token,
    ) as UserClaims;

    const session = this.createSessionObject(userClaims, tokenInformation);

    await this.storeSessionData(session);
    this.setSession(session);

    return session;
  }

  private async storeSessionData(session: SuperOfficeAuthenticationSession): Promise<void> {
    await this.context.secrets.store(
      `${this.packagePublisher.toLowerCase()}.sessions`,
      JSON.stringify([session]),
    );
    await this.fileSystemService.writeSuoFile(
      JSON.stringify({ contextIdentifier: session.contextIdentifier }),
    );
  }

  /**
   * Remove an existing session
   * @param sessionId
   */
  async removeSession(_sessionId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  /**
   * Set the current session and fire the onDidChangeSessions event
   * @param session the session to set as current
   */
  async setSession(session: SuperOfficeAuthenticationSession): Promise<void> {
    this.currentSession = session;
    this._onDidChangeSessions.fire({ added: [session], removed: [], changed: [] });
    await this.updateContextKey(true);
  }

  /**
   * Update the context key to control the visibility of UI elements based on authentication state
   * @param isAuthenticated whether the user is authenticated
   */
  private async updateContextKey(isAuthenticated: boolean): Promise<void> {
    await commands.executeCommand("setContext", "superoffice.isAuthenticated", isAuthenticated);
  }

  /**
   * Prompt the user to select an environment
   * @returns the selected environment
   */
  private async selectEnvironment(): Promise<string> {
    const environment = await window.showQuickPick(["sod", "online"], {
      placeHolder: "Select an environment",
      canPickMany: false,
    });

    if (!environment) {
      throw new Error("Environment selection was canceled by the user.");
    }

    return environment;
  }

  private createSessionObject(
    claims: UserClaims,
    tokenInformation: Token,
  ): SuperOfficeAuthenticationSession {
    return {
      id: uuid(),
      contextIdentifier: claims["http://schemes.superoffice.net/identity/ctx"],
      accessToken: tokenInformation.access_token!,
      refreshToken: tokenInformation.refresh_token,
      webApiUri: claims["http://schemes.superoffice.net/identity/webapi_url"],
      expiresAt: Date.now() + 3600 * 1000,
      claims: claims,
      account: {
        label: claims["http://schemes.superoffice.net/identity/ctx"],
        id: claims["http://schemes.superoffice.net/identity/ctx"],
      },
      scopes: [],
    };
  }

  /**
   * Dispose the registered services
   */
  public async dispose() {
    this._disposable.dispose();
  }
}
