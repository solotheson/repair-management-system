# repair-management-service

Express + MongoDB (Mongoose) API for a workshop repair-management system.

## Setup
- `npm install`
- Copy `.env.example` → `.env` and fill values
- Run: `npm start`

## Bootstrapping (first superadmin)
1) Create `.env` from `.env.example` and set at least: `MONGO_URI`, `JWT_SECRET`, `BOOTSTRAP_TOKEN`
2) Start the server: `npm start`
3) Create the first superadmin (only works if none exists yet):
```bash
curl -X POST http://localhost:3000/repair/admin/v1/superadmin/bootstrap \
  -H "Content-Type: application/json" \
  -H "X-Bootstrap-Token: $BOOTSTRAP_TOKEN" \
  -d '{"email":"admin@example.com","password":"change_me","first_name":"Admin","last_name":"User"}'
```
4) Login:
```bash
curl -X POST http://localhost:3000/repair/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id":"admin@example.com","password":"change_me"}'
```
5) Use the returned `access_token`:
```bash
curl http://localhost:3000/repair/v1/auth/me -H "Authorization: Bearer <access_token>"
```

## API (current)
- `POST /repair/admin/v1/superadmin/bootstrap` (header `X-Bootstrap-Token`)
- `POST /repair/v1/auth/login`
- `GET /repair/v1/auth/me`
- `POST /repair/admin/v1/workspaces` (superadmin)
- `GET /repair/v1/workspaces`
- `GET /repair/v1/workspaces/:workspace_id/members`
- `POST /repair/v1/workspaces/:workspace_id/members`
- `DELETE /repair/v1/workspaces/:workspace_id/members/:member_id`
- `POST /repair/v1/workspaces/:workspace_id/repairs`
- `GET /repair/v1/workspaces/:workspace_id/repairs`
- `POST /repair/v1/workspaces/:workspace_id/repairs/:repair_id/complete`
- `POST /repair/v1/workspaces/:workspace_id/repairs/:repair_id/message`
- `GET /repair/v1/workspaces/:workspace_id/repairs/:repair_id/activity`

## Data model (high level)
- `User` (`superadmin|user`)
- `Workspace` (organization)
- `WorkspaceMember` (user membership + role)
- `Repair` (current state)
- `RepairActivity` (history/audit)
