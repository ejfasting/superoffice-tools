import { describe, expect, it } from "vitest";
import {
  expandIncludes,
  expandIncludesSync,
  findSegment,
  offsetToOriginal,
} from "../src/includes.js";
import type { ExpandResult, IncludeHost, IncludeSegment } from "../src/includes.js";

type Files = Record<string, string>;

/**
 * In-memory IncludeHost that resolves an include name to the key of the same name in `files`.
 */
function createHost(files: Files, mode: "sync" | "async"): IncludeHost {
  return {
    resolveIncludeName(name) {
      return name in files ? name : undefined;
    },
    readContent(location) {
      const content = files[location];
      if (content === undefined) {
        throw new Error(`Unknown location in test fixture: ${location}`);
      }
      return mode === "sync" ? content : Promise.resolve(content);
    },
  };
}

const drivers = [
  {
    name: "expandIncludes (async)",
    mode: "async" as const,
    expand: expandIncludes,
  },
  {
    name: "expandIncludesSync",
    mode: "sync" as const,
    expand: async (text: string, location: string, host: IncludeHost) =>
      expandIncludesSync(text, location, host),
  },
];

/**
 * Asserts that every offset in the expanded text maps back to a character with the same value
 * in the original source.
 */
function verifyRoundTrip(files: Files, result: ExpandResult) {
  for (let offset = 0; offset < result.expanded.length; offset++) {
    const original = offsetToOriginal(result.segments, offset);
    expect(original, `no mapping for offset ${offset}`).toBeDefined();
    const sourceChar = files[original!.location]?.[original!.offset];
    expect(
      sourceChar,
      `offset ${offset} ('${result.expanded[offset]}') mapped to ${original!.location}:${original!.offset} ('${sourceChar}')`,
    ).toBe(result.expanded[offset]);
  }
}

describe.each(drivers)("$name", ({ mode, expand }) => {
  const run = (files: Files, root: string) => expand(files[root], root, createHost(files, mode));

  async function expandAndVerify(files: Files, root: string) {
    const result = await run(files, root);
    verifyRoundTrip(files, result);
    return result;
  }

  it("returns the text unchanged when there are no includes", async () => {
    const files = { "main.txt": "hello world" };
    const result = await expandAndVerify(files, "main.txt");

    expect(result.expanded).toBe("hello world");
    expect(result.segments).toEqual([
      { generatedStart: 0, generatedEnd: 11, sourceLocation: "main.txt", sourceStart: 0 },
    ]);
  });

  it("expands a single include directive that is alone on its own line", async () => {
    const files = {
      "main.txt": '#include "a.txt"',
      "a.txt": "A-CONTENT",
    };
    const result = await expandAndVerify(files, "main.txt");

    expect(result.expanded).toBe("A-CONTENT");
  });

  it("accepts an optional trailing semicolon", async () => {
    const files = {
      "main.txt": '#include "a.txt";\n#include "a.txt" ;  ',
      "a.txt": "A",
    };
    const result = await expandAndVerify(files, "main.txt");

    expect(result.expanded).toBe("A\nA");
  });

  it("keeps surrounding text and preserves newlines around an include", async () => {
    const files = {
      "main.txt": 'AB\n#include "x.txt"\nCD',
      "x.txt": "XX",
    };
    const result = await expandAndVerify(files, "main.txt");

    expect(result.expanded).toBe("AB\nXX\nCD");
  });

  it("supports CRLF line endings", async () => {
    const files = {
      "main.txt": 'AB\r\n#include "x.txt";\r\nCD',
      "x.txt": "XX",
    };
    const result = await expandAndVerify(files, "main.txt");

    expect(result.expanded).toBe("AB\r\nXX\r\nCD");
  });

  it("expands includes after comments and strings that end on a previous line", async () => {
    const files = {
      "main.txt": [
        '// line comment "',
        "/* block",
        "comment */",
        "String s = 'multi",
        "line';",
        '#include "a.txt"',
      ].join("\n"),
      "a.txt": "A",
    };
    const result = await expandAndVerify(files, "main.txt");

    expect(result.expanded.endsWith("line';\nA")).toBe(true);
  });

  it("expands includes after an unterminated block comment or string", async () => {
    const files = {
      "main.txt": '/* open\nString s = \'open\n#include "a.txt"',
      "a.txt": "A",
    };
    const result = await expandAndVerify(files, "main.txt");

    expect(result.expanded).toBe("/* open\nString s = 'open\nA");
  });

  it("supports indentation (spaces and tabs) before the #include directive", async () => {
    const files = {
      "main.txt": 'before\n  #include "a.txt"\n\t#include "b.txt"\nafter',
      "a.txt": "AAA",
      "b.txt": "BBB",
    };
    const result = await expandAndVerify(files, "main.txt");

    expect(result.expanded).toBe("before\nAAA\nBBB\nafter");
  });

  it("recursively expands nested includes across multiple levels", async () => {
    const files = {
      "main.txt": 'top\n#include "mid.txt"\nbottom',
      "mid.txt": 'mid-before\n#include "leaf.txt"\nmid-after',
      "leaf.txt": "LEAF",
    };
    const result = await expandAndVerify(files, "main.txt");

    expect(result.expanded).toBe("top\nmid-before\nLEAF\nmid-after\nbottom");
    expect(offsetToOriginal(result.segments, result.expanded.indexOf("LEAF"))).toEqual({
      location: "leaf.txt",
      offset: 0,
    });
  });

  it("records the root document's directive as `includedVia` for included content at any depth", async () => {
    const main = 'top\n#include "mid.txt"\nbottom';
    const files = {
      "main.txt": main,
      "mid.txt": 'mid\n#include "leaf.txt"',
      "leaf.txt": "LEAF",
    };
    const result = await expandAndVerify(files, "main.txt");

    const directive = {
      location: "main.txt",
      start: main.indexOf("#include"),
      end: main.indexOf("\nbottom"),
    };
    expect(main.slice(directive.start, directive.end)).toBe('#include "mid.txt"');

    const midSeg = findSegment(result.segments, result.expanded.indexOf("mid"));
    const leafSeg = findSegment(result.segments, result.expanded.indexOf("LEAF"));
    expect(midSeg?.includedVia).toEqual(directive);
    expect(leafSeg?.includedVia).toEqual(directive);

    const topSeg = findSegment(result.segments, 0);
    const bottomSeg = findSegment(result.segments, result.expanded.indexOf("bottom"));
    expect(topSeg?.includedVia).toBeUndefined();
    expect(bottomSeg?.includedVia).toBeUndefined();
  });

  it("allows the same file to be included multiple times (diamond dependency), not treated as circular", async () => {
    const files = {
      "main.txt": '#include "b.txt"\n#include "c.txt"',
      "b.txt": '#include "shared.txt"',
      "c.txt": '#include "shared.txt"',
      "shared.txt": "SHARED",
    };
    const result = await expandAndVerify(files, "main.txt");

    expect(result.expanded).toBe("SHARED\nSHARED");
  });

  it("throws when a true circular include is detected", async () => {
    const files = {
      "a.txt": '#include "b.txt"',
      "b.txt": '#include "a.txt"',
    };

    await expect(run(files, "a.txt")).rejects.toThrow(
      /Circular #include detected involving a\.txt/,
    );
  });

  it("throws when an include cannot be resolved by the host", async () => {
    const files = { "main.txt": '#include "missing.txt"' };

    await expect(run(files, "main.txt")).rejects.toThrow(
      /Cannot resolve include 'missing.txt' from main.txt/,
    );
  });

  describe("lines that are not include directives are left untouched", () => {
    const untouchedHost: IncludeHost = {
      resolveIncludeName: () => {
        throw new Error("resolveIncludeName should not be called for a non-directive line");
      },
      readContent: () => {
        throw new Error("readContent should not be called for a non-directive line");
      },
    };

    it.each([
      ["commented-out include", '// #include "a.txt"\nkept'],
      ["include inside a block comment", '/* start\n#include "a.txt"\nend */\nkept'],
      ["line starting inside a double-quoted string", 'String s = "start\n#include "a.txt"'],
      ["include inside a single-quoted string", "String s = 'start\n#include \"a.txt\"\nend';"],
      ["include after a block comment on the same line", '/* c */ #include "a.txt"\nkept'],
      ["single-quoted name", "#include 'a.txt'\nkept"],
      ["trailing content after the closing quote", '#include "a.txt" extra\nkept'],
      ["missing quotes", "#include missing-quotes\nkept"],
      ["include keyword not at line start", 'int x; #include "a.txt"\nkept'],
    ])("%s", async (_label, text) => {
      const result = await expand(text, "main.txt", untouchedHost);
      expect(result.expanded).toBe(text);
    });
  });
});

