const express = require('express');
const router = express.Router();
const { getAllDepartments, createDepartment, deleteDepartment, updateDepartment } = require('../controllers/departmentController');

router.get('/', getAllDepartments);
router.post('/', createDepartment);
router.put('/:id', updateDepartment);
router.delete('/:id', deleteDepartment);

module.exports = router;
