export interface Token {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token: string;
  id_token: string;
}

export interface UserClaims {
  "http://schemes.superoffice.net/identity/ctx": string;
  "http://schemes.superoffice.net/identity/netserver_url": string;
  "http://schemes.superoffice.net/identity/webapi_url": string;
  iss: string;
}
