# GitHub Actions Auto-Deploy Setup (Beginner Guide)

This guide makes deployment automatic: every time you push to `main`, GitHub deploys your app to EC2.

## Big picture

- You push code to GitHub
- GitHub Actions SSHes into EC2
- It either:
  - runs full bootstrap (first time), or
  - runs refresh (next times)

No manual EC2 deployment commands needed after setup.

---

## Do I need AWS access keys in GitHub?

For this workflow: **No AWS access key/secret key needed**.

Reason:

- We deploy over SSH directly to EC2.
- GitHub only needs SSH access to the instance.
- No AWS API calls are required.

So the only sensitive credential you store in GitHub is the **EC2 SSH private key**.

---

## What you need before starting

1. GitHub repo with this project
2. EC2 Ubuntu instance running and reachable
3. Your EC2 key pair (`.pem`) that can SSH into that instance
4. EC2 security group allows:
   - inbound `22` from GitHub Actions runners (for easiest setup: temporary `0.0.0.0/0`, then tighten later), and
   - inbound `80` for web traffic

---

## Step 1: Confirm workflow file exists

This repo already includes:

- `.github/workflows/deploy-ec2.yml`

It triggers on:

- push to `main`
- manual run (`workflow_dispatch`)

---

## Step 2: Add required GitHub secrets

In GitHub:

1. Open your repo
2. Go to **Settings**
3. Go to **Secrets and variables** -> **Actions**
4. Click **New repository secret**
5. Add the following secrets exactly:

### Required secrets

- `EC2_HOST`
  - Value: your EC2 public IP or DNS
  - Example: `3.106.12.34`

- `EC2_USER`
  - Value: `ubuntu` (for Ubuntu AMIs)

- `EC2_SSH_PRIVATE_KEY`
  - Value: contents of your `.pem` key file, including:
    - `-----BEGIN ...-----`
    - `-----END ...-----`

- `EC2_SSH_PORT`
  - Value: `22`

- `APP_REPO_URL`
  - Value: your repo clone URL
  - Example: `https://github.com/<your-username>/mock-aus-gov-portal.git`

### Optional (recommended) secrets

- `APP_BRANCH`
  - Value: `main`
- `APP_USER`
  - Value: `ubuntu`
- `APP_DIR`
  - Value: `/opt/mock-aus-gov-portal`
- `NGINX_SERVER_NAME`
  - Value:
    - `_` if you do not have a domain yet, or
    - your domain name if you have one

---

## Step 3: First deployment

After adding secrets:

1. Push any commit to `main`, or
2. Go to **Actions** -> **Deploy to EC2** -> **Run workflow**

On first run:

- Action detects no app installed in `APP_DIR`
- It runs bootstrap automatically
- Installs Node, nginx, app service, and starts app

Then open:

- `http://<EC2_HOST>`

---

## Step 4: Ongoing deployments

From now on, your flow is:

1. Make edits locally
2. Push to `main`
3. GitHub Actions auto-deploys

No SSH/manual deployment required for normal updates.

---

## Rebranding with auto-deploy

Local machine:

```bash
cd "d:\My Documents\Vibe"
npm run rebrand
git add public/branding.json
git commit -m "Rebrand for new department"
git push
```

GitHub Actions deploys it automatically.

---

## Where to get values (quick map)

- `EC2_HOST`: AWS Console -> EC2 -> Instance -> Public IPv4 address
- `EC2_USER`: AMI-dependent username (`ubuntu` for Ubuntu)
- `EC2_SSH_PRIVATE_KEY`: your original downloaded key pair (`.pem`) content
- `APP_REPO_URL`: GitHub repo page -> **Code** button -> HTTPS URL

---

## Troubleshooting

- Action fails with SSH timeout:
  - Check EC2 is running
  - Check security group allows inbound port 22
  - Check `EC2_HOST` is correct

- Action fails with permission denied (publickey):
  - Check `EC2_SSH_PRIVATE_KEY` exactly matches the instance key pair
  - Check `EC2_USER` is correct

- App not loading on port 80:
  - Confirm security group allows inbound 80
  - SSH and check:
    - `sudo systemctl status gov-portal`
    - `sudo systemctl status nginx`

---

## Optional advanced path (AWS keys)

You only need AWS keys if you want GitHub Actions to create/destroy AWS infrastructure via AWS APIs.

For that advanced scenario, prefer OIDC + IAM role (no long-lived AWS keys). This is separate from this current EC2 SSH deploy workflow.

