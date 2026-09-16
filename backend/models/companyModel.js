const fs = require("fs");
const path = require("path");
const dataPath = path.join(__dirname, "../data/company.json");

const Company = {
  get: () => {
    if (!fs.existsSync(dataPath)) {
      const initial = {
        name: "HR App Corp",
        address: "",
        email: "",
        phone: "",
        website: "",
        logo: "",
        policies: {
          workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          workingHours: { start: "09:00", end: "17:00" },
          leaveTypes: ["Annual", "Sick", "Unpaid"],
        },
      };
      fs.writeFileSync(dataPath, JSON.stringify(initial, null, 2));
    }
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  },
  update: (updates) => {
    const current = Company.get();
    const updated = { ...current, ...updates };
    fs.writeFileSync(dataPath, JSON.stringify(updated, null, 2));
    return updated;
  },
};

module.exports = Company;
