const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/activities.json');

const getActivities = () => {
    if (!fs.existsSync(dataPath)) {
        return [];
    }
    const jsonData = fs.readFileSync(dataPath);
    return JSON.parse(jsonData);
};

const saveActivities = (activities) => {
    const stringifyData = JSON.stringify(activities, null, 2);
    fs.writeFileSync(dataPath, stringifyData);
};

// Log activity
const logActivity = (activityData) => {
    const activities = getActivities();
    const newActivity = {
        id: Date.now(),
        userId: activityData.userId,
        action: activityData.action,
        category: activityData.category || 'general',
        description: activityData.description,
        metadata: activityData.metadata || {},
        timestamp: new Date().toISOString()
    };
    activities.push(newActivity);
    saveActivities(activities);
    return newActivity;
};

module.exports = {
    getActivities,
    saveActivities,
    logActivity
};
