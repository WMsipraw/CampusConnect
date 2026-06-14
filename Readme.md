# CampusConnect - Student Services Platform

### Course Information
* **Course:** Web Technologies (SP26)
* **Semester:** BSCS 4th Semester (Sections 1M & 2M)
* **Project Type:** Individual Capstone Project

### Developer Information
* **Name:** Waqar Mahmood Sipraw (F24BDOCS1M01467)


---

## 1. Project Description
**CampusConnect** is a lightweight, single-page application (SPA) designed to link university students with trusted, peer-provided services within their local campus ecosystem. Students can register using their institutional credentials to browse help requests, post academic or technical tasks (such as tutoring, design, or repair), and coordinate matches. A separate, protected administration view allows community moderators to manage verified providers, supervise match-making workflows, edit request attributes, and track platform metrics.

---

## 2. Mandatory Tech Stack
* **Markup:** Semantic, highly accessible HTML5 structure
* **Styling:** Modular Custom CSS layout Engine
* **Frontend Controller:** Vanilla Plain JavaScript (No external frameworks, libraries, or jQuery)
* **Backend Storage Server:** Local mock JSON REST API (JSON Server)
* **Data Transit Protocol:** RESTful API operations processed via asynchronous fetch + async/await sequences

---

## 3. Implemented Features

### 3.1 User Panel (index.html)
* **Dynamic Content Loading:** Loads active campus help requests through `GET` requests from the database.
* **Filter & Sort Engine:** Users can categorize listings by topic or sort them chronologically or by expected budget constraints.
* **New Service Request Form:** A clean 5-input field form facilitating prompt posting of customized help requests.
* **Robust Custom Inline Validation:** Intercepts wrong submissions (such as past dates or invalid email strings) and prints direct inline DOM notifications without using disruptive standard browser popups.
* **Automatic UI Board Re-render:** Ensures newly submitted campus requests dynamically update across dashboards on successful submission.
* **Loading & Error Status Management:** Clear visual loaders and error messages appear automatically if server communication fails.

### 3.2 Admin Panel (admin.html)
* **Moderation Controls:** Displays active requests, registered verified campus partners, and booking offers.
* **Full CRUD Management:** Offers full-scale operations (Read all lists, Update existing request properties, Delete invalid records via confirmation modals).
* **Summary Analytics:** Calculates total requests, finalized peer matches, and pending approvals.
* **Clear Design Contrast:** Unique admin navigation structure and explicit badges to visually distinguish operations from the user panel.

---

## 4. Project Directory Structure
```text
CampusConnect/
│
├── index.html       # Main user portal landing and SPA structures
├── admin.html       # Administrator moderation dashboard 
├── style.css        # Unified styling stylesheet rules
├── app.js           # Client-side router, search, and form handler 
├── admin.js         # Moderation metric trackers and validation syncing
├── db.json          # Mock JSON Server database instance
└── README.md        # Project setup instructions and developer details