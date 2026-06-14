// 1. Global API Configuration
const API_BASE_URL = "http://localhost:3000";

// --- GLOBAL ADMIN SELECTORS ---
const requestsTableBody = document.getElementById("admin-requests-table");
const providersTableBody = document.getElementById("admin-providers-table");
const bookingsTableBody = document.getElementById("admin-bookings-table");

const editSection = document.getElementById("edit-section");
const editForm = document.getElementById("edit-form");
const cancelEditBtn = document.getElementById("cancel-edit");

const providerFormContainer = document.getElementById("provider-form-container");
const providerForm = document.getElementById("provider-form");
const toggleProviderBtn = document.getElementById("toggle-provider-btn");
const cancelProviderBtn = document.getElementById("cancel-provider");


// --- INITIAL DASHBOARD SETUP TRIGGER ---
document.addEventListener("DOMContentLoaded", () => {
    fetchAdminDashboardData();
});


// --- COLLAPSIBLE PROVIDER FORM CONTROLS ---
if (toggleProviderBtn && providerFormContainer) {
    toggleProviderBtn.addEventListener("click", () => {
        providerFormContainer.classList.toggle("hidden");
    });
}

if (cancelProviderBtn && providerFormContainer) {
    cancelProviderBtn.addEventListener("click", () => {
        providerFormContainer.classList.add("hidden");
        providerForm.reset();
    });
}


// --- POST VERIFIED PROVIDERS (Table 2 CRUD) ---
if (providerForm) {
    providerForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const name = document.getElementById("provider-name").value.trim();
        const email = document.getElementById("provider-email").value.trim();
        const category = document.getElementById("provider-category").value;
        const availability = document.getElementById("provider-avail").value.trim();

        const newProvider = { name, email, category, availability };

        try {
            const response = await fetch(`${API_BASE_URL}/providers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newProvider)
            });

            if (!response.ok) throw new Error();

            alert("Verified Provider added successfully!");
            providerForm.reset();
            providerFormContainer.classList.add("hidden");
            
            fetchAdminDashboardData(); // Refreshes stats and tables automatically

        } catch (error) {
            console.error("Error adding provider:", error);
            alert("Failed to save provider to database.");
        }
    });
}


// --- MASTER FETCH & METRIC STATISTICS CALCULATIONS ---
async function fetchAdminDashboardData() {
    showLoader("admin-requests-loading", "admin-requests-error", true);
    showLoader("admin-providers-loading", "admin-providers-error", true);
    showLoader("admin-bookings-loading", "admin-bookings-error", true);

    try {
        // Parallel fetch of all collections (GET method)
        const [requestsRes, providersRes, bookingsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/requests`),
            fetch(`${API_BASE_URL}/providers`),
            fetch(`${API_BASE_URL}/bookings`)
        ]);

        if (!requestsRes.ok || !providersRes.ok || !bookingsRes.ok) throw new Error();

        const requests = await requestsRes.json();
        const providers = await providersRes.json();
        const bookings = await bookingsRes.json();

        // 1. Calculate dynamic statistics
        calculateAdminStats(requests, bookings);

        // 2. Render all three management tables programmatically
        renderRequestsTable(requests);
        renderProvidersTable(providers);
        renderBookingsTable(bookings);

        showLoader("admin-requests-loading", "admin-requests-error", false);
        showLoader("admin-providers-loading", "admin-providers-error", false);
        showLoader("admin-bookings-loading", "admin-bookings-error", false);

    } catch (error) {
        console.error("Error loading admin dashboard:", error);
        showError("admin-requests-loading", "admin-requests-error");
        showError("admin-providers-loading", "admin-providers-error");
        showError("admin-bookings-loading", "admin-bookings-error");
    }
}

function calculateAdminStats(requests, bookings) {
    // Stat 1: Total requests posted
    document.getElementById("stat-total-requests").textContent = requests.length;

    // Stat 2: Total completed/approved bookings
    const approvedCount = bookings.filter(b => b.status === "Approved").length;
    document.getElementById("stat-approved-requests").textContent = approvedCount;

    // Stat 3: Total pending confirmation approvals (Client accepted, waiting for Admin)
    const pendingCount = bookings.filter(b => b.status === "Accepted by Client, Pending Admin Approval").length;
    document.getElementById("stat-pending-approvals").textContent = pendingCount;
}


