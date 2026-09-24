# Low-Level Design (LLD)

## 1. Purpose
This document describes the implementation structure of the Kalvium Portfolio Management repository at the module and component level.

## 2. Repository Structure
### Frontend
- [frontend/src/App.jsx](../frontend/src/App.jsx): top-level route configuration.
- [frontend/src/pages/Home.jsx](../frontend/src/pages/Home.jsx): landing experience and calls to action.
- [frontend/src/pages/Students.jsx](../frontend/src/pages/Students.jsx): searchable and paginated student listing.
- [frontend/src/pages/IndividualStudentPortfolio.jsx](../frontend/src/pages/IndividualStudentPortfolio.jsx): student detail view.
- [frontend/src/pages/MentorDashboard](../frontend/src/pages/MentorDashboard): mentor interface components.
- [frontend/src/lib/supabase.js](../frontend/src/lib/supabase.js): frontend Supabase client setup.

### Backend
- [backend/src/index.js](../backend/src/index.js): Express app bootstrap and route registration.
- [backend/src/routes/auth.routes.js](../backend/src/routes/auth.routes.js): basic auth route placeholder.
- [backend/src/routes/student_dashboard.routes.js](../backend/src/routes/student_dashboard.routes.js): profile management and stats endpoints.
- [backend/src/config/supabase.js](../backend/src/config/supabase.js): Supabase client creation logic.

## 3. Module Responsibilities
### Frontend Modules
- Home: introduces the platform and directs users to login or explore portfolios.
- Students: displays student cards and supports search/pagination.
- IndividualStudentPortfolio: renders a detailed portfolio view for one student.
- MentorDashboard: provides a dashboard-oriented UI for mentor workflows.

### Backend Modules
- Auth route: exposes a simple health/auth placeholder endpoint.
- Student dashboard routes:
  - GET /profile: fetches the current user profile.
  - PUT /updateprofile: creates or updates the profile row.
  - POST /github: returns GitHub stats from a public GitHub URL.
  - POST /leetcode: returns LeetCode stats from a public LeetCode URL.

## 4. API Design
### Profile Retrieval
- Method: GET
- Path: /student/dashboard/profile
- Auth: Bearer token required
- Response: profile JSON object or 404/401 errors

### Profile Update
- Method: PUT
- Path: /student/dashboard/updateprofile
- Auth: Bearer token required
- Body: profile fields to update
- Behavior: merges updates into the user’s profile row and creates a row if it does not exist

### GitHub Stats
- Method: POST
- Path: /student/dashboard/github
- Auth: Bearer token required
- Body: { "url": "https://github.com/username" }
- Response: repository count, follower count, recent repo name

### LeetCode Stats
- Method: POST
- Path: /student/dashboard/leetcode
- Auth: Bearer token required
- Body: { "url": "https://leetcode.com/username" }
- Response: submission counts and profile ranking

### Role-Based Access Control
Roles live in Supabase auth metadata (`user_metadata.role`, falling back to `app_metadata.role`).
`frontend/src/hooks/useAuthStatus.js` exposes `getUserRole(user)` as the single source of truth.

Frontend routes (`frontend/src/App.jsx`), guarded by `frontend/src/components/AuthGate.jsx`:
- `/student/dashboard/:tab` — allowedRoles `["student"]`, rendered by `EditProfile`
- `/mentor/dashboard/:tab` — allowedRoles `["mentor"]`, rendered by `MentorDashboard`
- `/dashboard` — legacy entry point that redirects each role to its home

Notes:
- Tab slugs map to sidebar labels in `frontend/src/pages/MentorDashboard/dashboardRoutes.js`
  (`dashboard`, `overview`, `assigned`, `review`, `settings` for mentors;
  `dashboard`, `profile`, `projects`, `achievements`, `settings` for students).
- The base `/<role>/dashboard` path *is* the default "Dashboard" tab — it renders
  in place rather than redirecting, so the main dashboard URL stays `/mentor/dashboard`
  (`STUDENT_HOME` / `MENTOR_HOME` are those base paths).
- Non-default tabs append the slug: `/mentor/dashboard/review`, `/student/dashboard/projects`, etc.
- `/<role>/dashboard/dashboard` and any unknown slug are canonicalized back to the bare
  base path by `TabGuard`.
- A signed-in user whose role is not allowed for the requested area gets the
  `AccessDenied` page (`frontend/src/components/AccessDenied.jsx`) instead of the
  dashboard. It renders the site's own Navbar/Footer and brand styling (the dashboard
  routes otherwise hide the site chrome) and offers a link to the user's own dashboard;
  unauthenticated users go to `/login`.

### Dead-End Screens
Every "there is nothing here" screen shares one on-brand panel
(`frontend/src/components/EmptyState.css` — Inter, `#e8342a`, 14px buttons) so an
error state never drops the visitor onto a browser-default page:
- `pages/ErrorPage/404page.jsx` — the `path="*"` route. Keeps the site Navbar/Footer,
  shows the requested path, and offers Back to home plus Go to my dashboard (signed in)
  or View leaderboard (guest).
- `src/pages/IndividualStudentPortfolio.jsx` — unknown `:user_id` → "Student not found".
- `src/pages/StudentProjectDetails.jsx` — unknown `:project_slug` → "Project not found".
- `components/AuthGate.css` styles the transient session check with the same vocabulary.

Site chrome in `App.jsx` is hidden only *inside* the dashboard areas, matched per path
segment, so a typo such as `/mentor/dashboardfoo` still renders the 404 with the navbar.

Backend enforcement (`requireRole` in both dashboard route modules):
- `requireAuth` validates the bearer token and populates `req.user`; `requireRole`
  runs after it and rejects a missing or non-matching role.
- `mentor_dashboard.routes.js` applies `requireMentor` to all 16 authenticated routes.
- `student_dashboard.routes.js` applies `requireStudent` to all 10 authenticated routes.

## 5. Data Model Notes
The current implementation expects a Supabase table named profiles with fields such as:
- user_id
- name
- title
- personal_email
- resume_url
- squad_id
- github / leetcode / linkedin references depending on the frontend usage

## 6. Privacy and Resume Handling
- The application should never expose sensitive private information on public portfolio pages.
- Any user profile fields that are considered private should be restricted to authenticated contexts or omitted from public rendering.
- Resume handling should use a URL-based field such as resume_url rather than storing uploaded files in the database or exposing raw file content.
- If resume links are not provided, the UI should simply omit the resume section rather than displaying placeholder sensitive content.

## 7. Validation Rules
- GitHub usernames must match a basic safe regex pattern.
- LeetCode usernames must match a basic safe regex pattern.
- Empty update payloads should be rejected with a 400 response.
- Missing or invalid bearer tokens should be rejected with a 401 response.
- A valid token whose role does not match the route area must be rejected with a 403 response.

## 7. Error Handling Strategy
- Validation errors return structured JSON with an error field.
- External API failures return appropriate 4xx/5xx responses.
- Unexpected server errors are logged and returned as generic internal errors.

## 8. Future Extension Points
- Add resume upload and file storage integration.
- Introduce admin moderation and approval workflows.
- Expand the mentor dashboard with analytics and student tagging.
- Replace hard-coded homepage cards with data-driven content.
