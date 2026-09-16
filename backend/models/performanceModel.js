const fs = require("fs");
const path = require("path");
const dataPath = path.join(__dirname, "../data/performance.json");

const Performance = {
  getAll: () => {
    if (!fs.existsSync(dataPath))
      fs.writeFileSync(dataPath, JSON.stringify([]));
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  },
  saveAll: (data) => {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  },
  create: (perf) => {
    const data = Performance.getAll();
    const newPerf = {
      id: Date.now().toString(),
      ...perf,
      createdAt: new Date(),
    };
    data.push(newPerf);
    Performance.saveAll(data);
    return newPerf;
  },
  findByUserId: (userId) => {
    const data = Performance.getAll();
    return data.filter((p) => p.userId === userId);
  },
  update: (id, updates) => {
    const data = Performance.getAll();
    const index = data.findIndex((p) => p.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...updates, updatedAt: new Date() };
      Performance.saveAll(data);
      return data[index];
    }
    return null;
  },
};

module.exports = Performance;
