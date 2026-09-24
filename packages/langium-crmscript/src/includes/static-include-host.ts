import type { IncludeHost } from "@ejfasting/script-core/includes";

/**
 * Placeholder content substituted for every `#include`. It is deliberately invalid CRMScript.
 */
export const STATIC_INCLUDE_CONTENT = "Company c; c.IsWrong(2)";

export const INCLUDE_URI_SCHEME = "crmscript-include";

/**
 * Include host that resolves every include name to a `crmscript-include:///<name>` location
 * with {@link STATIC_INCLUDE_CONTENT} as its content.
 */
export class StaticIncludeHost implements IncludeHost {
  constructor(private readonly content: string = STATIC_INCLUDE_CONTENT) {}

  resolveIncludeName(name: string): string {
    return `${INCLUDE_URI_SCHEME}:///${name}`;
  }

  readContent(): string {
    return this.content;
  }
}
