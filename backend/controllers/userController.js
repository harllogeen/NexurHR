const User = require('../models/userModel');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, '-password'); // Exclude password
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};
