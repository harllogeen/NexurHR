const { getActivities, saveActivities } = require('../models/activityModel');

const logActivity = (req, res) => {
    const { description } = req.body;
    const activities = getActivities();

    const newActivity = {
        id: Date.now(),
        userId: req.userId,
        description,
        timestamp: new Date().toISOString()
    };

    activities.push(newActivity);
    saveActivities(activities);

    res.status(201).json({ message: 'Activity logged successfully' });
};

const getAllActivities = (req, res) => {
    const activities = getActivities();
    res.status(200).json(activities);
};

const getUserActivities = (req, res) => {
    const activities = getActivities();
    const userActivities = activities.filter(a => a.userId === req.userId);
    res.status(200).json(userActivities);
};

module.exports = {
    logActivity,
    getAllActivities,
    getUserActivities
};
