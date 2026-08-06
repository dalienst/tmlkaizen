# Kaizen Tracker — Platform Features & Capabilities

Welcome to the **Kaizen Tracker** documentation. This document outlines the key capabilities, system architecture, role-based workflows, and technical details of the platform.

---

## 🌟 Platform Overview
The Kaizen Tracker is a premium corporate web application designed to collect, evaluate, and track **Kaizen** (continuous improvement) ideas submitted by employees across different physical locations and departments. 

It aims to replace paper-based or unorganized feedback channels with a streamlined, zero-login public submission portal and a role-based management workspace.

---

## 👥 Role-Based Workspaces & Capabilities

The system defines five primary roles, each with a tailored workspace and custom feature set:

### 1. Public Employee (Zero-Login Submission Flow)
* **Verify Identity**: Employees submit ideas without signing in. The platform prompts them for their **Staff ID** and **Email address**, validating these details against the active staff roster before allowing entry.
* **Multi-Step Wizard**: A clean, validation-locked submission wizard guides the employee through:
  * Selecting **Core Values** addressed by the idea.
  * Detailing the **Current Situation**, **Proposed Improvement**, and **Expected Benefit**.
  * Uploading up to 3 diagnostic photos (powered by Cloudinary).
* **Reference Code Generation**: On success, the platform generates a unique tracking code (format: `KZN-YYYY-NNNN`), serving as a permanent tracking identifier.

### 2. Department Manager (`DEPT_MANAGER`)
* **Department Filtering**: Managers are restricted to reviewing ideas submitted from their assigned department.
* **Modern Split-View Dashboard**:
  * **Aggregate Metric Cards**: Visual counts of *Total*, *Proposed*, *In Progress*, and *Completed* ideas.
  * **Interactive Table**: Lists all submissions for the manager's department.
  * **Slide-Over Panel**: Clicking any submission slides out a detail sheet showing the submitter's identity, full text of the situation/idea/benefits, and uploaded images.
* **Workflow Progression**: Managers can move ideas through their lifecycle (`PROPOSED` ➔ `IN_PROGRESS` ➔ `COMPLETED`) via transition-locked controls.

### 3. Human Resources (`HR`)
* **Physical Location Scope**: HR managers can be assigned to multiple physical locations (branches). Their workspace is scoped to show only staff members who belong to departments within those locations.
* **Staff Roster Management**:
  * View, search, and filter employees by department.
  * Manually add staff members or edit their profile details.
  * Deactivate employees to immediately suspend their submission privileges.
* **Bulk CSV Import**: Import hundreds of staff members instantly by uploading a `.csv` file (`staffId, name, email, departmentId`), automatically ignoring duplicate IDs.
* **Bulk Manual Input Form**: HR can create up to **50 staff members at a time** using an interactive spreadsheet-style grid inside the portal.

### 4. General Manager (`GM`)
* **Multi-Location Analytics**: GMs see an aggregate overview of submissions across their assigned branch.
* **Read-Only Analytics Dashboard**:
  * **Departmental Chart**: A custom-styled CSS bar chart mapping ideas submitted per department.
  * **Roster Review**: View list of all submissions, status badges, and registration dates.

### 5. System Administrator (`SYSTEM_ADMIN`)
* **Locations Tab**: Create and toggle physical company branches.
* **Departments Tab**: Create departments and link them to locations.
* **Core Values Tab**: Define corporate values and set their sort order.
* **User Management Tab**: 
  * Register, deactivate, and edit managers, HR users, and GMs.
  * **Resend Credentials Action**: Automatically generate a new password payload and dispatch it via transactional email.

---

## 🛠️ Key Platform Features

### 📸 Cloudinary Photo Uploads
Integrated Cloudinary upload pipeline handles secure image hosting. Supports JPEG, PNG, and WEBP formats up to 5MB, restricting uploads to a maximum of 3 pictures per submission.

### 📨 Resend Transactional Email Engine
All transactional emails (Setup Welcomes, Password Recovery links, and Manager/HR Credentials) are handled by the Resend email engine.

### 🔑 Secure Authentication & Password Reset
* Powered by NextAuth Credentials strategy (JWT session tokens).
* Secure **Forgot & Reset Password** workflow utilizing short-lived, single-use database tokens sent directly to users' inbox.
* "Show password" visibility toggles integrated into all credential portals.
