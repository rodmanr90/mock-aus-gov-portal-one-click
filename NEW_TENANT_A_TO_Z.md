# New AWS Tenant A-to-Z (Beginner Runbook)

Use this exact checklist every time a fresh 21-day AWS sandpit tenant is created.

## What you will do

1. Create one IAM deploy user in AWS
2. Create one AWS access key for GitHub Actions
3. Generate one SSH key pair (public + private)
4. Paste 5 required secrets into GitHub
5. Click one GitHub Action button to provision + deploy
6. (Optional) Click one rebrand workflow for each customer demo

---

## Before you start

- You already have this GitHub repo:
  - `https://github.com/rodmanr90/mock-aus-gov-portal-one-click`
- Workflows already exist:
  - **One Click Provision And Deploy**
  - **Rebrand And Redeploy Existing EC2**

---

## Part 1 - In the new AWS tenant: create deploy credentials

## 1) Login to the new AWS tenant

Sign in to AWS Console for that tenant/account.

## 2) Create IAM user for GitHub Actions

AWS Console path:

- **IAM** -> **Users** -> **Create user**

Suggested user name:

- `github-actions-deployer`

Create user (no console login needed).

## 3) Attach permissions to that IAM user

Simple sandbox option (fastest):

- Attach broad deployment policy used in your sandpit (ask your internal cloud admin if needed).

More locked down option:

- Permissions for EC2, VPC read, Security Groups, Key Pairs, and related Terraform actions.

## 4) Create access key for that user

AWS Console path:

- IAM -> Users -> `github-actions-deployer` -> **Security credentials** -> **Create access key**

Copy and save:

- **Access key ID** (for GitHub secret `AWS_ACCESS_KEY_ID`)
- **Secret access key** (for GitHub secret `AWS_SECRET_ACCESS_KEY`)

You may only see the secret once, so copy it immediately.

---

## Part 2 - Create SSH key pair for EC2 access (local machine)

Run on your local machine terminal:

```bash
ssh-keygen -t ed25519 -C "github-actions-ec2" -f ~/.ssh/mock_gov_portal
```

This creates:

- `~/.ssh/mock_gov_portal` (private key)
- `~/.ssh/mock_gov_portal.pub` (public key)

You will paste both into GitHub secrets in the next step.

---

## Part 3 - Add GitHub secrets (most important step)

GitHub path:

- Repo -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**

Add these required secrets exactly:

1. `AWS_ACCESS_KEY_ID`
   - Value: IAM access key ID from AWS
2. `AWS_SECRET_ACCESS_KEY`
   - Value: IAM secret access key from AWS
3. `EC2_PUBLIC_KEY`
   - Value: full contents of `~/.ssh/mock_gov_portal.pub`
4. `EC2_SSH_PRIVATE_KEY`
   - Value: full contents of `~/.ssh/mock_gov_portal`
5. `APP_REPO_URL`
   - Value: `https://github.com/rodmanr90/mock-aus-gov-portal-one-click.git`

Also add these for rebrand workflow / direct EC2 deploy workflow:

6. `EC2_HOST`
   - Value: EC2 public IP (after first one-click deploy creates the instance)
7. `EC2_USER`
   - Value: `ubuntu`
8. `EC2_SSH_PORT`
   - Value: `22`
9. `APP_DIR`
   - Value: `/opt/mock-aus-gov-portal`

Optional:

10. `APP_BRANCH` = `main`
11. `APP_USER` = `ubuntu`
12. `NGINX_SERVER_NAME` = `_`

---

## Part 4 - One-click full deployment

GitHub path:

- **Actions** -> **One Click Provision And Deploy** -> **Run workflow**

Use these inputs:

- `aws_region`: your tenant region (example `ap-southeast-2`)
- `instance_type`: `t3.micro` (or `t3.small`)
- `app_branch`: `main`
- `department_name`: optional (leave blank or set e.g. `Department of Finance`)
- `department_short_name`: optional (leave blank to auto-generate)
- `ssh_ingress_cidr`: your public IP in `/32` format (best practice)
- `http_ingress_cidr`: `0.0.0.0/0`

Click **Run workflow**.

After it finishes, open the run summary and copy:

- App URL (`http://<ec2-ip>`)

---

## Part 5 - Rebrand in one field for each demo

GitHub path:

- **Actions** -> **Rebrand And Redeploy Existing EC2** -> **Run workflow**

Fill only:

- `department_name` (example: `Australian Taxation Office`)

Optional:

- `department_short_name` (if blank, auto-generated)
- `login_title`

Click **Run workflow**. App restarts with updated branding.

---

## Part 6 - What to update every new tenant

Every 21-day tenant reset, update at minimum:

1. `AWS_ACCESS_KEY_ID`
2. `AWS_SECRET_ACCESS_KEY`

If you use a new SSH key pair, also update:

3. `EC2_PUBLIC_KEY`
4. `EC2_SSH_PRIVATE_KEY`

Then run **One Click Provision And Deploy** again.

---

## Safe security-demo guidance (important)

I cannot help with exploit-capable vulnerabilities or shell-style compromise setups.

For customer demos, use non-production sandpit and focus on scanner-detectable posture findings such as:

- SSH exposed too broadly (`0.0.0.0/0`) in test
- Missing resource tags/governance controls
- Overly broad IAM policy attached to deploy user (sandbox only)
- Weak app auth policy language in the mock app
- Public HTTP endpoint without TLS in demo environment

These are useful for CSPM/CWPP posture demonstrations without adding weaponized exploit behavior.

