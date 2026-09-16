const fs = require("fs");
const path = require("path");
const dataPath = path.join(__dirname, "../data/notifications.json");

const Notification = {
  getAll: () => {
    if (!fs.existsSync(dataPath))
      fs.writeFileSync(dataPath, JSON.stringify([]));
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  },
  saveAll: (data) => {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  },
  create: (notif) => {
    const data = Notification.getAll();
    const newNotif = {
      id: Date.now().toString(),
      ...notif,
      read: false,
      createdAt: new Date(),
    };
    data.push(newNotif);
    Notification.saveAll(data);
    return newNotif;
  },
  createMany: (notifs) => {
    const data = Notification.getAll();
    const newNotifs = notifs.map((notif, i) => ({
      id: (Date.now() + i).toString(),
      ...notif,
      read: false,
      createdAt: new Date(),
    }));
    data.push(...newNotifs);
    Notification.saveAll(data);
    return newNotifs;
  },
  findByUserId: (userId) => {
    const data = Notification.getAll();
    return data.filter((n) => n.userId === userId);
  },
  markAsRead: (id) => {
    const data = Notification.getAll();
    const index = data.findIndex((n) => n.id === id);
    if (index !== -1) {
      data[index].read = true;
      Notification.saveAll(data);
      return data[index];
    }
    return null;
  },
};

module.exports = Notification;
