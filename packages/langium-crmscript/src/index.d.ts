import type { EmptyFileSystem, LangiumSharedServices } from "langium";
import type { NodeFileSystemProvider } from "langium/node";
import type { Connection } from "vscode-languageserver";

export declare const builtins: string;

export declare function createCrmscriptServices(context: {
  connection?: Connection;
} & (EmptyFileSystem | NodeFileSystemProvider)): Promise<{
  shared: LangiumSharedServices;
}>;