describe("expandIncludesSync", () => {
  it("throws when the host returns a Promise", () => {
    const files = { "main.txt": '#include "a.txt"', "a.txt": "A" };
    const host = createHost(files, "async");

    expect(() => expandIncludesSync(files["main.txt"], "main.txt", host)).toThrow(
      /readContent\('a\.txt'\) returned a Promise; use expandIncludes\(\)/,
    );
  });
});

describe("findSegment", () => {
  const segments: IncludeSegment[] = [
    { generatedStart: 0, generatedEnd: 5, sourceLocation: "a.txt", sourceStart: 0 },
    { generatedStart: 5, generatedEnd: 5, sourceLocation: "empty.txt", sourceStart: 0 },
    { generatedStart: 5, generatedEnd: 10, sourceLocation: "b.txt", sourceStart: 0 },
    { generatedStart: 10, generatedEnd: 10, sourceLocation: "a.txt", sourceStart: 5 },
  ];

  it("skips zero-length segments in favour of the segment that starts at the same offset", () => {
    expect(findSegment(segments, 5)?.sourceLocation).toBe("b.txt");
  });

  it("returns the trailing segment for the end-of-document offset, even when it is empty", () => {
    expect(findSegment(segments, 10)).toBe(segments[3]);
  });
});

describe("offsetToOriginal", () => {
  const segments: IncludeSegment[] = [
    { generatedStart: 0, generatedEnd: 5, sourceLocation: "a.txt", sourceStart: 0 },
    { generatedStart: 5, generatedEnd: 10, sourceLocation: "b.txt", sourceStart: 100 },
  ];

  it("resolves an offset in the middle of a segment", () => {
    expect(offsetToOriginal(segments, 2)).toEqual({ location: "a.txt", offset: 2 });
  });

  it("attaches an interior boundary offset to the following segment", () => {
    expect(offsetToOriginal(segments, 5)).toEqual({ location: "b.txt", offset: 100 });
  });

  it("attaches the end-of-document offset to the last segment", () => {
    expect(offsetToOriginal(segments, 10)).toEqual({ location: "b.txt", offset: 105 });
  });

  it("returns undefined before the first segment or past the end", () => {
    expect(offsetToOriginal(segments, -1)).toBeUndefined();
    expect(offsetToOriginal(segments, 11)).toBeUndefined();
  });

  it("returns undefined for an empty segments array", () => {
    expect(offsetToOriginal([], 0)).toBeUndefined();
  });
});
