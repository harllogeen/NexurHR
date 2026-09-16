const Performance = require("../models/performanceModel");

exports.createGoal = (req, res) => {
  try {
    const goal = Performance.create({
      userId: req.body.userId || req.user.id,
      title: req.body.title,
      description: req.body.description,
      deadline: req.body.deadline,
      status: req.body.status || "Proposed",
      type: req.body.type || "Goal",
      reviewCycle: req.body.reviewCycle || "Quarterly",
      progress: req.body.progress || 0,
      keyResults: req.body.keyResults || [],
      selfReview: req.body.selfReview || "",
      managerReview: req.body.managerReview || "",
      rating: req.body.rating || null,
      comments: req.body.comments || "",
      history: req.body.history || [],
      peerFeedbacks: req.body.peerFeedbacks || []
    });
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyPerformance = (req, res) => {
  try {
    const data = Performance.findByUserId(req.user.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllPerformance = (req, res) => {
  try {
    const data = Performance.getAll();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePerformance = (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.selfReview || updates.managerReview || updates.rating || updates.comments) {
      const existing = Performance.getAll().find((item) => item.id === req.params.id);
      const history = Array.isArray(existing?.history) ? [...existing.history] : [];
      history.push({
        updatedAt: new Date().toISOString(),
        selfReview: updates.selfReview || existing?.selfReview || "",
        managerReview: updates.managerReview || existing?.managerReview || "",
        rating: updates.rating || existing?.rating || null,
        comments: updates.comments || existing?.comments || "",
      });
      updates.history = history;
    }

    const updated = Performance.update(req.params.id, updates);
    if (updated) res.json(updated);
    else res.status(404).json({ message: "Record not found" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addFeedback = (req, res) => {
  try {
    const existing = Performance.getAll().find((item) => item.id === req.params.id);
    if (!existing) return res.status(404).json({ message: "Record not found" });

    const feedbacks = Array.isArray(existing.peerFeedbacks) ? [...existing.peerFeedbacks] : [];
    feedbacks.push({
      reviewerId: req.user.id, // we might want to keep it anonymous to the user, but we store it
      reviewerName: req.user.username || "Anonymous Peer", 
      feedback: req.body.feedback,
      date: new Date().toISOString()
    });

    const updated = Performance.update(req.params.id, { peerFeedbacks: feedbacks });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTeamPerformance = (req, res) => {
  try {
    const allData = Performance.getAll();
    // Return goals that don't belong to the current user
    const teamData = allData.filter((p) => p.userId !== req.user.id);
    
    // Strip sensitive fields for peer review visibility
    const safeData = teamData.map(p => ({
      id: p.id,
      userId: p.userId,
      title: p.title,
      description: p.description,
      status: p.status,
      deadline: p.deadline,
      progress: p.progress,
      keyResults: p.keyResults || [],
      // Do not include selfReview, managerReview, rating, or history
    }));
    
    res.json(safeData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
