import type { IncludeHost, ExpandResult, IncludeSegment, IncludeDirective } from "./types.js";
export type { IncludeHost, ExpandResult, IncludeSegment, IncludeDirective };

interface Directive {
  name: string;
  start: number;
  end: number;
}

/**
 * Returns the `#include` directives in `text`: lines consisting solely of the directive, outside
 * of line comments, block comments and string literals. A block comment or string without a
 * closing delimiter is not treated as one.
 */
function findDirectives(text: string): Directive[] {
  const directives: Directive[] = [];
  let i = 0;
  let atLineStart = true;
  while (i < text.length) {
    if (atLineStart) {
      atLineStart = false;
      const directive = parseDirectiveAtLineStart(text, i);
      if (directive) {
        directives.push(directive);
        i = directive.end;
        continue;
      }
    }

    const char = text[i];
    const next = text[i + 1];
    let skipTo = -1;
    if (char === "\n" || char === "\r") {
      atLineStart = true;
    } else if (char === "/" && next === "/") {
      skipTo = indexOfLineEnd(text, i);
    } else if (char === "/" && next === "*") {
      const close = text.indexOf("*/", i + 2);
      skipTo = close < 0 ? -1 : close + 2;
    } else if (char === '"' || char === "'") {
      const close = text.indexOf(char, i + 1);
      skipTo = close < 0 ? -1 : close + 1;
    }
    i = skipTo < 0 ? i + 1 : skipTo;
  }
  return directives;
}

function parseDirectiveAtLineStart(text: string, start: number): Directive | undefined {
  let i = start;
  while (text[i] === " " || text[i] === "\t") i++;
  if (!text.startsWith("#include", i)) return undefined;
  i += "#include".length;

  while (text[i] === " " || text[i] === "\t") i++;
  if (text[i] !== '"') return undefined;
  i++;
  const nameStart = i;

  while (i < text.length && text[i] !== '"' && text[i] !== "\r" && text[i] !== "\n") i++;
  if (text[i] !== '"' || i === nameStart) return undefined;
  const name = text.slice(nameStart, i);
  i++;

  while (text[i] === " " || text[i] === "\t") i++;
  if (text[i] === ";") i++;
  while (text[i] === " " || text[i] === "\t") i++;

  if (i < text.length && text[i] !== "\r" && text[i] !== "\n") return undefined;
  return { name, start, end: i };
}

function indexOfLineEnd(text: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    if (text[i] === "\n" || text[i] === "\r") return i;
  }
  return text.length;
}

/**
 * Expands the includes in `text`. Yields each location whose content is needed and expects
 * that content to be passed back through `next()`.
 */
function* expand(
  text: string,
  location: string,
  host: IncludeHost,
  seen: Set<string>,
): Generator<string, ExpandResult, string> {
  if (seen.has(location)) {
    throw new Error(`Circular #include detected involving ${location}`);
  }
  seen.add(location);

  let result = "";
  let lastIndex = 0;
  const segments: IncludeSegment[] = [];

  for (const { name, start: directiveStart, end: directiveEnd } of findDirectives(text)) {
    const before = text.slice(lastIndex, directiveStart);
    segments.push({
      generatedStart: result.length,
      generatedEnd: result.length + before.length,
      sourceLocation: location,
      sourceStart: lastIndex,
    });
    result += before;

    const targetLocation = host.resolveIncludeName(name, location);
    if (!targetLocation) {
      throw new Error(`Cannot resolve include '${name}' from ${location}`);
    }
    const includedText = yield targetLocation;
    const nested = yield* expand(includedText, targetLocation, host, new Set(seen));

    // Replaces any directive recorded by a deeper level with this document's directive.
    const includedVia: IncludeDirective = { location, start: directiveStart, end: directiveEnd };
    for (const seg of nested.segments) {
      segments.push({
        ...seg,
        generatedStart: seg.generatedStart + result.length,
        generatedEnd: seg.generatedEnd + result.length,
        includedVia,
      });
    }
    result += nested.expanded;
    lastIndex = directiveEnd;
  }

  const tail = text.slice(lastIndex);
  segments.push({
    generatedStart: result.length,
    generatedEnd: result.length + tail.length,
    sourceLocation: location,
    sourceStart: lastIndex,
  });
  result += tail;

  return { expanded: result, segments };
}

export async function expandIncludes(
  text: string,
  location: string,
  host: IncludeHost,
): Promise<ExpandResult> {
  const gen = expand(text, location, host, new Set());
  let step = gen.next();
  while (!step.done) {
    step = gen.next(await host.readContent(step.value));
  }
  return step.value;
}

export function expandIncludesSync(
  text: string,
  location: string,
  host: IncludeHost,
): ExpandResult {
  const gen = expand(text, location, host, new Set());
  let step = gen.next();
  while (!step.done) {
    const content = host.readContent(step.value);
    if (typeof content !== "string") {
      throw new Error(
        `readContent('${step.value}') returned a Promise; use expandIncludes() for asynchronous hosts`,
      );
    }
    step = gen.next(content);
  }
  return step.value;
}

/**
 * Returns the segment whose `[generatedStart, generatedEnd)` range contains `offset`. An
 * offset equal to the end of the last segment (the end of the document) returns the last
 * segment.
 */
export function findSegment(
  segments: IncludeSegment[],
  offset: number,
): IncludeSegment | undefined {
  let low = 0;
  let high = segments.length - 1;
  let candidate: IncludeSegment | undefined;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (segments[mid].generatedStart <= offset) {
      candidate = segments[mid];
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  if (candidate && offset < candidate.generatedEnd) return candidate;
  const last = segments[segments.length - 1];
  return last && offset === last.generatedEnd ? last : undefined;
}

export function offsetToOriginal(
  segments: IncludeSegment[],
  offset: number,
): { location: string; offset: number } | undefined {
  const seg = findSegment(segments, offset);
  if (!seg) return undefined;
  return { location: seg.sourceLocation, offset: seg.sourceStart + (offset - seg.generatedStart) };
}
