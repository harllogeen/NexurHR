const fs = require("fs");
const path = require("path");
const dataPath = path.join(__dirname, "../data/tasks.json");

const Task = {
  getAll: () => {
    if (!fs.existsSync(dataPath))
      fs.writeFileSync(dataPath, JSON.stringify([]));
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  },
  saveAll: (data) => {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  },
  create: (task) => {
    const data = Task.getAll();
    const newTask = {
      id: Date.now().toString(),
      ...task,
      status: task.status || "pending",
      progress: task.progress || 0,
      subtasks: task.subtasks || [],
      comments: task.comments || [],
      attachments: task.attachments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };
    data.push(newTask);
    Task.saveAll(data);
    return newTask;
  },
  findById: (id) => {
    const data = Task.getAll();
    return data.find((t) => t.id === id);
  },
  findByAssignedTo: (userId) => {
    const data = Task.getAll();
    return data.filter((t) => {
      if (Array.isArray(t.assignedTo)) {
        return t.assignedTo.some(id => String(id) === String(userId));
      }
      return String(t.assignedTo) === String(userId);
    });
  },
  findByAssignedBy: (userId) => {
    const data = Task.getAll();
    return data.filter((t) => String(t.assignedBy) === String(userId));
  },
  update: (id, updates) => {
    const data = Task.getAll();
    const index = data.findIndex((t) => t.id === id);
    if (index !== -1) {
      data[index] = {
        ...data[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      Task.saveAll(data);
      return data[index];
    }
    return null;
  },
  delete: (id) => {
    const data = Task.getAll();
    const index = data.findIndex((t) => t.id === id);
    if (index !== -1) {
      const deleted = data.splice(index, 1);
      Task.saveAll(data);
      return deleted[0];
    }
    return null;
  },
};

module.exports = Task;
