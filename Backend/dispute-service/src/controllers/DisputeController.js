const { Dispute } = require('../models');

const getAllDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.findAll();
    res.json(disputes);
  } catch (error) {
    res.status(500).send('Error retrieving disputes');
  }
};

const createDispute = async (req, res) => {
  try {
    const dispute = await Dispute.create(req.body);
    res.status(201).json(dispute);
  } catch (error) {
    res.status(500).send('Error creating dispute');
  }
};

module.exports = {
  createDispute,
  getAllDisputes
};