// --- TABLE 1: RENDER REQUESTS BOARD ---
function renderRequestsTable(requestsArray) {
    requestsTableBody.textContent = "";

    if (requestsArray.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.className = "status-message";
        td.textContent = "No campus requests currently in database.";
        tr.appendChild(td);
        requestsTableBody.appendChild(tr);
        return;
    }

    requestsArray.forEach(req => {
        const tr = document.createElement("tr");

        const tdTitle = document.createElement("td");
        tdTitle.textContent = req.title;
        tr.appendChild(tdTitle);

        const tdCategory = document.createElement("td");
        tdCategory.textContent = req.category;
        tr.appendChild(tdCategory);

        const tdBudget = document.createElement("td");
        tdBudget.textContent = `Rs. ${req.budget}`;
        tr.appendChild(tdBudget);

        const tdStatus = document.createElement("td");
        tdStatus.textContent = req.status;
        tr.appendChild(tdStatus);

        const tdActions = document.createElement("td");

        const editBtn = document.createElement("button");
        editBtn.className = "edit-btn";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => loadRequestIntoEditForm(req));
        tdActions.appendChild(editBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => deleteRequest(req.id));
        tdActions.appendChild(deleteBtn);

        tr.appendChild(tdActions);
        requestsTableBody.appendChild(tr);
    });
}


// --- TABLE 2: RENDER VERIFIED PROVIDERS ---
function renderProvidersTable(providersArray) {
    providersTableBody.textContent = "";

    if (providersArray.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.className = "status-message";
        td.textContent = "No verified campus providers currently listed.";
        tr.appendChild(td);
        providersTableBody.appendChild(tr);
        return;
    }

    providersArray.forEach(prov => {
        const tr = document.createElement("tr");

        const tdName = document.createElement("td");
        tdName.textContent = prov.name;
        tr.appendChild(tdName);

        const tdCategory = document.createElement("td");
        tdCategory.textContent = prov.category;
        tr.appendChild(tdCategory);

        const tdEmail = document.createElement("td");
        tdEmail.textContent = prov.email;
        tr.appendChild(tdEmail);

        const tdAvail = document.createElement("td");
        tdAvail.textContent = prov.availability;
        tr.appendChild(tdAvail);

        const tdActions = document.createElement("td");
        const removeBtn = document.createElement("button");
        removeBtn.className = "delete-btn";
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", () => deleteProvider(prov.id));
        tdActions.appendChild(removeBtn);

        tr.appendChild(tdActions);
        providersTableBody.appendChild(tr);
    });
}


// --- TABLE 3: RENDER BOOKING OFFERS (Moderation & Approvals) ---
function renderBookingsTable(bookingsArray) {
    bookingsTableBody.textContent = "";

    if (bookingsArray.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 6;
        td.className = "status-message";
        td.textContent = "No booking offers currently in database.";
        tr.appendChild(td);
        bookingsTableBody.appendChild(tr);
        return;
    }

    bookingsArray.forEach(booking => {
        const tr = document.createElement("tr");

        const tdTitle = document.createElement("td");
        tdTitle.textContent = booking.requestTitle;
        tr.appendChild(tdTitle);

        const tdProvider = document.createElement("td");
        tdProvider.textContent = booking.providerName;
        tr.appendChild(tdProvider);

        const tdClient = document.createElement("td");
        tdClient.textContent = booking.clientName;
        tr.appendChild(tdClient);

        const tdMsg = document.createElement("td");
        tdMsg.textContent = booking.message;
        tr.appendChild(tdMsg);

        const tdStatus = document.createElement("td");
        tdStatus.textContent = booking.status;
        tr.appendChild(tdStatus);

        const tdActions = document.createElement("td");

        // Action controls based on the 3-Stage Workflow
        if (booking.status === "Accepted by Client, Pending Admin Approval") {
            const approveBtn = document.createElement("button");
            approveBtn.className = "edit-btn"; // Blue-themed
            approveBtn.textContent = "Approve Match";
            approveBtn.addEventListener("click", () => approveBookingMatch(booking.id));
            tdActions.appendChild(approveBtn);

            const rejectBtn = document.createElement("button");
            rejectBtn.className = "delete-btn"; // Red-themed
            rejectBtn.textContent = "Reject";
            rejectBtn.addEventListener("click", () => rejectBooking(booking.id));
            tdActions.appendChild(rejectBtn);
        } 
        else if (booking.status === "Approved") {
            const finalizedText = document.createElement("span");
            finalizedText.className = "status-approved";
            finalizedText.textContent = "Match Approved";
            tdActions.appendChild(finalizedText);

            const removeBtn = document.createElement("button");
            removeBtn.className = "delete-btn";
            removeBtn.textContent = "Remove";
            removeBtn.addEventListener("click", () => rejectBooking(booking.id));
            tdActions.appendChild(removeBtn);
        } 
        else {
            const pendingText = document.createElement("span");
            pendingText.className = "status-pending-admin";
            pendingText.textContent = "Waiting for Client";
            tdActions.appendChild(pendingText);
        }

        tr.appendChild(tdActions);
        bookingsTableBody.appendChild(tr);
    });
}


