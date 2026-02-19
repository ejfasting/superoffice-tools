import {
  TreeItem,
  TreeItemCollapsibleState,
  ThemeIcon,
  TreeDataProvider,
  EventEmitter,
  Event,
  ExtensionContext,
} from "vscode";
import { SuperOfficeAuthenticationProvider } from "./authenticationProvider";
import { IHttpService } from "../services/httpService";
import { ArchiveListItem } from "@superoffice/webapi";

export class ExtraTablesNode implements TreeItem {
  contextValue: string;
  collapsibleState: TreeItemCollapsibleState;

  constructor(
    public readonly label: string,
    public readonly children?: ExtraTablesNode[],
    public readonly iconPath?: ThemeIcon,
  ) {
    this.contextValue = children && children.length > 0 ? "extraTablesParent" : "extraTablesChild";
    this.collapsibleState =
      children && children.length > 0
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None;
  }
}

export class ExtraTablesTreeDataProvider implements TreeDataProvider<ExtraTablesNode> {
  private _onDidChangeTreeData: EventEmitter<ExtraTablesNode | undefined> = new EventEmitter<
    ExtraTablesNode | undefined
  >();
  readonly onDidChangeTreeData: Event<ExtraTablesNode | undefined> =
    this._onDidChangeTreeData.event;

  constructor(
    _context: ExtensionContext,
    private authProvider: SuperOfficeAuthenticationProvider,
    private httpService: IHttpService,
  ) {}

  // Call this method to trigger a refresh of the tree view
  public refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: ExtraTablesNode): TreeItem {
    return element;
  }

  async getChildren(element?: ExtraTablesNode): Promise<ExtraTablesNode[]> {
    if (element) {
      return element.children || [];
    }

    const currentSession = this.authProvider.getCurrentSession();
    if (currentSession) {
      try {
        const archiveListItems = await this.httpService.getExtraTables();

        // Group archiveListItems by property "extra_tables.table_name"
        const groupedTables = new Map<string, ArchiveListItem[]>();
        archiveListItems.forEach((item) => {
          if (item.columnData && item.columnData["extra_tables.table_name"]) {
            const tableName = item.columnData["extra_tables.table_name"].displayValue as string;
            if (!groupedTables.has(tableName)) {
              groupedTables.set(tableName, []);
            }
            groupedTables.get(tableName)!.push(item);
          }
        });

        const tableNodes: ExtraTablesNode[] = [];
        groupedTables.forEach((tableItems, tableName) => {
          const fieldNodes = tableItems.map((item) => {
            if (!item.columnData) {
              return new ExtraTablesNode("", undefined, new ThemeIcon("symbol-field"));
            }

            const typeNode = new ExtraTablesNode(
              "type: " +
                (item.columnData["extra_tables.(extra_fields->extra_table).type"].displayValue ||
                  ""),
              undefined,
              new ThemeIcon("symbol-property"),
            );

            const descriptionNode = new ExtraTablesNode(
              "description: " +
                (item.columnData["extra_tables.(extra_fields->extra_table).description"]
                  .displayValue || ""),
              undefined,
              new ThemeIcon("symbol-property"),
            );

            return new ExtraTablesNode(
              item.columnData["extra_tables.(extra_fields->extra_table).field_name"].displayValue ||
                "",
              [typeNode, descriptionNode],
              new ThemeIcon("symbol-field"),
            );
          });

          // Create parent node for the table
          const tableNode = new ExtraTablesNode(tableName, fieldNodes, new ThemeIcon("database"));

          tableNodes.push(tableNode);
        });

        return tableNodes;
      } catch (err) {
        if (err instanceof Error) {
          throw new Error(err.message);
        } else {
          throw new Error(String(err));
        }
      }
    }
    return [];
  }
}
