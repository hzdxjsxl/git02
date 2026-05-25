import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { parseFormSchema, initFormValues, validateVisibleFields } from './formEngine.js';
import FormRenderer from './FormRenderer.jsx';

export default function App() {
  const [schema, setSchema] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetch('/api/form-schema')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSchema(data.data);
          setFormValues(initFormValues(data.data.fields));
        } else {
          setError('获取表单配置失败');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const parsedSchema = useMemo(() => {
    if (!schema) return null;
    return parseFormSchema(schema, formValues);
  }, [schema, formValues]);

  const handleFieldChange = useCallback((fieldId, value) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value
    }));

    setValidationErrors(prev => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });

    setSubmitStatus(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!schema) return;

    const errors = validateVisibleFields(schema.fields, formValues);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      setSubmitStatus({ type: 'error', message: '请检查表单中的必填项' });
      return;
    }

    setSubmitStatus({ type: 'submitting', message: '正在提交...' });

    try {
      const res = await fetch('/api/submit-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues)
      });
      const data = await res.json();
      if (data.success) {
        setSubmitStatus({ type: 'success', message: '表单提交成功！', data: data.data });
      } else {
        setSubmitStatus({ type: 'error', message: '提交失败，请重试' });
      }
    } catch (err) {
      setSubmitStatus({ type: 'error', message: `提交错误: ${err.message}` });
    }
  }, [schema, formValues]);

  const handleReset = useCallback(() => {
    if (schema) {
      setFormValues(initFormValues(schema.fields));
      setValidationErrors({});
      setSubmitStatus(null);
    }
  }, [schema]);

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>正在加载表单配置...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="error">
          <h2>❌ 加载失败</h2>
          <p>{error}</p>
          <p className="hint">请确保后端服务已启动 (npm run dev in server/)</p>
        </div>
      </div>
    );
  }

  if (!parsedSchema) return null;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🏥 {parsedSchema.title}</h1>
        <p className="subtitle">{parsedSchema.description}</p>
      </header>

      <div className="form-wrapper">
        <FormRenderer
          fields={parsedSchema.visibleFields}
          formValues={formValues}
          errors={validationErrors}
          onFieldChange={handleFieldChange}
        />
      </div>

      {submitStatus && (
        <div className={`submit-status ${submitStatus.type}`}>
          {submitStatus.type === 'success' && (
            <div>
              <h3>✅ {submitStatus.message}</h3>
              <details>
                <summary>查看提交数据</summary>
                <pre>{JSON.stringify(submitStatus.data, null, 2)}</pre>
              </details>
            </div>
          )}
          {submitStatus.type === 'error' && (
            <h3>⚠️ {submitStatus.message}</h3>
          )}
          {submitStatus.type === 'submitting' && (
            <h3>⏳ {submitStatus.message}</h3>
          )}
        </div>
      )}

      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSubmit}>
          提交表单
        </button>
        <button className="btn btn-secondary" onClick={handleReset}>
          重置表单
        </button>
      </div>
    </div>
  );
}
