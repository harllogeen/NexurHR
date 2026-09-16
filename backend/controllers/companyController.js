const Company = require("../models/companyModel");

exports.getCompany = (req, res) => {
  try {
    const data = Company.get();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCompany = (req, res) => {
  try {
    const updated = Company.update(req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
