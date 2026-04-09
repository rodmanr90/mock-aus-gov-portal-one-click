# Wiz Security Demo Guide: Mock AUS Gov Portal

This application is intentionally built with multiple security vulnerabilities across the full stack (Infrastructure, Container, Supply Chain, and Application) to demonstrate the capabilities of a CNAPP tool like Wiz.

## 1. Infrastructure Misconfigurations (Terraform)
*   **Public S3 Bucket:** `aws_s3_bucket.sensitive_data` is configured with public read access.
*   **Permissive Security Group:** SSH (Port 22) is open to `0.0.0.0/0`.
*   **IMDSv1 Enabled:** EC2 instance has `http_tokens = "optional"`, allowing for metadata SSRF attacks.
*   **Unencrypted EBS:** The root volume is not encrypted.

## 2. Container Vulnerabilities (Dockerfile)
*   **Vulnerable Base Image:** Uses `node:14.17.0`, which contains hundreds of known CVEs.
*   **Root User:** The container runs as the `root` user.
*   **Hardcoded Secrets:** Contains `ADMIN_PASSWORD` and `AWS_ACCESS_KEY_ID` in environment variables.

## 3. Supply Chain Vulnerabilities (SCA)
*   **Outdated Packages:** `package.json` includes old versions of `axios`, `lodash`, and `ejs` with known critical vulnerabilities.

## 4. Application Vulnerabilities (SAST/DAST)
*   **Hardcoded Secrets in Code:** `server.js` contains hardcoded AWS and Stripe keys.
*   **Sensitive Data Exposure:** `/api/debug` leaks all environment variables.
*   **Broken Authentication:** `/api/minutes` (GET) is unauthenticated, exposing internal meeting notes.
*   **IDOR (Insecure Direct Object Reference):** `/api/senate-estimates/register` allows a user to register *any* username for a hearing.
*   **React XSS:** The `CollaboratorChat` component in `react-chat.jsx` uses `dangerouslySetInnerHTML`, allowing for Cross-Site Scripting.

## 5. Toxic Combinations & Overly Permissive Identities (CIEM)
*   **Star Permissions:** `pm.albany` has `*` permissions, which Wiz identifies as a high-risk toxic combination when paired with a public-facing workload.
*   **Service Account Exposure:** `svc-doc-sorter` has access to all scopes (`*`), representing an over-privileged machine identity.

## 6. Shadow AI vs. Sanctioned AI
*   **Sanctioned AI:** `OpenAI (Departmental Tenant)` uses a departmental key (`sk-proj-AUSGOV...`). While authorized, Wiz still flags the hardcoded secret in the codebase.
*   **Shadow AI:** Features that send "Cabinet-in-Confidence" data to external, non-sanctioned AI providers (Hugging Face, LLaMa) represent a high-risk data egress and unsanctioned model usage.

## Demo Flow
1.  **Supply Chain:** Show the `package.json` and how Wiz flags the old dependencies.
2.  **Infrastructure:** Point out the public S3 bucket in the Terraform files.
3.  **Identity Management (CIEM):**
    *   Sign in as `pm.albany`.
    *   Click **Admin - Identity Management**.
    *   Highlight the **CRITICAL: FULL ACCESS** tags.
4.  **AI Security (Sanctioned vs. Shadow):**
    *   Go to **AI Insights & Enrichment**.
    *   Select **OpenAI (Departmental Tenant)**.
    *   Click **Process with AI**. Show the **SUCCESS** message.
    *   Explain: "Even though this is an 'authorized' connection, Wiz still detected the hardcoded OpenAI secret in my source code."
    *   Now, switch to **Hugging Face (Public API)** and click **Process with AI**.
    *   Show the **WARNING: Shadow AI Detected!** message.
    *   Explain: "Wiz detects the use of an unauthorized model and the movement of 'Cabinet-in-Confidence' data to a public entity."
5.  **Application Vulnerabilities (SAST/DAST):**
    *   Go to **File Collaboration** and send a chat message with HTML like `<img src=x onerror=alert('XSS')>`.
    *   Go to **Senate Estimates** and register for a hearing. Explain the IDOR vulnerability.
