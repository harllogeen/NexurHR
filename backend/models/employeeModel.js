const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "../data/employees.json");

const getEmployees = () => {
  if (!fs.existsSync(dataPath)) {
    return [];
  }
  const jsonData = fs.readFileSync(dataPath);
  return JSON.parse(jsonData);
};

// Alias for automation compatibility
const getAllEmployees = () => {
  return getEmployees();
};

const getEmployeeById = (id) => {
  const employees = getEmployees();
  return employees.find(emp => emp.id === id);
};

const saveEmployees = (employees) => {
  // Ensure directory exists
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dataPath, JSON.stringify(employees, null, 2));
};

module.exports = { 
  getEmployees, 
  getAllEmployees,
  getEmployeeById,
  saveEmployees 
};
