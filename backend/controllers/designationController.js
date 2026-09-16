const { getDesignations, saveDesignations } = require('../models/designationModel');

const getAllDesignations = (req, res) => {
    const designations = getDesignations();
    res.status(200).json(designations);
};

const createDesignation = (req, res) => {
    const { title, department, grade } = req.body;
    
    if (!title || !department) {
        return res.status(400).json({ message: 'Title and Department are required' });
    }

    const designations = getDesignations();
    
    // Check key if needed, or allow duplicates? Better unique titles per dept?
    // Let's assume unique title globally for simplicity or allow duplicates
    
    const newDesignation = {
        id: Date.now(),
        title,
        department,
        grade: grade || 'N/A',
        createdAt: new Date().toISOString()
    };

    designations.push(newDesignation);
    saveDesignations(designations);

    res.status(201).json({ message: 'Designation created successfully', designation: newDesignation });
};

const deleteDesignation = (req, res) => {
    const { id } = req.params;
    const designations = getDesignations();
    const filteredDesignations = designations.filter(d => d.id != id);

    if (designations.length === filteredDesignations.length) {
        return res.status(404).json({ message: 'Designation not found' });
    }

    saveDesignations(filteredDesignations);
    res.status(200).json({ message: 'Designation deleted successfully' });
};

const updateDesignation = (req, res) => {
    const { id } = req.params;
    const { title, department, grade } = req.body;
    const designations = getDesignations();
    const index = designations.findIndex(d => d.id == id);

    if (index === -1) {
        return res.status(404).json({ message: 'Designation not found' });
    }

    const updatedDesignation = {
        ...designations[index],
        title: title || designations[index].title,
        department: department || designations[index].department,
        grade: grade || designations[index].grade
    };

    designations[index] = updatedDesignation;
    saveDesignations(designations);

    res.status(200).json({ message: 'Designation updated successfully', designation: updatedDesignation });
};

module.exports = { getAllDesignations, createDesignation, deleteDesignation, updateDesignation };
