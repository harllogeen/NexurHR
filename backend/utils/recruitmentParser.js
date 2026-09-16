const parseResumeText = (text = '') => {
  const normalizedText = text.toLowerCase();
  const nameMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

  const skillKeywords = [
    'angular', 'react', 'node.js', 'express', 'typescript', 'javascript', 'sql', 'mongodb', 'python', 'java',
    'figma', 'ux', 'ui', 'leadership', 'communication', 'project management', 'agile', 'testing', 'docker'
  ];

  const skills = skillKeywords.filter((skill) => normalizedText.includes(skill));

  return {
    name: nameMatch ? nameMatch[1] : '',
    email: emailMatch ? emailMatch[0] : '',
    skills,
  };
};

module.exports = {
  parseResumeText,
};
