# Dream – CI/CD Guide (Non-Technical, Step-by-Step)
This guide explains how to set up and use the CI/CD pipeline for the Dream project, enabling automatic updates to the site/app when code is pushed to GitHub. It uses GitHub Actions for automation, SSH keys for secure server access, rsync for file copying, PM2 to keep the backend running, and Nginx as the web server.
# 0. Quick Summary (TL;DR)

-  What happens: Push changes to the main branch → GitHub Actions runs → files are copied to the server → Frontend is rebuilt and published, Backend is restarted with PM2, Nginx serves the updated site.
-  Manual deploy: Go to GitHub → Actions → select Frontend or Backend workflow → Run workflow.
-  Rollback: Revert the bad commit and push, or redeploy an older commit.

# 1. Names, Places & Logins

- GitHub repo: https://github.com/meghanandan/dream
- Server (EC2): ubuntu@52.203.77.78
- Project on server: /home/ubuntu/projects/dream/
- Frontend output (static site): /home/ubuntu/projects/dream/Frontend/dist/
- Backend microservices: /home/ubuntu/projects/dream/Backend/
- PM2 app names (backend):
  - dream-gateway-service
  - dream-auth-service
  - dream-dispute-service
  - dream-settings-service
  - dream-template-service
  - dream-external-api-services


Website: https://dream.uniflo.ai

# 2. One-Time Setup (do once per laptop/account)
## A. Make a deploy key (your laptop)
This key allows GitHub Actions to connect securely to the server.
- On Windows (Git Bash), Mac, or Linux:
```bash
ssh-keygen -t ed25519 -C "dream-cicd" -f ./dream_deploy_key
```
- This creates:
```bash
dream_deploy_key (private key)
dream_deploy_key.pub (public key)
```
## B. Put the public key on the server

Log in to the server using your AWS .pem key (you may already have this set up):
```bash
ssh -i "<path-to-aws-ec2-pem>" ubuntu@52.203.77.78 "mkdir -p ~/.ssh && chmod 700 ~/.ssh"
```

Upload the public key:
```bash
scp -i "<path-to-aws-ec2-pem>" ./dream_deploy_key.pub ubuntu@52.203.77.78:~/deploykey.pub
```

Add it to the server’s authorized keys:
```bash
ssh -i "<path-to-aws-ec2-pem>" ubuntu@52.203.77.78 \
  "cat ~/deploykey.pub >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && rm ~/deploykey.pub"
```

Test the new key:
```bash
ssh -i "./dream_deploy_key" ubuntu@52.203.77.78 "echo DEPLOY-KEY-OK && whoami && hostname"
```
You should see: DEPLOY-KEY-OK, ubuntu, and the hostname.
## C. Add secrets in GitHub

Go to GitHub → your repo → Settings → Secrets and variables → Actions → New repository secret.
- Create these secrets exactly:
  - SERVER_HOST = 52.203.77.78
  - SERVER_USER = ubuntu
  - SERVER_SSH_KEY = paste the full text of dream_deploy_key (the private key).



⚠️ Never commit keys or .env files to the repo.
## D. Server has the basics (already done, for reference)
- The server is pre-configured with:
```bash
sudo apt-get update
sudo apt-get install -y rsync nginx
```
## pm2/node already installed; otherwise: sudo npm i -g pm2

# 3. What the Automation Files Do (already in the repo)
The repo contains two GitHub Action workflows in .github/workflows/:
## 1. Frontend – server-side build & publish

