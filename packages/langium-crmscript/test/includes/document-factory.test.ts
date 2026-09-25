import { beforeAll, describe, expect, it } from "vitest";
import {
  Cancellation,
  CstUtils,
  DocumentState,
  EmptyFileSystem,
  UriUtils,
  isLeafCstNode,
  type LangiumDocument,
} from "langium";
import type { IncludeHost } from "@ejfasting/script-core/includes";
import type { ImplementationModel } from "../../src/generated/ast.js";
import { createCrmscriptServices } from "../../src/crmscript-module.js";
import {
  CrmscriptDocumentFactory,
  getIncludeExpansion,
  getIncludeExpansionError,
} from "../../src/includes/crmscript-document-factory.js";
import { getIncludeOrigin } from "../../src/includes/remap.js";
import { INCLUDE_MAPPING_PATH } from "../../src/includes/workspace-include-host.js";
import {
  createMemoryWorkspace,
  MEMORY_WORKSPACE_ROOT as ROOT,
} from "../helpers/memory-workspace.js";
import { parseImplementation } from "../helpers/test-services.js";

const DIRECTIVE = '#include "lib";';
const DIRECTIVE_RANGE = {
  start: { line: 1, character: 0 },
  end: { line: 1, character: DIRECTIVE.length },
};
const SOURCE = ['String a = "x";', DIRECTIVE, "String b = a;"].join("\n");
const VALID_CONTENT = "Company c; c.load(2);";
const LIB_PATH = "scripts/lib.crmscript";
const LIB_URI = UriUtils.joinPath(ROOT, LIB_PATH).toString();

let documentCounter = 0;

/**
 * Parses `text` against a fresh in-memory workspace whose `#include "lib"` resolves to a real
 * virtual file containing `content`. This exercises the real, production-wired document
 * factory, including `WorkspaceIncludeHost`.
 */
async function parseWithInclude(text: string, content = VALID_CONTENT) {
  const { shared } = await createMemoryWorkspace({
    [UriUtils.joinPath(ROOT, INCLUDE_MAPPING_PATH).toString()]: JSON.stringify({ lib: LIB_PATH }),
    [LIB_URI]: content,
  });
  const uri = UriUtils.joinPath(ROOT, `document-${documentCounter++}.crmscript`);
  return shared.workspace.LangiumDocumentFactory.fromString<ImplementationModel>(
    text,
    uri,
    Cancellation.CancellationToken.None,
  );
}

