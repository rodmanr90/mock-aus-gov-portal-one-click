#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const brandingPath = path.join(__dirname, '..', 'public', 'branding.json');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    args[key] = value;
    if (value !== 'true') i += 1;
  }
  return args;
}

function getInitials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 4)
    .join('');
}

function makeBlurb(departmentFull) {
  return `This system is restricted to authorised ${departmentFull} personnel. Unauthorised access is prohibited.`;
}

function loadBranding() {
  const raw = fs.readFileSync(brandingPath, 'utf8');
  return JSON.parse(raw);
}

function saveBranding(config) {
  fs.writeFileSync(brandingPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

async function askQuestion(rl, prompt, defaultValue) {
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  return new Promise((resolve) => {
    rl.question(`${prompt}${suffix}: `, (answer) => {
      const value = answer.trim();
      resolve(value || defaultValue || '');
    });
  });
}

async function interactiveMode(currentConfig) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const departmentFull = await askQuestion(rl, 'Department full name', currentConfig.departmentFull);
    const shortDefault = currentConfig.shortName || getInitials(departmentFull);
    const shortName = await askQuestion(rl, 'Short name / crest initials', shortDefault);
    const systemName = await askQuestion(rl, 'System name', currentConfig.systemName);
    const loginTitle = await askQuestion(rl, 'Login title', currentConfig.loginTitle);
    const loginBlurb = await askQuestion(rl, 'Login blurb', makeBlurb(departmentFull));
    const accentColor = await askQuestion(rl, 'Accent color hex', currentConfig.accentColor);
    const headerStart = await askQuestion(rl, 'Header gradient start hex', currentConfig.headerStart);
    const headerEnd = await askQuestion(rl, 'Header gradient end hex', currentConfig.headerEnd);

    return {
      ...currentConfig,
      departmentFull,
      shortName,
      systemName,
      loginTitle,
      loginBlurb,
      accentColor,
      headerStart,
      headerEnd,
    };
  } finally {
    rl.close();
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const current = loadBranding();

  if (args.help === 'true' || args.h === 'true') {
    process.stdout.write(
      [
        'Usage:',
        '  npm run rebrand',
        '  npm run rebrand -- --department "Department of Finance" --short "DoF"',
        '',
        'Optional flags:',
        '  --department    Full department name',
        '  --short         Crest initials',
        '  --system        System name',
        '  --login-title   Login heading',
        '  --login-blurb   Login paragraph',
        '  --accent        Accent color hex',
        '  --header-start  Header gradient start color',
        '  --header-end    Header gradient end color',
      ].join('\n')
    );
    return;
  }

  let updated;

  if (Object.keys(args).length === 0) {
    updated = await interactiveMode(current);
  } else {
    const department = args.department || current.departmentFull;
    updated = {
      ...current,
      departmentFull: department,
      shortName: args.short || current.shortName || getInitials(department),
      systemName: args.system || current.systemName,
      loginTitle: args['login-title'] || current.loginTitle,
      loginBlurb: args['login-blurb'] || makeBlurb(department),
      accentColor: args.accent || current.accentColor,
      headerStart: args['header-start'] || current.headerStart,
      headerEnd: args['header-end'] || current.headerEnd,
    };
  }

  saveBranding(updated);
  process.stdout.write(`Updated branding file: ${brandingPath}\n`);
  process.stdout.write(`Department: ${updated.departmentFull}\n`);
  process.stdout.write(`Short name: ${updated.shortName}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});

