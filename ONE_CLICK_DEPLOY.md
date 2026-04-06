# One-Click Deploy (Provision + Configure + Deploy)

This guide gives you exactly what you asked for: trigger one GitHub Action and have it create a fresh EC2 and deploy the full app automatically.

## What the one-click workflow does

Workflow: `.github/workflows/one-click-provision-and-deploy.yml`

When you click **Run workflow**, it:

1. Authenticates to AWS
2. Uses Terraform to create:
   - EC2 instance (Ubuntu 24.04 LTS)
   - Security group (SSH + HTTP)
   - EC2 key pair from your public key
3. Waits until SSH is available
4. SSHes into the instance
5. Runs bootstrap script:
   - installs Node.js, git, nginx
   - clones your repo
   - installs dependencies
   - creates `gov-portal` systemd service
   - configures nginx reverse proxy
6. Prints app URL in GitHub Action summary

---

## Required GitHub Secrets (exact names)

Go to: **Repo -> Settings -> Secrets and variables -> Actions -> New repository secret**

Add:

1. `AWS_ACCESS_KEY_ID`
2. `AWS_SECRET_ACCESS_KEY`
3. `EC2_PUBLIC_KEY`
4. `EC2_SSH_PRIVATE_KEY`
5. `APP_REPO_URL`

### What each secret is and where to get it

#### `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

- Create in AWS IAM in the active sandpit tenant:
  1. Open **IAM**
  2. Create or choose a user (e.g. `github-actions-deployer`)
  3. Enable **Programmatic access**
  4. Attach permissions (minimum for this project: EC2 + Security Group + Key Pair + VPC read; easiest for sandbox is broad deploy rights)
  5. Create access key
  6. Copy key ID and secret into GitHub secrets

Important: these are tenant-specific. For a brand-new tenant every 21 days, create new keys and update secrets.

#### `EC2_PUBLIC_KEY`

- Public half of your SSH key pair used for EC2 login.
- Generate locally if needed:

```bash
ssh-keygen -t ed25519 -C "github-actions-ec2" -f ~/.ssh/mock_gov_portal
```

- Put contents of `~/.ssh/mock_gov_portal.pub` into `EC2_PUBLIC_KEY`.

#### `EC2_SSH_PRIVATE_KEY`

- Private half of the same SSH key.
- Put full contents of `~/.ssh/mock_gov_portal` into GitHub secret.
- Keep this secret private.

#### `APP_REPO_URL`

- Your GitHub clone URL.
- Example:
  - `https://github.com/<your-username>/<repo-name>.git`

Use a public repo for easiest setup. If private repo, ensure the EC2 host can clone it.

---

## Run it (single button)

1. Open your repo on GitHub
2. Go to **Actions**
3. Select **One Click Provision And Deploy**
4. Click **Run workflow**
5. Keep defaults or set inputs:
   - `aws_region` (e.g. `ap-southeast-2`)
   - `instance_type` (e.g. `t3.micro`)
   - `app_branch` (`main`)
   - `ssh_ingress_cidr` (prefer your public IP `/32`)
   - `http_ingress_cidr` (`0.0.0.0/0` for public demo)
6. Click **Run workflow** again to confirm

In a few minutes, the summary shows:

- App URL (`http://<ec2-ip>`)
- EC2 DNS

---

## 21-day tenant reset playbook

When a new tenant is provisioned:

1. In new tenant IAM, create deploy access key
2. Update GitHub secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
3. Reuse existing SSH key pair secrets, or replace both:
   - `EC2_PUBLIC_KEY`
   - `EC2_SSH_PRIVATE_KEY`
4. Run **One Click Provision And Deploy**
5. Use output URL

That is the full rebuild process.

---

## Optional cleanup workflow

Use workflow:

- `.github/workflows/destroy-sandpit.yml`

It runs Terraform destroy for the same stack.

---

## Security note

For simplicity this guide uses long-lived IAM access keys in GitHub secrets.

For a stronger setup later, migrate to GitHub OIDC + IAM role assumption to avoid storing AWS secrets in GitHub.

