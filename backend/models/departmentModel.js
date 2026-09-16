const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/departments.json');

const getDepartments = () => {
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

const saveDepartments = (departments) => {
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dataPath, JSON.stringify(departments, null, 2));
};

module.exports = { getDepartments, saveDepartments };
