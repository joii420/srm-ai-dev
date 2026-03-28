import { describe, it, expect } from 'vitest';
import { replaceTemplateTokens } from '../../../src/utils/templateReplacer';

describe('replaceTemplateTokens', () => {
  it('replaces {{token}} with provided values', () => {
    const result = replaceTemplateTokens(
      '请帮我生成 {{component}} 的 {{type}} 代码',
      { component: 'Button', type: 'React' },
    );
    expect(result).toBe('请帮我生成 Button 的 React 代码');
  });

  it('preserves unfilled optional {{token}} as-is', () => {
    const result = replaceTemplateTokens(
      '生成 {{component}} 组件，样式: {{style}}',
      { component: 'Card' },
    );
    expect(result).toBe('生成 Card 组件，样式: {{style}}');
  });

  it('replaces all occurrences of the same token', () => {
    const result = replaceTemplateTokens(
      '{{name}} 是 {{name}} 的组件',
      { name: 'Button' },
    );
    expect(result).toBe('Button 是 Button 的组件');
  });

  it('does not replace empty values for required fields', () => {
    const result = replaceTemplateTokens(
      '生成 {{component}} 代码',
      { component: '' },
    );
    expect(result).toBe('生成 {{component}} 代码');
  });

  it('handles special characters in values', () => {
    const result = replaceTemplateTokens(
      '代码: {{code}}',
      { code: 'const x = <div className="test">{items.map(i => i)}</div>' },
    );
    expect(result).toBe('代码: const x = <div className="test">{items.map(i => i)}</div>');
  });

  it('returns the original string when no tokens match', () => {
    const result = replaceTemplateTokens('没有占位符的文本', { foo: 'bar' });
    expect(result).toBe('没有占位符的文本');
  });

  it('handles empty prompt string', () => {
    const result = replaceTemplateTokens('', { foo: 'bar' });
    expect(result).toBe('');
  });

  it('handles empty values object', () => {
    const result = replaceTemplateTokens('{{a}} and {{b}}', {});
    expect(result).toBe('{{a}} and {{b}}');
  });

  it('handles values with newlines and whitespace', () => {
    const result = replaceTemplateTokens(
      '内容: {{content}}',
      { content: 'line1\nline2\n  indented' },
    );
    expect(result).toBe('内容: line1\nline2\n  indented');
  });
});
