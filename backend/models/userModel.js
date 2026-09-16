const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/users.json');

const getUsers = () => {
    if (!fs.existsSync(dataPath)) {
        return [];
    }
    const jsonData = fs.readFileSync(dataPath);
    return JSON.parse(jsonData);
};

const getUserByEmployeeId = (employeeId) => {
    const users = getUsers();
    return users.find(u => u.employeeId == employeeId);
};

const saveUsers = (users) => {
    const stringifyData = JSON.stringify(users, null, 2);
    fs.writeFileSync(dataPath, stringifyData);
};

module.exports = {
    getUsers,
    getUserByEmployeeId,
    saveUsers
};
