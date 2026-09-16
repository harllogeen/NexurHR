const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "../data/projects.json");

const getProjects = () => {
  if (!fs.existsSync(dataPath)) {
    return [];
  }
  const jsonData = fs.readFileSync(dataPath, "utf8");
  return JSON.parse(jsonData || "[]");
};

const saveProjects = (projects) => {
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dataPath, JSON.stringify(projects, null, 2));
};

module.exports = {
  getProjects,
  saveProjects,
  create: (project) => {
    const projects = getProjects();
    const newProject = {
      id: `proj-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...project,
    };
    projects.push(newProject);
    saveProjects(projects);
    return newProject;
  },
  update: (id, updates) => {
    const projects = getProjects();
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) return null;

    projects[index] = {
      ...projects[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveProjects(projects);
    return projects[index];
  },
  delete: (id) => {
    const projects = getProjects();
    const filtered = projects.filter((p) => p.id !== id);
    saveProjects(filtered);
    return true;
  },
};
