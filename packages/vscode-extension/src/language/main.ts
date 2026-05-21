import { startLanguageServer } from "langium/lsp";
import { NodeFileSystem } from "langium/node";
import { createConnection, ProposedFeatures } from "vscode-languageserver/node";
import { createCrmscriptServices } from "crmscript-language";

async function main() {
  // Create a connection to the client
  const connection = createConnection(ProposedFeatures.all);

  // Inject the shared services and language-specific services
  const { shared } = await createCrmscriptServices({ connection, ...NodeFileSystem });

  // Start the language server with the shared services
  startLanguageServer(shared);
}

main()
  .catch((error) => {
    console.error("Unexpected error in main:", error);
  })
  .finally(() => {
    console.log("Language server process exiting.");
  });
