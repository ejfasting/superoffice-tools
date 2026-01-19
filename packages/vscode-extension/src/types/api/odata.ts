export interface ODataResponse<T> {
  value: T[];
  "odata.context"?: string;
  "odata.metadataEtag"?: string;
  "odata.nextLink"?: string;
}
