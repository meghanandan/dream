const Template = require('./../models/Template');
console.log('getAllTemplates-test');

// Create a new template
exports.createTemplate = async (req, res) => {
  try {
    const { name, type,resaon_code,commit, availableFields, } = req.body;

    const template = await Template.create({ name, type,resaon_code,commit, availableFields });

    res.status(201).json({ message: 'Template created successfully', data: template });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create template', error: error.message });
  }
};

// Get a specific template by ID
exports.getTemplateById = async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id);

    if (!template) return res.status(404).json({ message: 'Template not found' });

    res.status(200).json({ data: template });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching template', error: error.message });
  }
};

// Update an existing template
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type,resaon_code,commit, availableFields } = req.body;

    const template = await Template.findByPk(id);

    if (!template) return res.status(404).json({ message: 'Template not found' });

    await template.update({ name, type, resaon_code,commit, availableFields });

    res.status(200).json({ message: 'Template updated successfully', data: template });
  } catch (error) {
    res.status(500).json({ message: 'Error updating template', error: error.message });
  }
};

// Delete a template
exports.deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id);

    if (!template) return res.status(404).json({ message: 'Template not found' });

    await template.destroy();

    res.status(200).json({ message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting template', error: error.message });
  }
};

// Get all templates
exports.getAllTemplates = async (req, res) => {
console.log('ddddd');
  try {
    const templates = await Template.findAll();
    res.status(200).json({ data: templates });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching templates', error: error.message });
  }
};
