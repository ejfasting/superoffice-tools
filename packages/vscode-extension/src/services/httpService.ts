import { ArchiveListItem, CRMScriptEntity } from "@superoffice/webapi";
import { webApi } from "../extension";

export interface IHttpService {
  fetchAllScriptData(): Promise<ArchiveListItem[]>;
  getScriptEntity(scriptId: number): Promise<CRMScriptEntity>;
  getExtraTables(): Promise<ArchiveListItem[]>;
}

export class HttpService implements IHttpService {
  /**
   * Fetches a list of all scripts from the SuperOffice Web API. This method retrieves basic information about each script, such as its ID, name, and path, which can be used to display a list of scripts in the UI or to perform further operations like viewing details or downloading the script content.
   */
  public async fetchAllScriptData(): Promise<ArchiveListItem[]> {
    const archiveAgent = webApi!.getArchiveAgent();
    const archiveInfo = await archiveAgent.getArchiveListByColumns2Async({
      providerName: "crmscripts",
      columns: "PrimaryKey,ejscriptId,includeId,name,path",
      entities: "ejscript",
      sortOrder: "",
      restrictions: "ejscriptid > 0",
      pageSize: 60,
      page: 1,
    });

    return archiveInfo;
  }

  /**
   * Fetches the full script entity for a given script ID using the SuperOffice Web API. This includes all details and content of the script, allowing for operations such as viewing or downloading the script in its entirety.
   */
  public async getScriptEntity(scriptId: number): Promise<CRMScriptEntity> {
    const scriptAgent = webApi!.getCRMScriptAgent();
    const scriptEntity = await scriptAgent.getCRMScriptEntityAsync(scriptId);

    return scriptEntity;
  }

  public async getExtraTables(): Promise<ArchiveListItem[]> {
    const archiveAgent = webApi!.getArchiveAgent();
    const archiveInfo = await archiveAgent.getArchiveListByColumns2Async({
      providerName: "dynamic",
      columns:
        "extra_tables.id,extra_tables.table_name,extra_tables.(extra_fields->extra_table).field_name,extra_tables.(extra_fields->extra_table).type,extra_tables.(extra_fields->extra_table).description",
      entities: "extra_tables",
      sortOrder: "",
      restrictions: "extra_tables.id > 0",
      pageSize: 100,
      page: 1,
    });

    return archiveInfo;
  }
}
