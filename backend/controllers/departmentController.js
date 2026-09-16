const { getDepartments, saveDepartments } = require('../models/departmentModel');
const { getEmployees } = require('../models/employeeModel');

const getAllDepartments = (req, res) => {
    const departments = getDepartments();
    const employees = getEmployees();

    const departmentsWithCount = departments.map(dept => {
        const count = employees.filter(e => e.department === dept.name).length;
        return { ...dept, count };
    });

    res.status(200).json(departmentsWithCount);
};

const createDepartment = (req, res) => {
    const { name, head } = req.body;
    
    if (!name) {
        return res.status(400).json({ message: 'Department name is required' });
    }

    const departments = getDepartments();
    
    if (departments.find(d => d.name.toLowerCase() === name.toLowerCase())) {
        return res.status(400).json({ message: 'Department already exists' });
    }

    const newDepartment = {
        id: Date.now(),
        name,
        head: head || 'Unassigned',
        createdAt: new Date().toISOString()
    };

    departments.push(newDepartment);
    saveDepartments(departments);

    res.status(201).json({ message: 'Department created successfully', department: newDepartment });
};

const deleteDepartment = (req, res) => {
    const { id } = req.params;
    const departments = getDepartments();
    const filteredDepartments = departments.filter(d => d.id != id);

    if (departments.length === filteredDepartments.length) {
        return res.status(404).json({ message: 'Department not found' });
    }

    saveDepartments(filteredDepartments);
    res.status(200).json({ message: 'Department deleted successfully' });
};

const updateDepartment = (req, res) => {
    const { id } = req.params;
    const { name, head } = req.body;
    const departments = getDepartments();
    const departmentIndex = departments.findIndex(d => d.id == id);

    if (departmentIndex === -1) {
        return res.status(404).json({ message: 'Department not found' });
    }

    // Check if name is taken by another department
    if (name && departments.find(d => d.name.toLowerCase() === name.toLowerCase() && d.id != id)) {
        return res.status(400).json({ message: 'Department name already exists' });
    }

    const updatedDepartment = {
        ...departments[departmentIndex],
        name: name || departments[departmentIndex].name,
        head: head || departments[departmentIndex].head
    };

    departments[departmentIndex] = updatedDepartment;
    saveDepartments(departments);

    res.status(200).json({ message: 'Department updated successfully', department: updatedDepartment });
};

module.exports = { getAllDepartments, createDepartment, deleteDepartment, updateDepartment };
