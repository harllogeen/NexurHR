const express = require('express');
const router = express.Router();
const { getAllDesignations, createDesignation, deleteDesignation, updateDesignation } = require('../controllers/designationController');

router.get('/', getAllDesignations);
router.post('/', createDesignation);
router.put('/:id', updateDesignation);
router.delete('/:id', deleteDesignation);

module.exports = router;
