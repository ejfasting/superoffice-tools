export interface IncludeHost {
  resolveIncludeName(name: string, fromLocation: string): string | undefined;
  readContent(location: string): string | Promise<string>;
}

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
  includedVia?: IncludeDirective;
}

export interface ExpandResult {
  expanded: string;
  segments: IncludeSegment[];
}

export declare function expandIncludes(
  text: string,
  location: string,
  host: IncludeHost,
): Promise<ExpandResult>;

export declare function expandIncludesSync(
  text: string,
  location: string,
  host: IncludeHost,
): ExpandResult;

export declare function findSegment(
  segments: IncludeSegment[],
  offset: number,
): IncludeSegment | undefined;

export declare function offsetToOriginal(
  segments: IncludeSegment[],
  offset: number,
): { location: string; offset: number } | undefined;
