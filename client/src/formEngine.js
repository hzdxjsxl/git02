const OPERATORS = {
  '==': (a, b) => a == b,
  '!=': (a, b) => a != b,
  '>': (a, b) => Number(a) > Number(b),
  '>=': (a, b) => Number(a) >= Number(b),
  '<': (a, b) => Number(a) < Number(b),
  '<=': (a, b) => Number(a) <= Number(b)
};

function evaluateCondition(condition, formValues) {
  if (!condition) return true;

  if (condition.and) {
    return condition.and.every(cond => evaluateCondition(cond, formValues));
  }

  if (condition.or) {
    return condition.or.some(cond => evaluateCondition(cond, formValues));
  }

  if (condition.not) {
    return !evaluateCondition(condition.not, formValues);
  }

  const { field, equals, operator, value, contains } = condition;
  const fieldValue = formValues[field];

  if (equals !== undefined) {
    return fieldValue == equals;
  }

  if (operator && value !== undefined) {
    const op = OPERATORS[operator];
    if (op && fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
      return op(fieldValue, value);
    }
    return false;
  }

  if (contains !== undefined) {
    if (Array.isArray(fieldValue)) {
      return fieldValue.includes(contains);
    }
    return fieldValue && String(fieldValue).includes(contains);
  }

  return true;
}

function shouldShowField(field, formValues) {
  if (!field.showWhen) return true;
  return evaluateCondition(field.showWhen, formValues);
}

function getDefaultValue(field) {
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'number':
      return '';
    case 'radio':
    case 'select':
      return '';
    case 'checkbox':
      return [];
    case 'group':
      return {};
    default:
      return '';
  }
}

function initFormValues(fields) {
  const values = {};
  fields.forEach(field => {
    values[field.id] = getDefaultValue(field);
    if (field.type === 'group' && field.fields) {
      Object.assign(values, initFormValues(field.fields));
    }
  });
  return values;
}

function collectAllFields(fields, result = []) {
  fields.forEach(field => {
    result.push(field);
    if (field.type === 'group' && field.fields) {
      collectAllFields(field.fields, result);
    }
  });
  return result;
}

function flattenForValidation(fields) {
  const map = {};
  fields.forEach(field => {
    map[field.id] = field;
    if (field.type === 'group' && field.fields) {
      Object.assign(map, flattenForValidation(field.fields));
    }
  });
  return map;
}

function validateVisibleFields(fields, formValues, flatMap) {
  const errors = {};

  function validateRecursive(currentFields) {
    currentFields.forEach(field => {
      if (!shouldShowField(field, formValues)) return;

      if (field.required) {
        const value = formValues[field.id];
        if (value === '' || value === null || value === undefined) {
          errors[field.id] = '此项为必填项';
        } else if (Array.isArray(value) && value.length === 0) {
          errors[field.id] = '请至少选择一项';
        }
      }

      if (field.type === 'group' && field.fields) {
        validateRecursive(field.fields);
      }
    });
  }

  validateRecursive(fields);
  return errors;
}

function parseFormSchema(schema, formValues) {
  const visibleFields = [];

  function parseFields(fields) {
    fields.forEach(field => {
      if (shouldShowField(field, formValues)) {
        const parsedField = { ...field };

        if (field.type === 'group' && field.fields) {
          parsedField.visibleChildFields = parseFields(field.fields);
        }

        visibleFields.push(parsedField);
      }
    });

    return visibleFields;
  }

  parseFields(schema.fields);
  return {
    ...schema,
    visibleFields,
    flatMap: flattenForValidation(schema.fields),
    allFields: collectAllFields(schema.fields)
  };
}

export {
  evaluateCondition,
  shouldShowField,
  getDefaultValue,
  initFormValues,
  collectAllFields,
  flattenForValidation,
  validateVisibleFields,
  parseFormSchema
};
