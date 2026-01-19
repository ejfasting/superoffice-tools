import { ODataResponse } from "../../../types/api/odata";
import { mockScript, mockScripts } from "./script";
import { Script } from "../../../types/api/script";

export const odataScriptsResponse: ODataResponse<Script> = {
  "odata.context": "https://example.com/odata/$metadata#Entities",
  "odata.metadataEtag": 'W/"123456789"',
  "odata.nextLink": "https://example.com/odata/Entities?$skip=10",
  value: mockScripts,
};

export const odataScriptResponse: ODataResponse<Script> = {
  "odata.context": "https://example.com/odata/$metadata#Entities",
  "odata.metadataEtag": 'W/"123456789"',
  "odata.nextLink": "https://example.com/odata/Entities?$skip=10",
  value: [mockScript],
};
