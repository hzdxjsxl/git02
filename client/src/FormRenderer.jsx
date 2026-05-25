import React, { memo } from 'react';

function FieldLabel({ field, required }) {
  return (
    <label className="field-label">
      {field.label}
      {required && <span className="required-mark"> *</span>}
    </label>
  );
}

function TextField({ field, value, error, onChange }) {
  return (
    <div className={`field-item ${error ? 'has-error' : ''}`}>
      <FieldLabel field={field} required={field.required} />
      <input
        type="text"
        className="field-input"
        value={value || ''}
        placeholder={field.placeholder || ''}
        onChange={e => onChange(field.id, e.target.value)}
      />
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function TextAreaField({ field, value, error, onChange }) {
  return (
    <div className={`field-item ${error ? 'has-error' : ''}`}>
      <FieldLabel field={field} required={field.required} />
      <textarea
        className="field-input field-textarea"
        value={value || ''}
        placeholder={field.placeholder || ''}
        rows={4}
        onChange={e => onChange(field.id, e.target.value)}
      />
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function NumberField({ field, value, error, onChange }) {
  return (
    <div className={`field-item ${error ? 'has-error' : ''}`}>
      <FieldLabel field={field} required={field.required} />
      <input
        type="number"
        className="field-input"
        value={value || ''}
        placeholder={field.placeholder || ''}
        min={field.min}
        max={field.max}
        step={field.step || 1}
        onChange={e => onChange(field.id, e.target.value === '' ? '' : Number(e.target.value))}
      />
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function RadioField({ field, value, error, onChange }) {
  return (
    <div className={`field-item ${error ? 'has-error' : ''}`}>
      <FieldLabel field={field} required={field.required} />
      <div className="radio-group">
        {field.options.map(option => (
          <label key={option.value} className="radio-item">
            <input
              type="radio"
              name={field.id}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(field.id, option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function CheckboxField({ field, value, error, onChange }) {
  const currentValue = Array.isArray(value) ? value : [];

  const handleCheckboxChange = (optionValue, checked) => {
    let newValue;
    if (checked) {
      newValue = [...currentValue, optionValue];
    } else {
      newValue = currentValue.filter(v => v !== optionValue);
    }
    onChange(field.id, newValue);
  };

  return (
    <div className={`field-item ${error ? 'has-error' : ''}`}>
      <FieldLabel field={field} required={field.required} />
      <div className="checkbox-group">
        {field.options.map(option => (
          <label key={option.value} className="checkbox-item">
            <input
              type="checkbox"
              value={option.value}
              checked={currentValue.includes(option.value)}
              onChange={e => handleCheckboxChange(option.value, e.target.checked)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function SelectField({ field, value, error, onChange }) {
  return (
    <div className={`field-item ${error ? 'has-error' : ''}`}>
      <FieldLabel field={field} required={field.required} />
      <select
        className="field-input"
        value={value || ''}
        onChange={e => onChange(field.id, e.target.value)}
      >
        <option value="">请选择...</option>
        {field.options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function GroupField({ field, formValues, errors, onFieldChange }) {
  const childFields = field.visibleChildFields || field.fields || [];

  return (
    <div className="field-group">
      <div className="group-title">{field.label}</div>
      <div className="group-content">
        <FormRenderer
          fields={childFields}
          formValues={formValues}
          errors={errors}
          onFieldChange={onFieldChange}
        />
      </div>
    </div>
  );
}

function FieldRenderer({ field, formValues, errors, onFieldChange }) {
  const value = formValues[field.id];
  const error = errors[field.id];

  const handleChange = (id, val) => {
    onFieldChange(id, val);
  };

  switch (field.type) {
    case 'text':
      return <TextField field={field} value={value} error={error} onChange={handleChange} />;
    case 'textarea':
      return <TextAreaField field={field} value={value} error={error} onChange={handleChange} />;
    case 'number':
      return <NumberField field={field} value={value} error={error} onChange={handleChange} />;
    case 'radio':
      return <RadioField field={field} value={value} error={error} onChange={handleChange} />;
    case 'checkbox':
      return <CheckboxField field={field} value={value} error={error} onChange={handleChange} />;
    case 'select':
      return <SelectField field={field} value={value} error={error} onChange={handleChange} />;
    case 'group':
      return <GroupField field={field} formValues={formValues} errors={errors} onFieldChange={handleChange} />;
    default:
      return null;
  }
}

const MemoFieldRenderer = memo(FieldRenderer);

function FormRenderer({ fields, formValues, errors, onFieldChange }) {
  const sortedFields = [...fields].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="form-renderer">
      {sortedFields.map(field => (
        <MemoFieldRenderer
          key={field.id}
          field={field}
          formValues={formValues}
          errors={errors}
          onFieldChange={onFieldChange}
        />
      ))}
    </div>
  );
}

export default memo(FormRenderer);
