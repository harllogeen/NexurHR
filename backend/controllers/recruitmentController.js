const fs = require('fs');
const path = require('path');
const { getCandidates, saveCandidates } = require('../models/recruitmentModel');
const { sendInterviewEmail } = require('../services/emailService');
const { parseResumeText } = require('../utils/recruitmentParser');

const getAllCandidates = (req, res) => {
    const candidates = getCandidates();
    res.status(200).json(candidates);
};

const calculateMatchScore = (role, skills) => {
    if (!skills || !skills.length) return 0;
    
    const roleSkills = {
        'Frontend Developer': ['Angular', 'React', 'Vue', 'HTML', 'CSS', 'JavaScript', 'TypeScript'],
        'Backend Developer': ['Node.js', 'Express', 'MongoDB', 'SQL', 'Python', 'Java'],
        'Full Stack Developer': ['Angular', 'React', 'Node.js', 'MongoDB', 'TypeScript', 'Express'],
        'UI/UX Designer': ['Figma', 'Adobe XD', 'Sketch', 'Prototyping', 'Wireframing'],
        'HR Manager': ['Recruitment', 'Communication', 'Management', 'Conflict Resolution']
    };

    const targetSkills = roleSkills[role] || [];
    if (!targetSkills.length) return 50; // Default score if role not defined

    const matched = skills.filter(skill => targetSkills.includes(skill));
    return Math.round((matched.length / targetSkills.length) * 100);
};

const safeParseJSON = (str) => {
    try {
        return JSON.parse(str);
    } catch (err) {
        return null;
    }
};

