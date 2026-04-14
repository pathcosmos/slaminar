const MARKER_BEGIN_FN = (name: string) => `<!-- slaminar:begin:${name} -->`;
const MARKER_END_FN = (name: string) => `<!-- slaminar:end:${name} -->`;

const SECTION_REGEX = /<!-- slaminar:begin:(\w+) -->([\s\S]*?)<!-- slaminar:end:\1 -->/g;

/**
 * Extracts all slaminar-marked sections from content.
 */
export function extractMarkedSections(content: string): Map<string, string> {
  const sections = new Map<string, string>();
  let match: RegExpExecArray | null;

  const regex = new RegExp(SECTION_REGEX.source, 'g');
  while ((match = regex.exec(content)) !== null) {
    sections.set(match[1], match[2]);
  }

  return sections;
}

/**
 * Merges generated content into an existing file, preserving user content outside markers.
 *
 * For each section in generated:
 *   - If section exists in existing -> replace content within markers
 *   - If section doesn't exist in existing -> append at end
 * All content outside slaminar markers in existing is preserved.
 */
export function mergeWithMarkers(existing: string, generated: string): string {
  const generatedSections = extractMarkedSections(generated);

  if (generatedSections.size === 0) {
    return existing;
  }

  let result = existing;
  const appendSections: string[] = [];

  for (const [name, content] of generatedSections) {
    const sectionRegex = new RegExp(
      `<!-- slaminar:begin:${name} -->[\\s\\S]*?<!-- slaminar:end:${name} -->`,
    );

    if (sectionRegex.test(result)) {
      // Replace existing section
      result = result.replace(
        sectionRegex,
        `${MARKER_BEGIN_FN(name)}${content}${MARKER_END_FN(name)}`,
      );
    } else {
      // Collect sections to append
      appendSections.push(
        `${MARKER_BEGIN_FN(name)}${content}${MARKER_END_FN(name)}`,
      );
    }
  }

  if (appendSections.length > 0) {
    result = result.trimEnd() + '\n' + appendSections.join('\n') + '\n';
  }

  return result;
}