describe("CrmscriptDocumentFactory", () => {
  it("parses documents without includes exactly as before", async () => {
    const document = await parseImplementation('String a = "x";');

    expect(document.parseResult.parserErrors).toHaveLength(0);
    expect(getIncludeExpansion(document)).toBeUndefined();
    expect(getIncludeExpansionError(document)).toBeUndefined();
  });

  it("substitutes the included content before parsing", async () => {
    const document = await parseWithInclude(SOURCE);
    const model = document.parseResult.value;

    expect(document.parseResult.lexerErrors).toHaveLength(0);
    expect(document.parseResult.parserErrors).toHaveLength(0);
    expect(model.includes).toHaveLength(0);
    // `String a`, `Company c` from the include, `String b`
    expect(model.types.map((t) => t.name)).toEqual(["a", "c", "b"]);
    // `c.load(2);` from the include
    expect(model.statements).toHaveLength(1);
    expect(getIncludeExpansion(document)?.expanded).toBe(SOURCE.replace(DIRECTIVE, VALID_CONTENT));
  });

  it("does not expand includes inside comments or strings", async () => {
    const text = ["/*", DIRECTIVE, "*/", "// " + DIRECTIVE, "String s = '", DIRECTIVE, "';"].join(
      "\n",
    );
    const document = await parseWithInclude(text);

    expect(getIncludeExpansion(document)).toBeUndefined();
    expect(document.parseResult.value.types.map((t) => t.name)).toEqual(["s"]);
  });

  it("keeps the document's own nodes at their original positions", async () => {
    const document = await parseWithInclude(SOURCE);
    const [a, , b] = document.parseResult.value.types;

    expect(a.$cstNode?.text).toBe('String a = "x";');
    expect(a.$cstNode?.range.start).toEqual({ line: 0, character: 0 });
    expect(getIncludeOrigin(a.$cstNode!)).toBeUndefined();

    expect(b.$cstNode?.text).toBe("String b = a;");
    expect(b.$cstNode?.offset).toBe(SOURCE.indexOf("String b"));
    expect(b.$cstNode?.range.start).toEqual({ line: 2, character: 0 });
    expect(getIncludeOrigin(b.$cstNode!)).toBeUndefined();
  });

  it("maps included nodes onto the #include directive and tags their origin", async () => {
    const document = await parseWithInclude(SOURCE);
    const [, c] = document.parseResult.value.types;
    const [loadCall] = document.parseResult.value.statements;

    const directiveStart = SOURCE.indexOf(DIRECTIVE);
    for (const node of [c.$cstNode!, loadCall.$cstNode!]) {
      expect(node.offset).toBe(directiveStart);
      expect(node.end).toBe(directiveStart + DIRECTIVE.length);
      expect(node.range).toEqual(DIRECTIVE_RANGE);
      expect(node.text).toBe(DIRECTIVE);
    }

    expect(getIncludeOrigin(c.$cstNode!)).toEqual({
      uri: LIB_URI,
      offset: VALID_CONTENT.indexOf("Company"),
    });
    expect(getIncludeOrigin(loadCall.$cstNode!)).toEqual({
      uri: LIB_URI,
      offset: VALID_CONTENT.indexOf("c.load"),
    });
  });

  it("restores the original text as the CST root text", async () => {
    const document = await parseWithInclude(SOURCE);

    expect(document.parseResult.value.$cstNode?.root.fullText).toBe(SOURCE);
    expect(document.textDocument.getText()).toBe(SOURCE);
  });

  it("maps a token that starts in an include and ends in the document to its full extent", async () => {
    // The included content opens a block comment that the document closes.
    const text = [DIRECTIVE, "close */", "String b = a;"].join("\n");
    const document = await parseWithInclude(text, `${VALID_CONTENT} /* open`);

    const comment = CstUtils.streamCst(document.parseResult.value.$cstNode!).find(
      (node) => isLeafCstNode(node) && node.hidden,
    );
    expect(comment?.offset).toBe(0);
    expect(comment?.end).toBe(text.indexOf("*/") + 2);
    expect(comment?.range.end).toEqual({ line: 1, character: "close */".length });
  });

  it("maps parser errors that occur after an include back to the original text", async () => {
    const brokenLine = "String b = ;";
    const broken = [DIRECTIVE, brokenLine].join("\n");
    const document = await parseWithInclude(broken);

    expect(document.parseResult.parserErrors.length).toBeGreaterThan(0);
    const [error] = document.parseResult.parserErrors;
    expect(error.token.image).toBe(";");
    // Chevrotain lines and columns are 1-based.
    expect(error.token.startLine).toBe(2);
    expect(error.token.startColumn).toBe(brokenLine.indexOf(";") + 1);
    expect(error.token.startOffset).toBe(broken.lastIndexOf(";"));
  });

  it("maps every parser error token exactly once, even when errors share tokens", async () => {
    const broken = [
      DIRECTIVE,
      "String b = = = ;",
      "if ( { } else x ;;",
      "String c = c.(;",
      "while ) ( }",
    ].join("\n");
    const document = await parseWithInclude(broken);

    const tokens = document.parseResult.parserErrors
      .flatMap((error) => [
        error.token,
        (error as { previousToken?: typeof error.token }).previousToken,
      ])
      .filter((token) => token !== undefined && !Number.isNaN(token.startOffset));
    expect(new Set(tokens).size).toBeLessThan(tokens.length);
    for (const token of tokens) {
      expect(broken.substring(token!.startOffset, token!.endOffset! + 1)).toBe(token!.image);
    }
  });

  it("reports validation errors from a real included file on the #include line", async () => {
    const { shared } = await createMemoryWorkspace({
      [UriUtils.joinPath(ROOT, INCLUDE_MAPPING_PATH).toString()]: JSON.stringify({ lib: LIB_PATH }),
      [LIB_URI]: "Company c; c.doesNotExist()",
    });
    const uri = UriUtils.joinPath(ROOT, `document-${documentCounter++}.crmscript`);
    const document = await shared.workspace.LangiumDocumentFactory.fromString<ImplementationModel>(
      ['String a = "x";', DIRECTIVE].join("\n"),
      uri,
      Cancellation.CancellationToken.None,
    );
    shared.workspace.LangiumDocuments.addDocument(document);
    await shared.workspace.DocumentBuilder.build([document], { validation: true });

    const includeDiagnostics = (document.diagnostics ?? []).filter((d) => d.range.start.line === 1);
    const messages = includeDiagnostics.map((d) =>
      typeof d.message === "string" ? d.message : d.message.value,
    );
    expect(messages).toContain("Could not resolve reference to NamedElement named 'doesNotExist'.");
    for (const diagnostic of includeDiagnostics) {
      expect(diagnostic.range.end).toEqual(DIRECTIVE_RANGE.end);
    }
  });

  it("expands includes on update() as well, via the async parse path", async () => {
    const { shared, store } = await createMemoryWorkspace({
      [UriUtils.joinPath(ROOT, INCLUDE_MAPPING_PATH).toString()]: JSON.stringify({ lib: LIB_PATH }),
      [LIB_URI]: VALID_CONTENT,
    });
    const uri = UriUtils.joinPath(ROOT, "update.crmscript");
    store.set(uri.toString(), 'String a = "x";');
    const document = (await shared.workspace.LangiumDocuments.getOrCreateDocument(
      uri,
    )) as LangiumDocument<ImplementationModel>;
    await shared.workspace.DocumentBuilder.build([document]);
    expect(getIncludeExpansion(document)).toBeUndefined();

    store.set(uri.toString(), SOURCE);
    await shared.workspace.DocumentBuilder.update([uri], []);

    expect(document.state).toBeGreaterThanOrEqual(DocumentState.Parsed);
    expect(getIncludeExpansion(document)?.segments.some((s) => s.includedVia)).toBe(true);
    expect(document.parseResult.value.$cstNode?.root.fullText).toBe(SOURCE);
    const b = document.parseResult.value.types.find((t) => t.name === "b");
    expect(b?.$cstNode?.range.start).toEqual({ line: 2, character: 0 });
  });

  describe("when expansion fails", () => {
    let factory: CrmscriptDocumentFactory;
    let shared: Awaited<ReturnType<typeof createCrmscriptServices>>["shared"];
    let uri: ReturnType<typeof UriUtils.joinPath>;

    beforeAll(async () => {
      ({ shared } = await createCrmscriptServices(EmptyFileSystem));
      const unresolvingHost: IncludeHost = {
        resolveIncludeName: () => undefined,
        readContent: () => "",
      };
      factory = new CrmscriptDocumentFactory(shared, unresolvingHost);
      uri = UriUtils.joinPath(ROOT, "failing.crmscript");
    });

    function expectUnexpandedParse(document: LangiumDocument<ImplementationModel>) {
      expect(getIncludeExpansionError(document)).toBeInstanceOf(Error);
      expect(getIncludeExpansion(document)).toBeUndefined();
      expect(document.parseResult.value.includes.map((i) => i.file)).toEqual(["lib"]);
      expect(document.parseResult.value.types.map((t) => t.name)).toEqual(["a", "b"]);
    }

    it("parses the unexpanded text on the sync path and records the error", () => {
      expectUnexpandedParse(factory.fromString<ImplementationModel>(SOURCE, uri));
    });

    it("throws on the sync path when include content requires async reads", () => {
      const asyncHost: IncludeHost = {
        resolveIncludeName: () => LIB_URI,
        readContent: async () => VALID_CONTENT,
      };
      const asyncFactory = new CrmscriptDocumentFactory(shared, asyncHost);
      expect(() => asyncFactory.fromString<ImplementationModel>(SOURCE, uri)).toThrow(
        /returned a Promise; use expandIncludes\(\) for asynchronous hosts/,
      );
    });

    it("parses the unexpanded text on the async path and records the error", async () => {
      expectUnexpandedParse(
        await factory.fromString<ImplementationModel>(
          SOURCE,
          uri,
          Cancellation.CancellationToken.None,
        ),
      );
    });
  });
});
