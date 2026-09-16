const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "../data/payrollConfig.json");

const getPayrollConfig = () => {
  if (!fs.existsSync(dataPath)) {
    return [];
  }
  const jsonData = fs.readFileSync(dataPath);
  try {
    return JSON.parse(jsonData);
  } catch (e) {
    return [];
  }
};

const savePayrollConfig = (config) => {
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dataPath, JSON.stringify(config, null, 2));
};

const getEmployeeConfig = (employeeId) => {
  const configs = getPayrollConfig();
  return configs.find((c) => c.employeeId == employeeId) || null;
};

const upsertEmployeeConfig = (employeeId, configData) => {
  const configs = getPayrollConfig();
  const existingIndex = configs.findIndex((c) => c.employeeId == employeeId);

  const newConfig = {
    employeeId,
    ...configData,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    configs[existingIndex] = { ...configs[existingIndex], ...newConfig };
  } else {
    newConfig.createdAt = new Date().toISOString();
    configs.push(newConfig);
  }

  savePayrollConfig(configs);
  return existingIndex >= 0 ? configs[existingIndex] : newConfig;
};

module.exports = {
  getPayrollConfig,
  savePayrollConfig,
  getEmployeeConfig,
  upsertEmployeeConfig,
};