const parseSkillsInput = (skills, parsedText) => {
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string') {
        let s = skills.trim();
        // Try direct JSON parse first
        if (s.startsWith('[') || s.startsWith('"[')) {
            const parsed = safeParseJSON(s);
            if (Array.isArray(parsed)) return parsed.map(item => String(item).trim()).filter(Boolean);
            // Try unescaping common backslash sequences and parse again
            try {
                const unescaped = s.replace(/\\+/g, '');
                const parsed2 = JSON.parse(unescaped);
                if (Array.isArray(parsed2)) return parsed2.map(item => String(item).trim()).filter(Boolean);
            } catch (e) {
                // fallthrough
            }
        }

        // Fallback: comma-separated
        return s.split(',').map(part => part.replace(/["'\[\]]/g, '').trim()).filter(Boolean);
    }

    // If not provided, try to use parsedText.skills (from resume parser) or empty array
    if (parsedText && Array.isArray(parsedText.skills)) return parsedText.skills;
    return [];
};

const createCandidate = (req, res) => {
    const body = req.body || {};
    const { name, email, role, stage, skills, notes, rating, resumeText } = body;
    
    if (!name || !email || !role) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    let parsedResume = null;
    if (req.file && req.file.path) {
        const resumePath = path.join(process.cwd(), req.file.path);
        if (fs.existsSync(resumePath)) {
            const fileContent = fs.readFileSync(resumePath, 'utf8');
            parsedResume = parseResumeText(fileContent);
        }
    }

    const parsedText = parsedResume || parseResumeText(resumeText || '');
    const parsedSkills = parseSkillsInput(skills, parsedText);
    const candidates = getCandidates();
    const matchScore = calculateMatchScore(role, parsedSkills);
    
    const newCandidate = {
        id: Date.now(),
        name: parsedText.name || name,
        email: parsedText.email || email,
        role,
        stage: stage || 'Applied',
        skills: parsedSkills,
        matchScore,
        notes: notes || '',
        rating: rating || null,
        resumeText: resumeText || (req.file ? req.file.originalname : ''),
        resumeFilename: req.file ? req.file.filename : '',
        appliedDate: new Date().toISOString()
    };

    candidates.push(newCandidate);
    saveCandidates(candidates);

    res.status(201).json({ message: 'Candidate added successfully', candidate: newCandidate });
};

const updateCandidateStage = (req, res) => {
    const { id } = req.params;
    const { stage } = req.body;
    const candidates = getCandidates();
    const index = candidates.findIndex(c => c.id == id);

    if (index === -1) {
        return res.status(404).json({ message: 'Candidate not found' });
    }

    candidates[index].stage = stage;
    saveCandidates(candidates);

    res.status(200).json({ message: 'Candidate stage updated', candidate: candidates[index] });
};

const updateCandidateDetails = (req, res) => {
    const { id } = req.params;
    const { name, email, role, skills, notes, rating } = req.body;
    
    const candidates = getCandidates();
    const index = candidates.findIndex(c => c.id == id);

    if (index === -1) {
        return res.status(404).json({ message: 'Candidate not found' });
    }

    // Update fields
    if (name) candidates[index].name = name;
    if (email) candidates[index].email = email;
    if (role) candidates[index].role = role;
    if (skills !== undefined) {
        const parsed = parseSkillsInput(skills, {});
        candidates[index].skills = parsed;
        // Recalculate match score if role or skills changed
        candidates[index].matchScore = calculateMatchScore(candidates[index].role, candidates[index].skills);
    }
    if (notes !== undefined) candidates[index].notes = notes;
    if (rating !== undefined) candidates[index].rating = rating;

    saveCandidates(candidates);

    res.status(200).json({ message: 'Candidate details updated', candidate: candidates[index] });
};

const autoScheduleInterview = async (req, res) => {
    const { id } = req.params;
    const { date } = req.body; // Get date from request body if provided
    
    console.log(`[AutoSchedule] Request received for ID: ${id}`);
    
    const candidates = getCandidates();
    const index = candidates.findIndex(c => c.id == id);

    if (index === -1) {
        return res.status(404).json({ message: 'Candidate not found' });
    }

    let interviewDate;
    if (date) {
        interviewDate = new Date(date);
        console.log(`[ManualSchedule] Scheduling for provided date: ${interviewDate.toISOString()}`);
    } else {
        // Schedule for a random time in the next 3-7 days
        const daysToAdd = Math.floor(Math.random() * 5) + 3;
        interviewDate = new Date();
        interviewDate.setDate(interviewDate.getDate() + daysToAdd);
        interviewDate.setHours(10 + Math.floor(Math.random() * 6), 0, 0, 0); // 10 AM to 4 PM
        console.log(`[AutoSchedule] Scheduling for random date: ${interviewDate.toISOString()}`);
    }

    candidates[index].interviewDate = interviewDate.toISOString();
    candidates[index].stage = 'Interview'; // Auto-move to interview stage
    saveCandidates(candidates);
    
    // Send Email Notification
    let emailPreviewUrl = null;
    try {
        const result = await sendInterviewEmail(
            candidates[index].email,
            candidates[index].name,
            candidates[index].role,
            interviewDate.toISOString()
        );
        if (result && result.previewUrl) {
            emailPreviewUrl = result.previewUrl;
            console.log(`[Email] Preview URL: ${emailPreviewUrl}`);
        }
    } catch (error) {
        console.error(`[Email] Failed to send email to ${candidates[index].email}:`, error);
    }

    res.status(200).json({ 
        message: 'Interview scheduled successfully', 
        candidate: candidates[index],
        interviewDate: interviewDate.toISOString(),
        emailPreviewUrl // Send this back to frontend
    });
};

const deleteCandidate = (req, res) => {
    const { id } = req.params;
    const candidates = getCandidates();
    const filteredCandidates = candidates.filter(c => c.id != id);

    if (candidates.length === filteredCandidates.length) {
        return res.status(404).json({ message: 'Candidate not found' });
    }

    saveCandidates(filteredCandidates);
    res.status(200).json({ message: 'Candidate deleted successfully' });
};



const checkScheduledInterviews = () => {
    const candidates = getCandidates();
    const now = new Date();
    let updated = false;

    candidates.forEach(candidate => {
        if (candidate.stage === 'Interview' && candidate.interviewDate) {
            const interviewTime = new Date(candidate.interviewDate);
            // If interview time has passed and status is not yet 'Completed'
            if (interviewTime < now && candidate.interviewStatus !== 'Completed') {
                candidate.interviewStatus = 'Completed';
                updated = true;
                console.log(`[Cron] Marked interview for ${candidate.name} as Completed.`);
            }
        }
    });

    if (updated) {
        saveCandidates(candidates);
    }
};

module.exports = { getAllCandidates, createCandidate, updateCandidateStage, updateCandidateDetails, deleteCandidate, autoScheduleInterview, checkScheduledInterviews };