// --- DYNAMIC DATABASE CRUDS (DELETE & PATCH/PUT) ---

async function deleteRequest(id) {
    const isConfirmed = confirm("Are you sure you want to permanently delete this request?");
    if (!isConfirmed) return;

    try {
        const response = await fetch(`${API_BASE_URL}/requests/${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error();
        fetchAdminDashboardData();
    } catch (err) {
        alert("Failed to delete request.");
    }
}

async function deleteProvider(id) {
    const isConfirmed = confirm("Are you sure you want to remove this verified provider?");
    if (!isConfirmed) return;

    try {
        const response = await fetch(`${API_BASE_URL}/providers/${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error();
        fetchAdminDashboardData();
    } catch (err) {
        alert("Failed to remove provider.");
    }
}

async function rejectBooking(id) {
    const isConfirmed = confirm("Are you sure you want to reject/remove this help offer?");
    if (!isConfirmed) return;

    try {
        const response = await fetch(`${API_BASE_URL}/bookings/${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error();
        fetchAdminDashboardData();
    } catch (err) {
        alert("Failed to reject offer.");
    }
}

async function approveBookingMatch(id) {
    try {
        // A. Fetch the booking first to find the associated requestId (GET)
        const bookingRes = await fetch(`${API_BASE_URL}/bookings/${id}`);
        if (!bookingRes.ok) throw new Error();
        const bookingData = await bookingRes.json();

        // B. Update booking status to "Approved" (PATCH)
        const approveResponse = await fetch(`${API_BASE_URL}/bookings/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Approved" })
        });

        if (!approveResponse.ok) throw new Error();

        // C. Update the associated Request status to "Completed" (PATCH)
        // This automatically hides it from the student home board in real-time!
        await fetch(`${API_BASE_URL}/requests/${bookingData.requestId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Completed" })
        });

        alert("Match officially approved! Booking finalized and request marked as completed.");
        fetchAdminDashboardData();
    } catch (err) {
        alert("Failed to approve match.");
    }
}


// --- DYNAMIC REQUEST EDIT FORM CONTROLS (PUT) ---

function loadRequestIntoEditForm(req) {
    editSection.classList.remove("hidden");
    document.getElementById("edit-id").value = req.id;
    document.getElementById("edit-title").value = req.title;
    document.getElementById("edit-description").value = req.description;
    document.getElementById("edit-category").value = req.category;
    document.getElementById("edit-deadline").value = req.deadline;
    document.getElementById("edit-budget").value = req.budget;
    document.getElementById("edit-status").value = req.status;
    editSection.scrollIntoView({ behavior: "smooth" });
}

if (editForm) {
    editForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const id = document.getElementById("edit-id").value;

        const updatedData = {
            title: document.getElementById("edit-title").value,
            description: document.getElementById("edit-description").value,
            category: document.getElementById("edit-category").value,
            deadline: document.getElementById("edit-deadline").value,
            budget: Number(document.getElementById("edit-budget").value),
            status: document.getElementById("edit-status").value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/requests/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedData)
            });

            if (!response.ok) throw new Error();
            editSection.classList.add("hidden");
            fetchAdminDashboardData();
        } catch (err) {
            alert("Failed to save request changes.");
        }
    });
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
        editSection.classList.add("hidden");
        editForm.reset();
    });
}


// --- LOADERS AND ERROR TIMEOUT HANDLERS ---

function showLoader(loadId, errorId, show) {
    const loader = document.getElementById(loadId);
    const error = document.getElementById(errorId);
    if (loader) loader.classList.toggle("hidden", !show);
    if (error) error.classList.add("hidden");
}

function showError(loadId, errorId) {
    const loader = document.getElementById(loadId);
    const error = document.getElementById(errorId);
    if (loader) loader.classList.add("hidden");
    if (error) error.classList.remove("hidden");
}