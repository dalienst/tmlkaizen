# Kaizen Feedback & Project Tracker - Architecture Document

## 1. Project Overview
An internal web application designed to digitalize the Kaizen (continuous improvement) process across multiple company branches. The system balances a frictionless, zero-login submission flow for employees with secure, role-based dashboards for management to track and act on submissions.

**Tech Stack:**
*   **Framework:** Next.js (App Router)
*   **Database:** PostgreSQL
*   **ORM:** Drizzle ORM
*   **File Storage:** Cloudinary (Node SDK)
*   **Development Environment:** Antigravity (VS Code-based agent editor)

---

## 2. System Architecture & Workflows

### A. The Employee Intake Flow (Public but Secured)
*   **Endpoint:** `/submit`
*   **Access:** No user accounts required.
*   **Validation:** Employees enter their `Staff ID` and `Email`. The system verifies these against the internal `staff` database table before allowing submission.
*   **Data Captured:** Target Core Value(s), Current Situation, Improvement Idea, Expected Benefit, and optional image attachments (processed via Cloudinary).

### B. Role-Based Access Control (RBAC) & Dashboards
*   **Endpoint:** `/dashboard/*`
*   **Authentication:** Required (e.g., NextAuth/Auth.js).
*   **Roles:**
    *   `DEPT_MANAGER`: Sees only Kaizen projects assigned to their specific department. Manages project statuses (Proposed → In Progress → Completed).
    *   `GM` (General Manager): Tied to a specific Location. Sees aggregate metrics and all projects across all departments within their Location.
    *   `HR`: Manages the `staff` validation roster. Can be assigned to multiple Locations.
    *   `SYSTEM_ADMIN`: Manages overall Locations, Departments, and assigns GMs/HR roles.

---

## 3. Database Schema Blueprint (Drizzle ORM)

The relational hierarchy follows: **Location → Department → Staff/Manager → Project**.

| Table | Description | Key Relationships |
| :--- | :--- | :--- |
| **`locations`** | Physical company branches. | Has many `departments`, `gms`, and `hrAccess`. |
| **`departments`** | Business units within a location. | Belongs to a `location`. Has many `staff`, `managers`, and `projects`. |
| **`users`** | Dashboard access for management/admin. | Contains `role` enum. Optionally relates to `location` (GM) or `department` (Manager). |
| **`hr_locations`** | Many-to-many join table. | Maps an HR `user.id` to multiple `location.id`s. |
| **`staff`** | Employee roster used purely for validation. | Belongs to a `department`. |
| **`kaizen_projects`**| The core submission data. | Belongs to `staff` (author) and `department`. Stores Cloudinary URL. |

---

## 4. Development Roadmap (Antigravity Execution Plan)

*   **Phase 1: Environment & Schema Initialization**
    *   Initialize Next.js App Router and configure Drizzle ORM with the PostgreSQL connection.
    *   Draft and push the core schema migrations for the multi-tenant architecture (`locations`, `departments`, `users`, `hr_locations`, `staff`).
*   **Phase 2: Administrative Foundations**
    *   Implement authentication for management.
    *   Build the `SYSTEM_ADMIN` view (to create locations/departments and assign roles).
    *   Build the `HR` view (to populate the `staff` roster for their assigned locations).
*   **Phase 3: The Public Intake Flow & Cloudinary Integration**
    *   Build the validation gate (`Staff ID` + `Email` lookup).
    *   Develop the Next.js API route to accept multipart form data, stream to Cloudinary, and return the secure URL.
    *   Build the submission form UI and wire it to write to `kaizen_projects`.
*   **Phase 4: Management Tracking Dashboards**
    *   Develop layout wrappers with server-side authorization checks.
    *   Build the `DEPT_MANAGER` Kanban/Table view for status tracking.
    *   Build the `GM` analytical view using Drizzle's nested relational queries to fetch data grouped by location.