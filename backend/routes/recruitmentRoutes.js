const express = require('express');
const multer = require('multer');
const router = express.Router();
const recruitmentController = require('../controllers/recruitmentController');

const upload = multer({ dest: 'uploads/resumes/' });

router.get('/', recruitmentController.getAllCandidates);
router.post('/', upload.single('resume'), recruitmentController.createCandidate);
router.put('/:id/stage', recruitmentController.updateCandidateStage);
router.put('/:id/details', recruitmentController.updateCandidateDetails);
router.post('/:id/schedule', recruitmentController.autoScheduleInterview);
router.delete('/:id', recruitmentController.deleteCandidate);

module.exports = router;
