const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/sessions.json');

const ensureFile = () => {
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify([], null, 2));
  }
};

const getSessions = () => {
  ensureFile();
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
};

const saveSessions = (sessions) => {
  ensureFile();
  fs.writeFileSync(dataPath, JSON.stringify(sessions, null, 2));
};

const createSession = (session) => {
  const sessions = getSessions();
  const newSession = {
    id: session.id || Date.now().toString(),
    userId: session.userId,
    refreshToken: session.refreshToken,
    createdAt: session.createdAt || new Date().toISOString(),
    lastActiveAt: session.lastActiveAt || new Date().toISOString(),
    revoked: false,
    userAgent: session.userAgent || 'Unknown',
    ipAddress: session.ipAddress || 'Unknown',
  };
  sessions.push(newSession);
  saveSessions(sessions);
  return newSession;
};

const updateSession = (id, updates) => {
  const sessions = getSessions();
  const index = sessions.findIndex((entry) => entry.id === id);
  if (index === -1) return null;
  sessions[index] = { ...sessions[index], ...updates, lastActiveAt: new Date().toISOString() };
  saveSessions(sessions);
  return sessions[index];
};

const revokeSession = (id) => {
  return updateSession(id, { revoked: true });
};

const findSessionByRefreshToken = (refreshToken) => {
  const sessions = getSessions();
  return sessions.find((entry) => entry.refreshToken === refreshToken);
};

const listSessionsForUser = (userId) => {
  const sessions = getSessions();
  return sessions.filter((entry) => entry.userId === userId);
};

module.exports = {
  getSessions,
  saveSessions,
  createSession,
  updateSession,
  revokeSession,
  findSessionByRefreshToken,
  listSessionsForUser,
};
