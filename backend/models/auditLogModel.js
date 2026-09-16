const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/auditLogs.json');

const ensureFile = () => {
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify([], null, 2));
  }
};

const getAuditLogs = () => {
  ensureFile();
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
};

const saveAuditLogs = (logs) => {
  ensureFile();
  fs.writeFileSync(dataPath, JSON.stringify(logs, null, 2));
};

const recordAuditLog = (entry) => {
  const logs = getAuditLogs();
  const newEntry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  logs.push(newEntry);
  saveAuditLogs(logs);
  return newEntry;
};

module.exports = {
  getAuditLogs,
  saveAuditLogs,
  recordAuditLog,
};
