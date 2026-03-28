/**
 * Replace {{token}} placeholders in a prompt string with provided values.
 *
 * - Replaces all occurrences of {{token}} with the corresponding value.
 * - Non-filled optional tokens (no key in values, or empty string for non-required): preserved as-is.
 * - Empty values for required fields: not replaced (kept as {{token}}).
 * - Handles multiple occurrences of the same token.
 */
export function replaceTemplateTokens(
  prompt: string,
  values: Record<string, string>,
): string {
  return prompt.replace(/\{\{(\w+)\}\}/g, (match, token: string) => {
    const value = values[token];
    // Only replace if value exists and is non-empty
    if (value !== undefined && value !== '') {
      return value;
    }
    // Preserve the placeholder as-is
    return match;
  });
}
