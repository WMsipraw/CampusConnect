// 1. Global API Configuration
const API_BASE_URL = "http://localhost:3000";

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

document.addEventListener("DOMContentLoaded", () => {
    fetchAdminDashboardData();
});

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
            fetchAdminDashboardData();
        } catch (error) {
            alert("Failed to save provider.");
        }
    });
}

async function fetchAdminDashboardData() {
    showLoader("admin-requests-loading", "admin-requests-error", true);
    showLoader("admin-providers-loading", "admin-providers-error", true);
    showLoader("admin-bookings-loading", "admin-bookings-error", true);

    try {
        const [requestsRes, providersRes, bookingsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/requests`),
            fetch(`${API_BASE_URL}/providers`),
            fetch(`${API_BASE_URL}/bookings`)
        ]);

        if (!requestsRes.ok || !providersRes.ok || !bookingsRes.ok) throw new Error();

        const requests = await requestsRes.json();
        const providers = await providersRes.json();
        const bookings = await bookingsRes.json();

        calculateAdminStats(requests, bookings);
        renderRequestsTable(requests);
        renderProvidersTable(providers);
        renderBookingsTable(bookings);

        showLoader("admin-requests-loading", "admin-requests-error", false);
        showLoader("admin-providers-loading", "admin-providers-error", false);
        showLoader("admin-bookings-loading", "admin-bookings-error", false);

    } catch (error) {
        showError("admin-requests-loading", "admin-requests-error");
        showError("admin-providers-loading", "admin-providers-error");
        showError("admin-bookings-loading", "admin-bookings-error");
    }
}

function calculateAdminStats(requests, bookings) {
    document.getElementById("stat-total-requests").textContent = requests.length;
    const approvedCount = bookings.filter(b => b.status === "Approved").length;
    document.getElementById("stat-approved-requests").textContent = approvedCount;
    const pendingCount = bookings.filter(b => b.status === "Accepted by Client, Pending Admin Approval").length;
    document.getElementById("stat-pending-approvals").textContent = pendingCount;
}

// --- TABLE 1: RENDERS REQUEST BOARD (Task 1 & 2 Completed) ---
function renderRequestsTable(requestsArray) {
    requestsTableBody.textContent = "";

    if (requestsArray.length === 0) {
        requestsTableBody.innerHTML = `<tr><td colspan="6" class="status-message">No requests listed.</td></tr>`;
        return;
    }

    const today = new Date();
    today.setHours(0,0,0,0);

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

        // Task 1: Added deadline text cell render
        const tdDeadline = document.createElement("td");
        tdDeadline.textContent = req.deadline;
        tr.appendChild(tdDeadline);

        // Task 2: Calculate Expired Requests (Strict deadline math)
        const deadlineDate = new Date(req.deadline);
        deadlineDate.setHours(0,0,0,0);
        const isExpired = deadlineDate < today && req.status !== "Completed";

        const tdStatus = document.createElement("td");
        if (isExpired) {
            tdStatus.textContent = `${req.status} (Expired)`;
            tdStatus.style.color = "#c0392b";
            tdStatus.style.fontWeight = "bold";
        } else {
            tdStatus.textContent = req.status;
        }
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

function renderProvidersTable(providersArray) {
    providersTableBody.textContent = "";

    if (providersArray.length === 0) {
        providersTableBody.innerHTML = `<tr><td colspan="5" class="status-message">No providers listed.</td></tr>`;
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

function renderBookingsTable(bookingsArray) {
    bookingsTableBody.textContent = "";

    if (bookingsArray.length === 0) {
        bookingsTableBody.innerHTML = `<tr><td colspan="6" class="status-message">No bookings listed.</td></tr>`;
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

        if (booking.status === "Accepted by Client, Pending Admin Approval") {
            const approveBtn = document.createElement("button");
            approveBtn.className = "edit-btn";
            approveBtn.textContent = "Approve Match";
            approveBtn.addEventListener("click", () => approveBookingMatch(booking.id));
            tdActions.appendChild(approveBtn);

            const rejectBtn = document.createElement("button");
            rejectBtn.className = "delete-btn";
            rejectBtn.textContent = "Reject";
            rejectBtn.addEventListener("click", () => rejectBooking(booking.id));
            tdActions.appendChild(rejectBtn);
        } else if (booking.status === "Approved") {
            const span = document.createElement("span");
            span.className = "status-approved";
            span.textContent = "Approved";
            tdActions.appendChild(span);
        } else {
            const span = document.createElement("span");
            span.className = "status-pending-admin";
            span.textContent = "Pending Client";
            tdActions.appendChild(span);
        }

        tr.appendChild(tdActions);
        bookingsTableBody.appendChild(tr);
    });
}

// --- DATABASE SYNCS (Updated with mandatory response.ok check validations) ---
async function deleteRequest(id) {
    if (!confirm("Are you sure?")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/requests/${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error();
        fetchAdminDashboardData();
    } catch (err) {
        alert("Failed to delete.");
    }
}

async function deleteProvider(id) {
    if (!confirm("Are you sure?")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/providers/${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error();
        fetchAdminDashboardData();
    } catch (err) {
        alert("Failed to delete.");
    }
}

async function rejectBooking(id) {
    if (!confirm("Are you sure?")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/bookings/${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error();
        fetchAdminDashboardData();
    } catch (err) {
        alert("Failed to reject.");
    }
}

async function approveBookingMatch(id) {
    try {
        const bookingRes = await fetch(`${API_BASE_URL}/bookings/${id}`);
        // Ensure response is ok prior to converting content
        if (!bookingRes.ok) throw new Error();
        const booking = await bookingRes.json();

        const patchBookingRes = await fetch(`${API_BASE_URL}/bookings/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Approved" })
        });
        if (!patchBookingRes.ok) throw new Error();

        const patchReqRes = await fetch(`${API_BASE_URL}/requests/${booking.requestId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Completed" })
        });
        if (!patchReqRes.ok) throw new Error();

        alert("Booking formally finalized!");
        fetchAdminDashboardData();
    } catch (err) {
        alert("Failed to approve.");
    }
}

// --- DYNAMIC REQUEST FORM MODIFICATIONS (PATCH Replacement) ---
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

        // PATCH payload (Prevents resetting user fields like userId/userName)
        const updatedData = {
            title: document.getElementById("edit-title").value,
            description: document.getElementById("edit-description").value,
            category: document.getElementById("edit-category").value,
            deadline: document.getElementById("edit-deadline").value,
            budget: Number(document.getElementById("edit-budget").value),
            status: document.getElementById("edit-status").value
        };

        try {
            // Task 3: Swapped PUT with PATCH to avoid deleting existing properties
            const response = await fetch(`${API_BASE_URL}/requests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedData)
            });

            if (!response.ok) throw new Error();
            editSection.classList.add("hidden");
            fetchAdminDashboardData();
        } catch (err) {
            alert("Failed to edit request.");
        }
    });
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
        editSection.classList.add("hidden");
    });
}

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