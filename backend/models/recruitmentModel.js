const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/recruitment.json');

const getCandidates = () => {
    if (!fs.existsSync(dataPath)) {
        return [];
    }
    const jsonData = fs.readFileSync(dataPath);
    return JSON.parse(jsonData);
};

const saveCandidates = (candidates) => {
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dataPath, JSON.stringify(candidates, null, 2));
};

module.exports = { getCandidates, saveCandidates };
