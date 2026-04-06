# Step-by-Step Guide (GitHub + AWS + Rebrand)

This is a beginner-friendly checklist to get your mock portal:

1. Running on your computer
2. Uploaded to GitHub
3. Running on AWS EC2
4. Rebranded for each department before a demo

---

## Part 1: Run locally (on your Windows machine)

Important: in this guide, "local project folder" means your own computer (the same one you're using now), specifically:

`d:\My Documents\Vibe`

### 1) Open terminal in your project folder

Use PowerShell in:

`d:\My Documents\Vibe`

### 2) Install dependencies

```bash
npm install
```

### 3) Start the app

```bash
npm start
```

### 4) Open it in browser

Go to:

`http://localhost:3000`

### 5) Login

- Admin user: `pm.albany`
- Standard users: `sec.dfence`, `sen.estimates`
- Password: any value

---

## Part 2: Push everything to GitHub

### 1) Create a new repository on GitHub

On GitHub:

- Click **New repository**
- Name it something like: `mock-aus-gov-portal`
- Keep it empty (no README/license/gitignore for now)
- Copy the repo URL (HTTPS is easiest)

Example:

`https://github.com/<your-username>/mock-aus-gov-portal.git`

### 2) Initialize git and push from your project folder

From `d:\My Documents\Vibe`:

```bash
git init
git add .
git commit -m "Initial mock Australian government portal"
git branch -M main
git remote add origin https://github.com/<your-username>/mock-aus-gov-portal.git
git push -u origin main
```

If `git` asks for authentication:

- Sign in with GitHub in your browser, or
- Use a personal access token for HTTPS auth

### 3) Confirm files are online

Refresh your GitHub repo page and confirm files exist:

- `server.js`
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `public/branding.json`
- `README.md`
- `STEP_BY_STEP_GUIDE.md`

---

## Part 3: Launch on AWS EC2 (single instance)

This keeps it simple: one VM, one Node process.

### Fast path (recommended for 21-day sandpit resets)

After creating EC2 and SSH'ing in, you can do almost everything with one bootstrap command:

```bash
sudo bash scripts/bootstrap-ec2.sh --repo-url https://github.com/<your-username>/mock-aus-gov-portal.git --app-user ubuntu --branch main
```

This script will:

- install Node.js, git, and nginx
- clone/update your repo into `/opt/mock-aus-gov-portal`
- install dependencies
- create and start a `gov-portal` systemd service
- configure nginx to proxy port 80 -> app port 3000

Use this fast path whenever your environment is reset.

## 3A) Create EC2

In AWS Console:

1. Open **EC2**
2. Click **Launch instance**
3. Choose:
   - OS: Ubuntu LTS (recommended for easy package commands)
   - Instance: `t3.micro` or `t3.small` for demos
4. Key pair:
   - Create/download a key pair (`.pem`)
5. Security group inbound rules:
   - SSH (22) from your IP
   - HTTP (80) from Anywhere
   - (Optional) TCP 3000 from your IP (for direct testing)
6. Launch instance

## 3B) SSH into EC2

From your local terminal (path where `.pem` is stored):

```bash
ssh -i /path/to/your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

Windows note: if OpenSSH complains about key permissions, use PowerShell/WSL or adjust key permissions accordingly.

## 3C) Install Node.js + Git on EC2

On the EC2 server:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
node -v
npm -v
```

## 3D) Clone your GitHub repo and run

```bash
git clone https://github.com/<your-username>/mock-aus-gov-portal.git
cd mock-aus-gov-portal
npm install
npm start
```

Test in browser:

- `http://<EC2_PUBLIC_IP>:3000`

If this works, continue to make it persistent.

### 3D (Preferred): Run one bootstrap command

Instead of doing 3E and 3F manually, run:

```bash
sudo bash scripts/bootstrap-ec2.sh --repo-url https://github.com/<your-username>/mock-aus-gov-portal.git --app-user ubuntu --branch main
```

Then open:

- `http://<EC2_PUBLIC_IP>`

## 3E) Keep app running after logout (systemd)

Create service file:

```bash
sudo nano /etc/systemd/system/gov-portal.service
```

Paste:

```ini
[Unit]
Description=Mock Australian Government Secure Collaboration Portal
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/mock-aus-gov-portal
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Then run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now gov-portal
sudo systemctl status gov-portal
```

Now the app auto-starts on reboot.

## 3F) Optional: expose on port 80 with Nginx

Install Nginx:

```bash
sudo apt-get update
sudo apt-get install -y nginx
```

Create Nginx site:

```bash
sudo nano /etc/nginx/sites-available/gov-portal
```

Paste:

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/gov-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Then open:

- `http://<EC2_PUBLIC_IP>`

---

## Part 4: Rebrand before each meeting/demo

You only need to edit one file:

- `public/branding.json`

### Easiest way: one command

From your project root, run:

```bash
npm run rebrand
```

This launches a prompt and updates `public/branding.json` for you.

You can also do it in one line:

```bash
npm run rebrand -- --department "Australian Taxation Office" --short "ATO"
```

### 1) Edit branding values

Change:

- `departmentFull` (full department name)
- `shortName` (emblem initials, e.g. `ATO`)
- `loginTitle` and `loginBlurb` (wording on login splash)
- `systemName` if needed
- `headerStart`, `headerEnd`, `accentColor` for theme tweak

### 2) Example: Department of Finance

```json
{
  "countryLine": "Commonwealth of Australia",
  "systemName": "Secure Collaboration Portal",
  "departmentFull": "Department of Finance",
  "shortName": "DoF",
  "loginTitle": "Privileged Access Sign‑in",
  "loginBlurb": "This system is restricted to authorised Department of Finance personnel. Unauthorised access is prohibited.",
  "accentColor": "#22c55e",
  "headerStart": "#002a45",
  "headerEnd": "#004b6b"
}
```

### 3) Example: Australian Taxation Office

```json
{
  "countryLine": "Commonwealth of Australia",
  "systemName": "Secure Collaboration Portal",
  "departmentFull": "Australian Taxation Office",
  "shortName": "ATO",
  "loginTitle": "Authorised Officer Sign‑in",
  "loginBlurb": "Access is restricted to authorised ATO officers. Unauthorised access is prohibited.",
  "accentColor": "#22c55e",
  "headerStart": "#002a45",
  "headerEnd": "#004b6b"
}
```

### 4) Apply your changes

Local:

- Save file and refresh browser.

On EC2:

```bash
cd ~/mock-aus-gov-portal
nano public/branding.json
# save changes
sudo systemctl restart gov-portal
```

Then refresh browser.

---

## Part 5: Typical update flow (after edits)

When you update code or branding locally and want AWS to match:

### Local machine

```bash
cd "d:\My Documents\Vibe"
git add .
git commit -m "Update branding and demo content"
git push
```

### EC2 server

```bash
sudo bash /opt/mock-aus-gov-portal/scripts/refresh-ec2.sh
```

---

## Quick troubleshooting

- **`npm` not found** on EC2:
  - Re-run Node install commands in Part 3C.
- **Site not loading**:
  - Check security group allows inbound 80 (or 3000).
  - Check service: `sudo systemctl status gov-portal`
  - Check logs: `journalctl -u gov-portal -n 100 --no-pager`
- **Nginx error**:
  - `sudo nginx -t` to test config.
- **Branding did not change**:
  - Confirm `public/branding.json` is valid JSON.
  - Restart service and hard refresh browser.
- **Bootstrap script fails to clone private repo**:
  - Use HTTPS with a token-enabled auth flow, or SSH keys set up on the EC2 host.
  - Re-run bootstrap after fixing git auth.

---

Automation scripts included:

- `scripts/bootstrap-ec2.sh` - fresh build or rebuild of EC2 environment
- `scripts/refresh-ec2.sh` - pull latest changes + restart service
- `npm run rebrand` - interactive rebrand wizard

For full GitHub Actions automatic deployment setup, see:

- `GITHUB_ACTIONS_SETUP.md`
- `ONE_CLICK_DEPLOY.md`

