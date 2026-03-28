import React, { useState, useMemo, useCallback } from 'react';
import type { SkillInfo, SkillField } from '../../../stores/skillStore';
import { replaceTemplateTokens } from '../../../utils/templateReplacer';

interface SkillTemplateModalProps {
  skill: SkillInfo | null;
  onSubmit: (prompt: string) => void;
  onClose: () => void;
}

const SkillTemplateModal: React.FC<SkillTemplateModalProps> = ({
  skill,
  onSubmit,
  onClose,
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Reset form when skill changes
  React.useEffect(() => {
    setValues({});
    setSubmitted(false);
  }, [skill?.id]);

  const handleChange = useCallback((token: string, value: string) => {
    setValues((prev) => ({ ...prev, [token]: value }));
  }, []);

  const handleChipToggle = useCallback((token: string, option: string) => {
    setValues((prev) => {
      const current = prev[token] ?? '';
      const chips = current ? current.split(',').map((s) => s.trim()) : [];
      const idx = chips.indexOf(option);
      if (idx >= 0) {
        chips.splice(idx, 1);
      } else {
        chips.push(option);
      }
      return { ...prev, [token]: chips.join(', ') };
    });
  }, []);

  // Live preview of prompt with replacements
  const previewPrompt = useMemo(() => {
    if (!skill) return '';
    return replaceTemplateTokens(skill.prompt, values);
  }, [skill, values]);

  // Validation: check required fields
  const requiredErrors = useMemo(() => {
    if (!skill) return [];
    return (skill.fields ?? [])
      .filter((f) => f.required && (!values[f.token] || values[f.token].trim() === ''))
      .map((f) => f.token);
  }, [skill, values]);

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    if (requiredErrors.length > 0) return;
    if (!skill) return;

    const finalPrompt = replaceTemplateTokens(skill.prompt, values);
    onSubmit(finalPrompt);
    onClose();
  }, [requiredErrors, skill, values, onSubmit, onClose]);

  if (!skill) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Modal */}
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.title}>{skill.icon} {skill.name}</span>
          <button style={styles.closeBtn} onClick={onClose}>x</button>
        </div>

        {/* Live preview */}
        <div style={styles.previewSection}>
          <div style={styles.previewLabel}>Prompt 预览</div>
          <div style={styles.previewBox}>
            {previewPrompt || skill.prompt}
          </div>
        </div>

        {/* Form fields */}
        <div style={styles.fieldsContainer}>
          {(skill.fields ?? []).map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.token] ?? ''}
              onChange={(val) => handleChange(field.token, val)}
              onChipToggle={(option) => handleChipToggle(field.token, option)}
              hasError={submitted && requiredErrors.includes(field.token)}
            />
          ))}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose}>
            取消
          </button>
          <button style={styles.submitBtn} onClick={handleSubmit}>
            生成提示词并发送
          </button>
        </div>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
//  Field Input sub-component
// ---------------------------------------------------------------------------

interface FieldInputProps {
  field: SkillField;
  value: string;
  onChange: (value: string) => void;
  onChipToggle: (option: string) => void;
  hasError: boolean;
}

const FieldInput: React.FC<FieldInputProps> = ({
  field,
  value,
  onChange,
  onChipToggle,
  hasError,
}) => {
  const borderColor = hasError ? '#f38ba8' : '#45475a';

  return (
    <div style={styles.fieldGroup}>
      <label style={styles.fieldLabel}>
        {field.label}
        {field.required && <span style={{ color: '#f38ba8', marginLeft: 2 }}>*</span>}
      </label>

      {field.type === 'textarea' && (
        <textarea
          style={{ ...styles.textarea, borderColor }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? undefined}
          rows={3}
        />
      )}

      {field.type === 'select' && (
        <select
          style={{ ...styles.selectInput, borderColor }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">-- 请选择 --</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {field.type === 'chips' && (
        <div style={styles.chipsRow}>
          {field.options.map((opt) => {
            const selected = value.split(',').map((s) => s.trim()).includes(opt);
            return (
              <button
                key={opt}
                type="button"
                style={{
                  ...styles.chip,
                  ...(selected ? styles.chipActive : {}),
                  ...(hasError ? { borderColor: '#f38ba8' } : {}),
                }}
                onClick={() => onChipToggle(opt)}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {!['textarea', 'select', 'chips'].includes(field.type) && (
        <input
          type="text"
          style={{ ...styles.textInput, borderColor }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? undefined}
        />
      )}

      {hasError && (
        <span style={styles.errorHint}>此字段为必填</span>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
//  Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 1100,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 520,
    maxHeight: '80vh',
    background: '#1e1e2e',
    border: '1px solid #313244',
    borderRadius: 12,
    zIndex: 1101,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: '1px solid #313244',
  },
  title: {
    color: '#cdd6f4',
    fontSize: 16,
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#6c7086',
    fontSize: 18,
    cursor: 'pointer',
    padding: '2px 6px',
  },
  previewSection: {
    padding: '12px 20px',
    borderBottom: '1px solid #313244',
  },
  previewLabel: {
    color: '#a6adc8',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  previewBox: {
    background: '#313244',
    borderRadius: 6,
    padding: '10px 12px',
    color: '#cdd6f4',
    fontSize: 12,
    lineHeight: 1.5,
    maxHeight: 120,
    overflowY: 'auto' as const,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  fieldsContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  fieldLabel: {
    color: '#cdd6f4',
    fontSize: 13,
    fontWeight: 500,
  },
  textInput: {
    background: '#313244',
    border: '1px solid #45475a',
    borderRadius: 6,
    color: '#cdd6f4',
    fontSize: 13,
    padding: '8px 10px',
    outline: 'none',
  },
  textarea: {
    background: '#313244',
    border: '1px solid #45475a',
    borderRadius: 6,
    color: '#cdd6f4',
    fontSize: 13,
    padding: '8px 10px',
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  selectInput: {
    background: '#313244',
    border: '1px solid #45475a',
    borderRadius: 6,
    color: '#cdd6f4',
    fontSize: 13,
    padding: '8px 10px',
    outline: 'none',
  },
  chipsRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  chip: {
    background: '#313244',
    border: '1px solid #45475a',
    borderRadius: 12,
    color: '#a6adc8',
    fontSize: 12,
    padding: '4px 12px',
    cursor: 'pointer',
  },
  chipActive: {
    background: '#89b4fa',
    color: '#1e1e2e',
    borderColor: '#89b4fa',
    fontWeight: 600,
  },
  errorHint: {
    color: '#f38ba8',
    fontSize: 11,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    padding: '14px 20px',
    borderTop: '1px solid #313244',
  },
  cancelBtn: {
    background: '#45475a',
    border: 'none',
    borderRadius: 6,
    color: '#a6adc8',
    fontSize: 13,
    padding: '8px 16px',
    cursor: 'pointer',
  },
  submitBtn: {
    background: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default SkillTemplateModal;
