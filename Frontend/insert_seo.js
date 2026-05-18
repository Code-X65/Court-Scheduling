const fs = require('fs');
const path = require('path');

const pages = [
  { file: 'Login.jsx', title: 'Sign In', description: 'Secure sign-in portal for Court Scheduling System.' },
  { file: 'Dashboard.jsx', title: 'Dashboard', description: 'Overview of court cases, judge assignments, and scheduling metrics.', schema: { "@context": "https://schema.org", "@type": "WebPage", "name": "Dashboard" } },
  { file: 'Cases.jsx', title: 'Cases', description: 'View and manage all court cases.', schema: { "@context": "https://schema.org", "@type": "Organization", "name": "Court System - Cases" } },
  { file: 'Judges.jsx', title: 'Judges', description: 'Browse and assign court judges.', schema: { "@context": "https://schema.org", "@type": "Organization", "name": "Court System - Judges" } },
  { file: 'Courtrooms.jsx', title: 'Courtrooms', description: 'Manage courtrooms and their availability.', schema: { "@context": "https://schema.org", "@type": "Organization", "name": "Court System - Courtrooms" } },
  { file: 'Schedule.jsx', title: 'Schedule', description: 'Court hearing schedule and time-slot management.', schema: { "@context": "https://schema.org", "@type": "Organization", "name": "Court System - Schedule" } },
  { file: 'AIInsights.jsx', title: 'AI Insights', description: 'AI-driven analytics and recommendations for court scheduling.', schema: { "@context": "https://schema.org", "@type": "WebPage", "name": "AI Insights" } },
  { file: 'Profile.jsx', title: 'Profile', description: 'User profile settings for Court Scheduling System.' },
  { file: 'Users.jsx', title: 'Users', description: 'Manage court system users and roles.' },
  { file: 'Calendar.jsx', title: 'Calendar', description: 'Interactive court calendar view.', schema: { "@context": "https://schema.org", "@type": "Organization", "name": "Court System - Calendar" } },
  { file: 'Reports.jsx', title: 'Reports', description: 'Analytics reports and performance dashboards.', schema: { "@context": "https://schema.org", "@type": "Organization", "name": "Court System - Reports" } },
  { file: 'Settings.jsx', title: 'Settings', description: 'Application configuration and preferences.' },
  { file: 'GapAnalysis.jsx', title: 'Gap Analysis', description: 'Identify unassigned court time slots.', schema: { "@context": "https://schema.org", "@type": "Organization", "name": "Court System - Gap Analysis" } }
];

const basePath = path.join(__dirname, 'src', 'pages');

pages.forEach(page => {
  const filePath = path.join(basePath, page.file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${page.file} - not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has PageSEO
  if (content.includes('PageSEO')) {
    console.log(`Skipping ${page.file} - already has PageSEO`);
    return;
  }

  // Insert import at the top
  const importStatement = `import PageSEO from '../seo/PageSEO.jsx';\n`;
  content = importStatement + content;

  // Find the first component return statement (crude but usually works for our patterns)
  // We'll look for `return (` and insert the PageSEO component right after it.
  
  const returnRegex = /(return\s*\(\s*<[A-Za-z]+[^>]*>)/;
  
  let schemaAttr = '';
  if (page.schema) {
    schemaAttr = ` structuredData={${JSON.stringify(page.schema)}}`;
  }
  
  const seoTag = `\n      <PageSEO title="${page.title}" description="${page.description}"${schemaAttr} />`;

  // Wait, if it returns a Fragment `<>`, the regex needs to catch it
  const returnRegexFrag = /(return\s*\(\s*<>)/;
  
  if (returnRegexFrag.test(content)) {
     content = content.replace(returnRegexFrag, `$1${seoTag}`);
  } else if (returnRegex.test(content)) {
     content = content.replace(returnRegex, `$1${seoTag}`);
  } else {
     // If regex fails, let's just find the first `return (`
     content = content.replace(/(return\s*\()/i, `$1\n      <>` + seoTag).replace(/}\s*$/i, `\n      </>\n    )\n}`); // Too risky
     console.log(`Manual check needed for ${page.file}`);
  }

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${page.file}`);
});
