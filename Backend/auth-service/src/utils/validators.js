const validateDisputeInput = (data) => {
  const errors = [];
  const required = {
    org_code: 'Organization code',
    work_flow_id: 'Workflow ID',
    template_id: 'Template ID',
    template_type: 'Template type',
    created_by: 'Creator ID',
    priority: 'Priority',
    severity: 'Severity',
    description: 'Description'
  };

  Object.entries(required).forEach(([key, label]) => {
    if (data[key] == null || data[key] === '') {
      errors.push(`${label} is required`);
    }
  });

  if (data.fields && !Array.isArray(data.fields)) {
    errors.push('Fields must be an array');
  }

  return errors;
};

const validateUpdateInput = (data) => {
  const errors = [];
  const required = {
    dispute_id: 'Dispute ID',
    work_flow_id: 'Workflow ID', 
    done_by: 'User ID',
    decision: 'Decision',
    nodeId: 'Node ID'
  };

  Object.entries(required).forEach(([key, label]) => {
    if (!data[key]) {
      errors.push(`${label} is required`);
    }
  });

  if (data.decision && !['approved', 'rejected', 'forward'].includes(data.decision.toLowerCase())) {
    errors.push('Invalid decision value');
  }

  return errors;
};

module.exports = {
  validateDisputeInput,
  validateUpdateInput
};
