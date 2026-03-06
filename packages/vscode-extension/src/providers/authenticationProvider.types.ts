import { AuthenticationSession } from "vscode";

export interface SuperOfficeAuthenticationSession extends AuthenticationSession {
  contextIdentifier: string;
  refreshToken?: string;
  webApiUri: string;
  claims: UserClaims;
  expiresAt?: number;
}

export interface UserClaims {
  "http://schemes.superoffice.net/identity/ctx": string;
  "http://schemes.superoffice.net/identity/netserver_url": string;
  "http://schemes.superoffice.net/identity/webapi_url": string;
  iss: string;
}
