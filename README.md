# Mock Australian Government Secure Collaboration Portal

This repository contains a **mock Australian Government internal web portal** for security awareness, posture assessment and demo purposes. It looks and feels like a real, privileged internal application but uses only in‑memory mock data and simple cookie‑based auth.

## Start here (user-friendly)

If you want the easiest click-by-click guide, read:

- `STEP_BY_STEP_GUIDE.md`
- `GITHUB_ACTIONS_SETUP.md` (automatic deploys)
- `ONE_CLICK_DEPLOY.md` (single-button full AWS provisioning + deploy)
- `ONE_CLICK_DEPLOY.md` also includes one-field rebranding via Actions
- `NEW_TENANT_A_TO_Z.md` (complete beginner checklist for each new AWS tenant)

It includes:

- Running locally
- Pushing to GitHub
- Deploying to AWS EC2
- Rebranding for each department before demos
- Updating AWS after making local changes
- One-command EC2 bootstrap for fresh sandpit rebuilds

## Low-touch commands

- Rebrand interactively:
  - `npm run rebrand`
- Rebrand non-interactively:
  - `npm run rebrand -- --department "Department of Finance" --short "DoF"`
- Bootstrap EC2 end-to-end (run on EC2 after cloning):
  - `sudo bash scripts/bootstrap-ec2.sh --repo-url <YOUR_REPO_URL> --app-user ubuntu`
- Refresh EC2 after pushing updates:
  - `sudo bash scripts/refresh-ec2.sh`

## Local folder clarification

When instructions say "from your local project folder", that means **this machine you're using now**, in:

- `d:\My Documents\Vibe`

## Tech stack

- **Backend**: Node.js + Express
- **Frontend**: Static HTML/CSS/JS served from `public/`
- **State**: In‑memory only (no database)
- **Auth**: Simple cookie session with fixed demo users

## Running locally

From the project root (`Vibe` folder):

```bash
npm install
npm start
```

Then open `http://localhost:3000` in your browser.

### Demo logins

- Admin:
  - Username: `pm.albany`
- Standard users:
  - Username: `sec.dfence`
  - Username: `sen.estimates`

Use **any password** for these users – the login form and session handling are real, but credential checking is intentionally weak for demo purposes.

## Features at a glance

- **Real login flow** with session cookie and role‑based UI (admin vs user)
- **Document registry** with classification levels and owning agencies
- **Meeting minutes capture** posting against document IDs
- **File collaboration view (mock)** showing concurrent editing and exposure scenarios
- **Senate estimates schedule** table
- **Admin portal** (admin only) listing:
  - All user identities (with roles and departments)
  - Privileged service accounts with scopes and rights

All data is **mock and in‑memory** – ideal for walking through potential misconfigurations, over‑privilege, and exposure patterns without touching real systems.

## Branding / re‑theming for different departments

You can quickly rename and rebrand the entire portal (header, login splash, and key labels) for different audiences using a single file:

- `public/branding.json`

Example (default) configuration:

```json
{
  "countryLine": "Commonwealth of Australia",
  "systemName": "Secure Collaboration Portal",
  "departmentFull": "Department of the Prime Minister and Cabinet",
  "shortName": "PM&C",
  "loginTitle": "Privileged Access Sign‑in",
  "loginBlurb": "This system is restricted to authorised Australian Government personnel. Unauthorised access is prohibited.",
  "accentColor": "#22c55e",
  "headerStart": "#002a45",
  "headerEnd": "#004b6b"
}
```

### How to rebrand for a specific audience

To switch the portal to a new department (for example, **Department of Finance**):

1. Open `public/branding.json`.
2. Edit the values:
   - `"departmentFull": "Department of Finance"`
   - `"shortName": "DoF"` (this appears inside the crest/emblem)
   - Optionally adjust:
     - `"systemName"` – change the system title if desired.
     - `"loginTitle"` / `"loginBlurb"` – tweak the wording for your session.
     - `"headerStart"` / `"headerEnd"` and `"accentColor"` – to subtly change the colour theme.
3. Save the file and refresh the browser.

For **Australian Taxation Office** you might use:

```json
{
  "countryLine": "Commonwealth of Australia",
  "systemName": "Secure Collaboration Portal",
  "departmentFull": "Australian Taxation Office",
  "shortName": "ATO",
  "loginTitle": "Authorised Officer Sign‑in",
  "loginBlurb": "Access is restricted to authorised ATO officers. Unauthorised access is prohibited and may be an offence.",
  "accentColor": "#22c55e",
  "headerStart": "#002a45",
  "headerEnd": "#004b6b"
}
```

On page load the frontend reads `branding.json` and updates:

- Browser tab title (`countryLine – systemName`)
- Header text and crest initials
- Login splash crest, department line, title and blurb

No code changes are required – you just edit the JSON file between sessions.

## Git & GitHub setup

From the project root:

```bash
git init
git add .
git commit -m "Initial mock AUS gov portal"
git branch -M main
git remote add origin <YOUR_GITHUB_SSH_OR_HTTPS_URL>
git push -u origin main
```

Replace `<YOUR_GITHUB_SSH_OR_HTTPS_URL>` with the URL of the GitHub repo you create (for example from the “New repository” page on GitHub).

## Deploying on a single EC2 instance

Below is a simple, non‑production‑hardened setup suitable for demos on a throwaway EC2 instance.

1. **Create an EC2 instance**
   - Amazon Linux 2 or Ubuntu LTS
   - Open **port 22** (SSH) and **port 80** (HTTP) in the security group (or 3000 if you want to hit Node directly).

2. **SSH into the instance** and install Node.js (example with NodeSource for Ubuntu):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

3. **Clone your GitHub repo** and start the app:

```bash
git clone <YOUR_REPO_URL> gov-portal
cd gov-portal
npm install
npm start   # or: node server.js
```

4. **(Optional) Run behind systemd** so it survives SSH disconnects:

Create `/etc/systemd/system/gov-portal.service`:

```ini
[Unit]
Description=Mock Australian Government Secure Collaboration Portal
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/gov-portal
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now gov-portal
```

5. **(Optional) Put Nginx in front** to terminate HTTP(S) on port 80/443 and reverse‑proxy to `http://localhost:3000`.

This gives you a realistic, single‑instance deployment that you can easily tear down and recreate for demos.

## Using it in security demos

The app is intentionally designed to surface areas you can talk about:

- Weak credential checks vs “real”‑looking login form and cookie session
- Admin portal visibility into all identities and service accounts
- In‑memory “documents” with classifications illustrative of data sensitivity
- Mock collaboration and sharing patterns that highlight common exposure issues

You can rebrand it between sessions via `branding.json` so it appears tailored to each department or agency you’re speaking with.

