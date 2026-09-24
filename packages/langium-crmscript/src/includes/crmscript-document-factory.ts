import {
  DefaultLangiumDocumentFactory,
  type AstNode,
  type Cancellation,
  type LangiumDocument,
  type LangiumSharedCoreServices,
  type ParseResult,
  type ParserOptions,
  type URI,
} from "langium";
import {
  expandIncludes,
  expandIncludesSync,
  type ExpandResult,
  type IncludeHost,
} from "@ejfasting/script-core/includes";
import { remapParseResult } from "./remap.js";

const expansions = new WeakMap<AstNode, ExpandResult>();
const expansionErrors = new WeakMap<AstNode, unknown>();
const ASYNC_READ_MESSAGE = "returned a Promise; use expandIncludes() for asynchronous hosts";

/**
 * Returns the include expansion that produced this document's AST, or `undefined` if the
 * document contained no includes or expansion failed.
 */
export function getIncludeExpansion(document: LangiumDocument): ExpandResult | undefined {
  return expansions.get(document.parseResult.value);
}

/**
 * Returns the error that prevented include expansion for this document, e.g. a circular or
 * unresolvable include. When set, the document was parsed from its unexpanded text.
 */
export function getIncludeExpansionError(document: LangiumDocument): unknown {
  return expansionErrors.get(document.parseResult.value);
}

/**
 * Expands `#include` directives before parsing, then maps all positions in the parse result
 * back onto the original text. `parse`/`parseAsync` are the methods through which `fromString`,
 * `fromTextDocument`, `fromUri` and `update` parse text.
 */
export class CrmscriptDocumentFactory extends DefaultLangiumDocumentFactory {
  constructor(
    services: LangiumSharedCoreServices,
    private readonly includeHost: IncludeHost,
  ) {
    super(services);
  }

  protected override parse<T extends AstNode>(
    uri: URI,
    text: string,
    options?: ParserOptions,
  ): ParseResult<T> {
    let expansion: ExpandResult | undefined;
    let failure: unknown;
    try {
      expansion = expandIncludesSync(text, uri.toString(), this.includeHost);
    } catch (error) {
      if (isAsyncReadError(error)) {
        throw error;
      }
      failure = error;
    }
    if (!expansion || expansion.expanded === text) {
      return this.withFailure(super.parse<T>(uri, text, options), failure);
    }
    const result = super.parse<T>(uri, expansion.expanded, options);
    this.finish(uri, text, expansion, result);
    return result;
  }

  protected override async parseAsync<T extends AstNode>(
    uri: URI,
    text: string,
    cancellationToken: Cancellation.CancellationToken,
  ): Promise<ParseResult<T>> {
    let expansion: ExpandResult | undefined;
    let failure: unknown;
    try {
      expansion = await expandIncludes(text, uri.toString(), this.includeHost);
    } catch (error) {
      failure = error;
    }
    if (!expansion || expansion.expanded === text) {
      return this.withFailure(await super.parseAsync<T>(uri, text, cancellationToken), failure);
    }
    const result = await super.parseAsync<T>(uri, expansion.expanded, cancellationToken);
    this.finish(uri, text, expansion, result);
    return result;
  }

  private finish<T extends AstNode>(
    uri: URI,
    originalText: string,
    expansion: ExpandResult,
    result: ParseResult<T>,
  ): void {
    const languageId = this.serviceRegistry.getServices(uri).LanguageMetaData.languageId;
    remapParseResult(result, originalText, expansion.segments, uri.toString(), languageId);
    expansions.set(result.value, expansion);
  }

  /**
   * Records `failure`, if any, for {@link getIncludeExpansionError}.
   */
  private withFailure<T extends AstNode>(result: ParseResult<T>, failure: unknown): ParseResult<T> {
    if (failure !== undefined) {
      expansionErrors.set(result.value, failure);
    }
    return result;
  }
}

function isAsyncReadError(error: unknown): boolean {
  return error instanceof Error && error.message.includes(ASYNC_READ_MESSAGE);
}
