import {
  Uri,
  TreeItem,
  TreeItemCollapsibleState,
  ThemeIcon,
  Command,
  TreeDataProvider,
  EventEmitter,
  Event,
  ExtensionContext,
} from "vscode";
import { SuperOfficeAuthenticationProvider } from "./authenticationProvider";
import { IHttpService } from "../services/httpService";
import { ArchiveListItem } from "@superoffice/webapi";
import { Commands } from "./commands";

interface TreeDataItem {
  label: string;
  children: TreeDataItem[];
  archiveListItem?: ArchiveListItem;
}

export class Node implements TreeItem {
  contextValue: string;
  collapsibleState: TreeItemCollapsibleState;
  constructor(
    public readonly label: string,
    public readonly children?: Node[],
    public readonly iconPath?: ThemeIcon | { light: Uri; dark: Uri },
    public readonly command?: Command,
    public readonly archiveListItem?: ArchiveListItem,
  ) {
    this.contextValue = archiveListItem ? "script" : "folder";
    this.collapsibleState =
      (this.children?.length ?? 0) > 0
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None;
  }
}

export class ScriptTreeDataProvider implements TreeDataProvider<Node> {
  private _onDidChangeTreeData: EventEmitter<Node | undefined> = new EventEmitter<
    Node | undefined
  >();
  readonly onDidChangeTreeData: Event<Node | undefined> = this._onDidChangeTreeData.event;

  public iconPath?: ThemeIcon | { light: Uri; dark: Uri };

  constructor(
    context: ExtensionContext,
    private authProvider: SuperOfficeAuthenticationProvider,
    private httpService: IHttpService,
  ) {
    this.iconPath = {
      light: Uri.joinPath(context.extensionUri, "resources", "logo.svg"),
      dark: Uri.joinPath(context.extensionUri, "resources", "logo.svg"),
    };
  }

  get SCRIPT_DETAILS(): string {
    return Commands.ViewScriptDetails;
  }

  // Call this method to trigger a refresh of the tree view
  public refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: Node): TreeItem {
    return element;
  }

  async getChildren(element?: Node): Promise<Node[]> {
    if (element) {
      return element.children || [];
    }
    const currentSession = this.authProvider.getCurrentSession();
    //Check if user is logged in
    if (currentSession) {
      try {
        const archiveListItems: ArchiveListItem[] = await this.httpService.fetchAllScriptData();
        const root: TreeDataItem = { label: "Root", children: [] };
        archiveListItems.forEach((listItem) =>
          this.addToTreeData(root, listItem.columnData?.["path"]?.displayValue ?? "", listItem),
        );
        return root.children.map(this.convertTreeDataToNode);
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

  convertTreeDataToNode = (data: TreeDataItem): Node => {
    return new Node(
      data.label,
      data.children.map(this.convertTreeDataToNode),
      data.archiveListItem ? this.iconPath : new ThemeIcon("folder"),
      data.archiveListItem
        ? {
            command: this.SCRIPT_DETAILS,
            title: "Show Script Info",
            arguments: [data.archiveListItem],
          }
        : undefined,
      data.archiveListItem,
    );
  };

  /**
   * Processes a given script along with its path.
   * The function parses the path, constructs the folder hierarchy
   * if it doesn't exist, and then adds the script at the appropriate
   * node in the tree.
   *
   * @param root - The root node of the tree.
   * @param scriptPath - The path associated with the script.
   * @param script - The script data.
   */
  addToTreeData(root: TreeDataItem, scriptPath: string, archiveListItem: ArchiveListItem): void {
    // Split path by '/' and remove empty segments
    const parts = scriptPath.split("/").filter(Boolean);
    const currentNode = parts.reduce(this.getOrAddChildNode, root);
    currentNode.children.push({
      label: archiveListItem.columnData?.["name"]?.displayValue ?? "Unknown",
      children: [],
      archiveListItem,
    });
  }

  getOrAddChildNode = (parentNode: TreeDataItem, part: string): TreeDataItem => {
    let childNode = parentNode.children.find((node) => node.label === part);
    if (!childNode) {
      childNode = { label: part, children: [] };
      parentNode.children.push(childNode);
    }

    return childNode;
  };
}
