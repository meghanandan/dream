# Dream CI/CD & Operations Guide
_Last updated: 2025-08-15 00:00 UTC_

This guide covers **setup, deploy, rollback, debug, testing, and Windows SSH** for the Dream project. It’s meant to be copy-paste friendly.

---

## 1) Architecture & Flow (quick view)

- Code lives on **GitHub** (`main` branch).
- Two GitHub Actions workflows:
  - **Frontend** → builds and publishes to `/home/ubuntu/projects/dream/Frontend/dist` on the server (server-side build for reliability).
  - **Backend** → rsyncs `Backend/` to the server, installs deps per service, then **PM2** reloads only the `dream-*` apps.
- **Nginx** serves the SPA from `dist/` and proxies API to the gateway on `http://127.0.0.1:4020`.
- Deploy path: **push → Actions → rsync/build → PM2/Nginx → live**.

---

## 2) One-time Setup

### 2.1 Create a deploy SSH key pair (local machine)
```bash
ssh-keygen -t ed25519 -C "dream-cicd" -f ./dream_deploy_key
# Produces: dream_deploy_key (private) + dream_deploy_key.pub (public)