Copies Frontend/ source to a temporary workspace on the server.
Runs npm install and npm run build on the server (more reliable than local builds).
Publishes the new dist/ atomically to /home/ubuntu/projects/dream/Frontend/dist.
Reloads Nginx.
Triggers: Push to main that changes Frontend/**, or manual workflow run.

## 2. Backend – rsync + install + PM2 reload

Copies Backend/ files to the server.
Runs npm install for each backend service.
Reloads only the dream-* PM2 apps.
Triggers: Push to main that changes Backend/**, or manual workflow run.

You don’t need to edit these files; they’re already configured with the correct paths and secrets.
# 4. How to Deploy (2 ways)
## A. Automatic (most common)

Push changes to the main branch.
GitHub Actions runs the appropriate workflow.
Wait for the green checkmark in the Actions tab.

## B. Manual (on demand)

Go to GitHub → Actions tab.
Select Dream CI/CD – Frontend or Dream CI/CD – Backend.
Click Run workflow (keep branch = main) → Run.

# 5. How to Check It Worked
From your laptop (example in Windows PowerShell):
Frontend:
```bash
ssh -i "$HOME\dream_deploy_key" ubuntu@52.203.77.78 `
  "ls -la /home/ubuntu/projects/dream/Frontend/dist | head; \
   cat /home/ubuntu/projects/dream/Frontend/dist/build-info.json; \
   sudo nginx -t && curl -I https://dream.uniflo.ai"
```
Backend:
```bash
ssh -i "$HOME\dream_deploy_key" ubuntu@52.203.77.78 `
  "cat /home/ubuntu/projects/dream/Backend/BUILD_INFO.json; \
   pm2 ls | sed -n '1,120p'"
```
You should see today’s timestamps and a JSON with the commit SHA in the outputs.
# 6. Everyday Do’s & Don’ts
Do

Commit and push to main (or merge a PR into main) to trigger auto-deploy.
Keep .env files and secrets out of Git; store them on the server or in GitHub Actions Secrets.
Check the Actions run for a green checkmark.

Don’t

Don’t edit files directly on the server (they’ll be overwritten by the next deploy).
Don’t commit node_modules/, .env, or database dumps.

# 7. Rollback (go back to a good version)
Option 1 – Revert the bad commit (simple)
```bash
git revert <bad-commit-sha>
git push origin main
```
GitHub Actions will redeploy the reverted state.
Option 2 – Redeploy an older commit/tag

Create a branch from the desired commit or tag.
Open a PR into main, merge, and it will deploy that version.

(Future improvement: Add a “deploy this SHA/tag” input to workflows for one-click rollbacks.)
# 8. PM2 – Basic Commands (on server)
```bash
pm2 ls                                    # List running services
pm2 logs --lines 200                     # View recent logs
pm2 logs dream-gateway-service --lines 100 # View specific service logs
pm2 startOrReload /home/ubuntu/projects/dream/Backend/dream-ecosystem.config.js --env production # Reload config
pm2 restart dream-gateway-service         # Restart a specific service
pm2 save                                 # Save PM2 process list
```
# 9. Nginx – Quick Actions (on server)
```bash
sudo nginx -t           # Test Nginx config
sudo systemctl reload nginx # Reload Nginx
```
Nginx serves the SPA from /home/ubuntu/projects/dream/Frontend/dist and proxies /api/* and /ws to 127.0.0.1:4020 (gateway).
# 10. Troubleshooting (common errors & fixes)
## A. GitHub Actions fails with “Permission denied (publickey)”
Cause: The server didn’t accept the key.
Fix:

Ensure the SERVER_SSH_KEY secret contains the full private key (dream_deploy_key).
Verify the public key (dream_deploy_key.pub) is in the server’s ~/.ssh/authorized_keys.
Confirm the workflow adds the host to known_hosts (it already does).

## B. Actions shows “Host key verification failed”
Cause: The host fingerprint isn’t trusted.
Fix: The workflows include:
```bash
ssh-keyscan -H ${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts
```
## C. Frontend didn’t change on the website
Cause: The build step likely failed.
Fix: Check the Build & publish on server step logs in the Frontend workflow. Dependency errors are handled with --legacy-peer-deps. For code errors, fix and redeploy.
## D. Backend didn’t update / APIs failing
Check PM2 status and logs:
```bash
pm2 ls
pm2 logs dream-gateway-service --lines 100
```
Check backend health (if exposed):
```bash
curl -sS http://127.0.0.1:4020/health || curl -sS http://127.0.0.1:4020/api/health || true
```
## E. Nginx serving old content
```bash
sudo nginx -t && sudo systemctl reload nginx
```
# 11. Windows SSH – Handy Snippets
Lock down your AWS .pem (PowerShell):
```bash
$dest = "$HOME\.ssh\dream_aws_server_pem.pem"
New-Item -ItemType Directory -Force "$HOME\.ssh" | Out-Null
Copy-Item "D:\Vyva-Docs\dream_aws_server_pem.pem" $dest -Force
icacls $dest /inheritance:r
icacls $dest /grant:r "$($env:USERNAME):(R)" "SYSTEM:(F)" "Administrators:(F)"
icacls $dest /remove "Everyone" "BUILTIN\Users" "NT AUTHORITY\Authenticated Users"
```
SSH using the GitHub deploy key (PowerShell):
```bash
ssh -i "$HOME\dream_deploy_key" ubuntu@52.203.77.78 "echo OK && whoami && hostname"
```
# 12. How It Works (in plain English)

You push code to GitHub.
GitHub Actions detects the push and starts the appropriate workflow (Frontend or Backend).
- Backend: Files are sent to the server, packages are installed, and PM2 reloads the dream-* services.
- Frontend: Source files are sent to the server, the static site is built, the new dist/ is swapped into place, and Nginx is reloaded.
Your updated site is live at https://dream.uniflo.ai.

# 13. Safety Checklist (print me)

 - I never commit secrets or .env files.
 - I pushed to main or merged a PR into main.
 - I checked the Actions run turned green.
 - I verified the server shows today’s dist/ and BUILD_INFO.json.
 - If something breaks, I check PM2 logs and Nginx test/reload.
 - For a bad deploy, I revert the commit and push.
