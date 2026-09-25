export interface IncludeHost {
  resolveIncludeName(name: string, fromLocation: string): string | undefined;
  readContent(location: string): string | Promise<string>;
}

/**
 * The span of an `#include` directive line in the document that contains it.
 */
export interface IncludeDirective {
  location: string;
  start: number;
  end: number;
}

export interface IncludeSegment {
  generatedStart: number;
  generatedEnd: number;
  sourceLocation: string;
  sourceStart: number;
  /**
   * The directive in the root document that pulled this segment in. Only set for segments
   * that originate from an included file, at any nesting depth.
   */
  includedVia?: IncludeDirective;
}

export interface ExpandResult {
  expanded: string;
  segments: IncludeSegment[];
}
