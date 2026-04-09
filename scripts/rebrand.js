const fs = require('fs');
const path = require('path');

// Get arguments from command line
const args = process.argv.slice(2);
const deptName = args[0] || 'Department of the Prime Minister and Cabinet';
const shortName = args[1] || 'PM&C';
const riskLevel = args[2] || 'low'; // low, medium, high

const brandingPath = path.join(__dirname, '..', 'public', 'branding.json');

const config = {
  countryLine: "Commonwealth of Australia",
  systemName: "Secure Collaboration Portal",
  departmentFull: deptName,
  shortName: shortName,
  loginTitle: "Privileged Access Sign‑in",
  loginBlurb: `This system is restricted to authorised ${deptName} personnel. Unauthorised access is prohibited.`,
  google_analytics_key: "G-ABC123XYZ_SECRET_456"
};

// Adjust colors based on "risk level" for demo impact
if (riskLevel === 'high') {
  config.accentColor = "#ef4444"; // Red
  config.headerStart = "#450a0a";
  config.headerEnd = "#7f1d1d";
} else if (riskLevel === 'medium') {
  config.accentColor = "#f59e0b"; // Amber
  config.headerStart = "#451a03";
  config.headerEnd = "#78350f";
} else {
  config.accentColor = "#22c55e"; // Green (Default)
  config.headerStart = "#002a45";
  config.headerEnd = "#004b6b";
}

fs.writeFileSync(brandingPath, JSON.stringify(config, null, 2));
console.log(`Successfully rebranded to: ${deptName} (${riskLevel} risk styling)`);
