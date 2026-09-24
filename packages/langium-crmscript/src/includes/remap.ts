import {
  CstUtils,
  TextDocument,
  isLeafCstNode,
  type AstNode,
  type CstNode,
  type LeafCstNode,
  type ParseResult,
} from "langium";
import { findSegment, type IncludeSegment } from "@ejfasting/script-core/includes";

type Range = CstNode["range"];
type ParserError = ParseResult["parserErrors"][number];
type Token = ParserError["token"];
type LexingError = ParseResult["lexerErrors"][number];

/**
 * The source location of a CST node that was pulled in through an `#include`.
 */
export interface IncludeOrigin {
  uri: string;
  offset: number;
}

// Private fields of Langium's CST implementation (4.4.x) that are rewritten in place.
interface MutableLeaf {
  _offset: number;
  _length: number;
  _startLine: number;
  _startColumn: number;
  _endLine: number;
  _endColumn: number;
}
interface MutableComposite {
  _rangeCache?: Range;
}
interface MutableRoot {
  _text: string;
}

const origins = new WeakMap<CstNode, IncludeOrigin>();

/**
 * Returns the source location of a CST node that came from included content, or `undefined`
 * if the node belongs to the document itself. Composite nodes report the origin of their first
 * non-hidden leaf.
 */
export function getIncludeOrigin(node: CstNode): IncludeOrigin | undefined {
  const leaf = isLeafCstNode(node)
    ? node
    : CstUtils.streamCst(node).find((n) => isLeafCstNode(n) && !n.hidden);
  return leaf ? origins.get(leaf) : undefined;
}

/**
 * Rewrites all positions in `parseResult` (CST nodes, lexer errors, parser errors) from the
 * include-expanded text to `originalText`.
 *
 * - Content owned by the document maps to its original position.
 * - Content from an include (at any depth) maps to the `#include` directive in the document
 *   and is tagged with its origin (see {@link getIncludeOrigin}).
 */
export function remapParseResult<T extends AstNode>(
  parseResult: ParseResult<T>,
  originalText: string,
  segments: IncludeSegment[],
  uri: string,
  languageId: string,
): void {
  const textDocument = TextDocument.create(uri, languageId, 0, originalText);
  const mapper = new PositionMapper(segments, textDocument);

  const root = parseResult.value.$cstNode?.root;
  if (root) {
    for (const node of CstUtils.streamCst(root)) {
      if (isLeafCstNode(node)) {
        remapLeaf(node, mapper);
      } else {
        (node as unknown as MutableComposite)._rangeCache = undefined;
      }
    }
    (root as unknown as MutableRoot)._text = originalText;
  }

  // Remaps each error and token object at most once; several parser errors can reference the
  // same token.
  const remapped = new Set<object>();
  const lexingErrors = [
    ...parseResult.lexerErrors,
    ...(parseResult.lexerReport?.diagnostics ?? []),
  ];
  for (const error of lexingErrors) {
    if (!remapped.has(error)) {
      remapped.add(error);
      remapLexingError(error, mapper);
    }
  }
  for (const error of parseResult.parserErrors) {
    const tokens = [error.token, (error as { previousToken?: Token }).previousToken];
    for (const token of tokens) {
      if (token && !remapped.has(token)) {
        remapped.add(token);
        remapToken(token, mapper);
      }
    }
  }
}

function remapLeaf(leaf: LeafCstNode, mapper: PositionMapper): void {
  const span = mapper.mapSpan(leaf.offset, leaf.length);
  if (!span) return;
  if (span.origin) {
    origins.set(leaf, span.origin);
  }
  const mutable = leaf as unknown as MutableLeaf;
  mutable._offset = span.offset;
  mutable._length = span.length;
  mutable._startLine = span.range.start.line;
  mutable._startColumn = span.range.start.character;
  mutable._endLine = span.range.end.line;
  mutable._endColumn = span.range.end.character;
}

function remapLexingError(error: LexingError, mapper: PositionMapper): void {
  const span = mapper.mapSpan(error.offset, error.length);
  if (!span) return;
  // Chevrotain lines and columns are 1-based.
  error.offset = span.offset;
  error.length = span.length;
  error.line = span.range.start.line + 1;
  error.column = span.range.start.character + 1;
}

function remapToken(token: Token, mapper: PositionMapper): void {
  // Tokens inserted by error recovery have no position.
  if (Number.isNaN(token.startOffset)) return;
  const length =
    token.endOffset !== undefined ? token.endOffset - token.startOffset + 1 : token.image.length;
  const span = mapper.mapSpan(token.startOffset, length);
  if (!span) return;
  // Chevrotain lines and columns are 1-based, and its end offset and end column are inclusive.
  token.startOffset = span.offset;
  token.endOffset = span.offset + Math.max(span.length, 1) - 1;
  token.startLine = span.range.start.line + 1;
  token.startColumn = span.range.start.character + 1;
  token.endLine = span.range.end.line + 1;
  token.endColumn = span.range.end.character;
}

interface MappedSpan {
  offset: number;
  length: number;
  range: Range;
  origin?: IncludeOrigin;
}

class PositionMapper {
  constructor(
    private readonly segments: IncludeSegment[],
    private readonly textDocument: TextDocument,
  ) {}

  /**
   * Maps the span `[expandedOffset, expandedOffset + length)` to the original text. The start
   * and the last character are mapped independently; a span that crosses an include covers
   * everything between its original start and end.
   */
  mapSpan(expandedOffset: number, length: number): MappedSpan | undefined {
    const startSegment = findSegment(this.segments, expandedOffset);
    const lastOffset = expandedOffset + length - 1;
    const endSegment = length > 0 ? findSegment(this.segments, lastOffset) : startSegment;
    if (!startSegment || !endSegment) return undefined;

    const offset = startSegment.includedVia?.start ?? toSource(startSegment, expandedOffset);
    const end =
      length > 0 ? (endSegment.includedVia?.end ?? toSource(endSegment, lastOffset) + 1) : offset;

    return {
      offset,
      length: end - offset,
      range: {
        start: this.textDocument.positionAt(offset),
        end: this.textDocument.positionAt(end),
      },
      origin: startSegment.includedVia
        ? { uri: startSegment.sourceLocation, offset: toSource(startSegment, expandedOffset) }
        : undefined,
    };
  }
}

function toSource(segment: IncludeSegment, expandedOffset: number): number {
  return segment.sourceStart + (expandedOffset - segment.generatedStart);
}
