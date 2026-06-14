// 1. Global API Configuration
const API_BASE_URL = "http://localhost:3000";

// --- DOM ELEMENTS / SELECTORS ---
const userProfileSpan = document.querySelector(".user-profile");
const logoutBtns = document.querySelectorAll(".logout-btn");

// --- LIGHTWEIGHT HASH-BASED ROUTER ---
window.addEventListener("hashchange", routeSPA);
window.addEventListener("DOMContentLoaded", () => {
    routeSPA();
    setupGlobalEventListeners();
});

async function routeSPA() {
    const hash = window.location.hash || "#landing";
    
    // Hide all view sections
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.add("hidden"));
    
    // Header management logic
    const loggedOutHeader = document.getElementById("logged-out-header");
    const loggedInHeader = document.getElementById("logged-in-header");

    const session = localStorage.getItem("currentUser");
    const parsedSession = session ? JSON.parse(session) : null;

    if (parsedSession) {
        loggedOutHeader.classList.add("hidden");
        loggedInHeader.classList.remove("hidden");
        document.querySelectorAll(".user-profile").forEach(el => el.textContent = parsedSession.fullname);
    } else {
        loggedOutHeader.classList.remove("hidden");
        loggedInHeader.classList.add("hidden");
    }

    // SPA routing logic
    if (hash === "#landing") {
        document.getElementById("view-landing").classList.remove("hidden");
    } else if (hash === "#login") {
        if (parsedSession) { window.location.hash = "#home"; return; }
        document.getElementById("view-login").classList.remove("hidden");
    } else if (hash === "#register") {
        if (parsedSession) { window.location.hash = "#home"; return; }
        document.getElementById("view-register").classList.remove("hidden");
    } else if (hash.startsWith("#home")) {
        if (!parsedSession) { window.location.hash = "#login"; return; }
        document.getElementById("view-home").classList.remove("hidden");
        
        // Fetch only if empty, else re-evaluate UI controls
        if (activeRequests.length === 0) {
            await fetchActiveRequests();
        } else {
            setupRequestsControls();
        }

        // Fulfill scroll requests smoothly
        if (hash === "#home-services") {
            const el = document.querySelector(".services-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
        } else if (hash === "#home-requests") {
            const el = document.querySelector(".requests-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
        } else if (hash === "#home-about") {
            const el = document.querySelector("footer");
            if (el) el.scrollIntoView({ behavior: "smooth" });
        } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    } else if (hash === "#create-request") {
        if (!parsedSession) { window.location.hash = "#login"; return; }
        document.getElementById("view-create-request").classList.remove("hidden");
    } else if (hash.startsWith("#request-details")) {
        if (!parsedSession) { window.location.hash = "#login"; return; }
        document.getElementById("view-request-details").classList.remove("hidden");
        const params = new URLSearchParams(hash.split("?")[1]);
        fetchRequestDetails(params.get("id"));
    } else if (hash === "#profile") {
        if (!parsedSession) { window.location.hash = "#login"; return; }
        document.getElementById("view-profile").classList.remove("hidden");
        loadProfileData();
    }
}

// --- CORE EVENT LISTENERS INITIALIZATION ---
function setupGlobalEventListeners() {
    // A. Registration Submission Handler
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            clearInlineErrors();

            const fullname = document.getElementById("register-fullname").value.trim();
            const email = document.getElementById("register-email").value.trim();
            const universityId = document.getElementById("register-university_id").value.trim();
            const password = document.getElementById("register-password").value;
            const confirmPassword = document.getElementById("register-confirm_password").value;

            let isValid = true;
            
            // 1. Email structure regex format validation check
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showInlineError("register-email", "Please enter a valid email structure (e.g. user@university.edu).");
                isValid = false;
            }
            if (password !== confirmPassword) {
                showInlineError("register-confirm_password", "Passwords do not match!");
                isValid = false;
            }
            if (password.length < 6) {
                showInlineError("register-password", "Password must be at least 6 characters.");
                isValid = false;
            }

            if (!isValid) return;

            try {
                const checkResponse = await fetch(`${API_BASE_URL}/users?email=${email}`);
                if (!checkResponse.ok) throw new Error();
                const existing = await checkResponse.json();
                if (existing.length > 0) {
                    showInlineError("register-email", "This email is already registered.");
                    return;
                }

                const newUser = { fullname, email, universityId, password };
                const response = await fetch(`${API_BASE_URL}/users`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newUser)
                });

                if (!response.ok) throw new Error();
                window.location.hash = "#login";
            } catch (err) {
                // Replaced default alert box with an inline validation notification
                showInlineError("register-form", "Server connection failed. Unable to process registration.");
            }
        });
    }

    // B. Login Submission Handler
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            clearInlineErrors();

            const email = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value;

            let isValid = true;
            
            // 2. Email format validation check for login inputs
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showInlineError("login-email", "Please enter a valid email address format.");
                isValid = false;
            }

            if (!isValid) return;

            try {
                const response = await fetch(`${API_BASE_URL}/users?email=${email}`);
                if (!response.ok) throw new Error();
                const matched = await response.json();

                if (matched.length === 0 || matched[0].password !== password) {
                    showInlineError("login-password", "Invalid email or password.");
                    return;
                }

                const user = matched[0];
                localStorage.setItem("currentUser", JSON.stringify({
                    id: user.id,
                    fullname: user.fullname,
                    email: user.email,
                    universityId: user.universityId
                }));
                window.location.hash = "#home";
            } catch (err) {
                // Replaced standard alert with inline error message block
                showInlineError("login-form", "Database authentication failed. Server is currently unreachable.");
            }
        });
    }

    // C. Logout Handlers
    logoutBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            localStorage.removeItem("currentUser");
            window.location.hash = "#landing";
        });
    });

    // D. Create Request Handler
    const requestForm = document.getElementById("request-form");
    if (requestForm) {
        requestForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            clearInlineErrors();

            const title = document.getElementById("request-title").value.trim();
            const description = document.getElementById("request-description").value.trim();
            const category = document.getElementById("request-category").value;
            const deadline = document.getElementById("request-deadline").value;
            const budget = Number(document.getElementById("request-budget").value);

            let isValid = true;
            if (title.length < 5) {
                showInlineError("request-title", "Title must be at least 5 characters.");
                isValid = false;
            }
            if (description.length < 15) {
                showInlineError("request-description", "Description must be at least 15 characters.");
                isValid = false;
            }
            if (budget <= 0) {
                showInlineError("request-budget", "Budget must be greater than 0.");
                isValid = false;
            }

            // 3. Deadline date verification format check
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const deadlineDate = new Date(deadline);
            deadlineDate.setHours(0, 0, 0, 0);
            if (deadlineDate < today) {
                showInlineError("request-deadline", "The selected deadline cannot be in the past.");
                isValid = false;
            }

            if (!isValid) return;

            const user = JSON.parse(localStorage.getItem("currentUser"));
            const payload = {
                title, description, category, deadline, budget,
                userId: user.id,
                userName: user.fullname,
                status: "Open"
            };

            try {
                const response = await fetch(`${API_BASE_URL}/requests`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error();
                requestForm.reset();
                
                // Clear the cached global active requests list to trigger an automatic re-render on redirection
                activeRequests = [];
                
                window.location.hash = "#home";
            } catch (err) {
                // Replaced alert popup box with inline validation notification
                showInlineError("request-form", "Submission failed. Please check server availability.");
            }
        });
    }

    // E. Smooth Scroll Landing Link Triggers
    const categoriesLink = document.querySelector("a[href='#categories']");
    const howItWorksLink = document.querySelector("a[href='#how-it-works']");
    if (categoriesLink) {
        categoriesLink.addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("categories").scrollIntoView({ behavior: "smooth" });
        });
    }
    if (howItWorksLink) {
        howItWorksLink.addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("how-it-works").scrollIntoView({ behavior: "smooth" });
        });
    }

    // F. Smooth Scroll Welcome Action
    const exploreBtn = document.querySelector(".explore-btn");
    if (exploreBtn) {
        exploreBtn.addEventListener("click", () => {
            window.location.hash = "#home-requests";
        });
    }
}

// --- MAIN REQUESTS BOARD ENGINE ---
let activeRequests = [];
async function fetchActiveRequests() {
    const list = document.getElementById("requests-list");
    list.innerHTML = `<div class="status-message">Loading active board requests...</div>`;

    try {
        const response = await fetch(`${API_BASE_URL}/requests`);
        if (!response.ok) throw new Error();
        const raw = await response.json();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter out completed and expired requests
        activeRequests = raw.filter(req => {
            const isCompleted = req.status === "Completed";
            const deadlineDate = new Date(req.deadline);
            deadlineDate.setHours(0, 0, 0, 0);
            const isExpired = deadlineDate < today;

            return !isCompleted && !isExpired;
        });

        activeRequests.forEach((r, i) => r.seq = i);

        renderRequestsBoard(activeRequests);
        setupRequestsControls();

    } catch (err) {
        list.innerHTML = `<div class="status-message error-message">Could not load campus requests board.</div>`;
    }
}

function renderRequestsBoard(requestsArray) {
    const container = document.getElementById("requests-list");
    container.textContent = "";

    if (requestsArray.length === 0) {
        const empty = document.createElement("div");
        empty.className = "status-message";
        empty.textContent = "No active requests match your selection.";
        container.appendChild(empty);
        return;
    }

    requestsArray.forEach(req => {
        const card = document.createElement("div");
        card.className = "service-card";

        const today = new Date();
        today.setHours(0,0,0,0);
        const limit = new Date(req.deadline);
        limit.setHours(0,0,0,0);
        const daysLeft = Math.ceil((limit - today) / (1000 * 60 * 60 * 24));

        if (daysLeft >= 0 && daysLeft <= 2) {
            const badge = document.createElement("span");
            badge.className = "badge-expiring";
            badge.textContent = "Expiring Soon!";
            card.appendChild(badge);
        }

        const title = document.createElement("h3");
        title.textContent = req.title;
        card.appendChild(title);

        const desc = document.createElement("p");
        desc.className = "request-desc";
        desc.textContent = req.description;
        card.appendChild(desc);

        const meta = document.createElement("div");
        meta.className = "request-meta";
        meta.innerHTML = `
            <p><strong>Category:</strong> ${req.category}</p>
            <p><strong>Budget:</strong> Rs. ${req.budget}</p>
            <p><strong>Deadline:</strong> ${req.deadline}</p>
            <p><strong>Client:</strong> ${req.userName}</p>
        `;
        card.appendChild(meta);

        const action = document.createElement("a");
        action.className = "contact-btn";
        action.href = `#request-details?id=${req.id}`;
        action.textContent = "Contact Client";
        card.appendChild(action);

        container.appendChild(card);
    });
}

function setupRequestsControls() {
    const filterSelect = document.getElementById("filter-category");
    const sortCat = document.getElementById("sort-category");
    const sortNew = document.getElementById("sort-newest");
    const sortBud = document.getElementById("sort-budget");

    const applyControls = () => {
        let selection = [...activeRequests];
        
        if (filterSelect && filterSelect.value !== "All") {
            selection = selection.filter(r => r.category === filterSelect.value);
        }

        const activeBtn = document.querySelector(".sort-btn.active");
        if (activeBtn) {
            if (activeBtn.id === "sort-category") {
                selection.sort((a,b) => a.category.localeCompare(b.category));
            } else if (activeBtn.id === "sort-newest") {
                selection.sort((a,b) => b.seq - a.seq);
            } else if (activeBtn.id === "sort-budget") {
                selection.sort((a,b) => b.budget - a.budget);
            }
        }
        renderRequestsBoard(selection);
    };

    if (filterSelect) {
        filterSelect.onchange = applyControls;
    }

    const toggleBtnState = (btn) => {
        [sortCat, sortNew, sortBud].forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        applyControls();
    };

    if (sortCat) sortCat.onclick = () => toggleBtnState(sortCat);
    if (sortNew) sortNew.onclick = () => toggleBtnState(sortNew);
    if (sortBud) sortBud.onclick = () => toggleBtnState(sortBud);
}

// --- REQUEST DETAILS & PROPOSALS ---
let loadedRequest = null;
async function fetchRequestDetails(id) {
    const formSec = document.querySelector(".offer-form-section");
    formSec.classList.add("hidden"); // Prevents flashing by forcing elements to remain hidden

    try {
        const response = await fetch(`${API_BASE_URL}/requests/${id}`);
        if (!response.ok) throw new Error();
        loadedRequest = await response.json();

        document.getElementById("details-title").textContent = loadedRequest.title;
        document.getElementById("details-desc").textContent = loadedRequest.description;
        document.getElementById("details-category").textContent = loadedRequest.category;
        document.getElementById("details-budget").textContent = `Rs. ${loadedRequest.budget}`;
        document.getElementById("details-deadline").textContent = loadedRequest.deadline;
        document.getElementById("details-client").textContent = loadedRequest.userName;

        const userRes = await fetch(`${API_BASE_URL}/users/${loadedRequest.userId}`);
        if (userRes.ok) {
            const userData = await userRes.json();
            loadedRequest.clientEmail = userData.email;
        }

        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        if (currentUser) {
            // Check 1: User is accessing their own posting
            if (currentUser.id === loadedRequest.userId) {
                return; // Silently stops and keeps the offer form hidden
            }

            // Check 2: Offer limit bounds (One proposal per candidate)
            const bookingCheck = await fetch(`${API_BASE_URL}/bookings?requestId=${id}&providerId=${currentUser.id}`);
            if (bookingCheck.ok) {
                const existing = await bookingCheck.json();
                if (existing.length > 0) {
                    return; // Silently stops and keeps the offer form hidden
                }
            }

            // If clean checks, safely display options
            formSec.classList.remove("hidden");
        }

    } catch (err) {
        document.getElementById("details-title").textContent = "Failed to load details.";
    }
}

// Offer Submit Controller
const offerForm = document.getElementById("offer-form");
if (offerForm) {
    offerForm.onsubmit = async function (e) {
        e.preventDefault();
        clearInlineErrors();
        
        const msg = document.getElementById("offer-message").value.trim();
        const curr = JSON.parse(localStorage.getItem("currentUser"));

        const payload = {
            requestId: loadedRequest.id,
            requestTitle: loadedRequest.title,
            clientId: loadedRequest.userId,
            clientName: loadedRequest.userName,
            clientEmail: loadedRequest.clientEmail,
            providerId: curr.id,
            providerName: curr.fullname,
            providerEmail: curr.email,
            message: msg,
            status: "Pending Client Confirmation"
        };

        try {
            const res = await fetch(`${API_BASE_URL}/bookings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error();
            alert("Offer successfully delivered!");
            offerForm.reset();
            window.location.hash = "#home";
        } catch (err) {
            // Replaced default alert boxes with local inline validation notifications
            showInlineError("offer-form", "Could not process booking offer. Server connection failed.");
        }
    };
}

// --- PROFILE LOADER ENGINE ---
async function loadProfileData() {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    document.getElementById("profile-name").textContent = user.fullname;
    document.getElementById("profile-email-header").textContent = user.email;
    document.getElementById("profile-id").textContent = user.universityId;
    document.getElementById("profile-email").textContent = user.email;

    const list = document.getElementById("offers-received-list");
    list.innerHTML = `<div class="status-message">Loading received bookings...</div>`;

    try {
        const response = await fetch(`${API_BASE_URL}/bookings?clientId=${user.id}`);
        if (!response.ok) throw new Error();
        const bookings = await response.json();
        renderProfileReceivedBookings(bookings);
    } catch (err) {
        list.innerHTML = `<div class="status-message error-message">Failed to load offers.</div>`;
    }
}

function renderProfileReceivedBookings(array) {
    const list = document.getElementById("offers-received-list");
    list.textContent = "";

    if (array.length === 0) {
        list.innerHTML = `<p class="status-message">You haven't received any help offers yet.</p>`;
        return;
    }

    array.forEach(offer => {
        const item = document.createElement("div");
        item.className = "activity-item";
        item.innerHTML = `
            <h3 class="profile-offer-title">Offer on: ${offer.requestTitle}</h3>
            <p class="profile-offer-meta"><strong>Helper:</strong> ${offer.providerName}</p>
            <p class="profile-offer-meta"><strong>Message:</strong> "${offer.message}"</p>
            <p class="profile-offer-meta"><strong>Status:</strong> ${offer.status}</p>
        `;

        if (offer.status === "Pending Client Confirmation") {
            const btn = document.createElement("button");
            btn.className = "contact-btn";
            btn.style.marginTop = "10px";
            btn.textContent = "Accept Offer";
            btn.onclick = async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/bookings/${offer.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "Accepted by Client, Pending Admin Approval" })
                    });
                    if (!res.ok) throw new Error();
                    alert("Offer accepted! Sent to Admin for final approval.");
                    loadProfileData();
                } catch (err) {
                    alert("Could not update booking status.");
                }
            };
            item.appendChild(btn);
        } else if (offer.status === "Approved") {
            const info = document.createElement("p");
            info.className = "contact-highlight";
            info.innerHTML = `<strong>Connect with Helper at:</strong> ${offer.providerEmail}`;
            item.appendChild(info);
        }

        list.appendChild(item);
    });
}

// --- UTILITY ERROR CONTROLLERS ---
function showInlineError(id, msg) {
    const el = document.getElementById(id);
    const err = document.createElement("small");
    err.className = "inline-error-text";
    err.textContent = msg;
    el.parentNode.insertBefore(err, el.nextSibling);
}

function clearInlineErrors() {
    document.querySelectorAll(".inline-error-text").forEach(el => el.remove());
}

// --- POPULAR SERVICES DYNAMIC MODALS ---
const popularCards = document.querySelectorAll(".services-section .service-card");
popularCards.forEach(card => {
    const btn = card.querySelector("button");
    const title = card.querySelector("h3").textContent;
    if (btn) {
        btn.onclick = async () => {
            let cat = title === "DBMS Tutoring" ? "Tutoring" : (title === "Assignment Formatting" ? "Other" : title);
            try {
                const response = await fetch(`${API_BASE_URL}/providers?category=${encodeURIComponent(cat)}`);
                if (!response.ok) throw new Error();
                const list = await response.json();
                openModal(title, list);
            } catch (err) {
                alert("Unable to fetch providers.");
            }
        };
    }
});

function openModal(title, list) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const content = document.createElement("div");
    content.className = "modal-content";
    content.innerHTML = `<h2>${title} Providers</h2><p>Verified campus partners available in your community.</p>`;

    if (list.length === 0) {
        content.innerHTML += `<p class="status-message">No verified campus providers currently listed.</p>`;
    } else {
        list.forEach(p => {
            const div = document.createElement("div");
            div.className = "provider-modal-item";
            div.innerHTML = `
                <h4>${p.name}</h4>
                <p class="profile-offer-meta">${p.availability}</p>
                <a class="provider-email-btn" href="mailto:${p.email}">Email ${p.name.split(" ")[0]}</a>
            `;
            content.appendChild(div);
        });
    }

    const closeBtn = document.createElement("button");
    closeBtn.className = "cancel-btn";
    closeBtn.style.marginTop = "15px";
    closeBtn.textContent = "Close";
    closeBtn.onclick = () => backdrop.remove();
    content.appendChild(closeBtn);

    backdrop.appendChild(content);
    document.body.appendChild(backdrop);
}

// --- AUTOCOMPLETE DEBOUNCED SEARCH ENGINE ---
const searchInput = document.getElementById("search-input");
const searchDropdown = document.getElementById("search-dropdown");
if (searchInput && searchDropdown) {
    let timer;
    searchInput.oninput = () => {
        clearTimeout(timer);
        const query = searchInput.value.trim().toLowerCase();
        timer = setTimeout(async () => {
            if (query.length < 2) {
                searchDropdown.classList.add("hidden");
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/requests`);
                if (response.ok) {
                    const list = await response.json();
                    const filtered = list.filter(r => r.title.toLowerCase().includes(query) && r.status !== "Completed");
                    renderSearchDropdown(filtered);
                }
            } catch (err) {
                // Removed console.error debug logger statement to satisfy code requirements
            }
        }, 300);
    };

    function renderSearchDropdown(array) {
        searchDropdown.textContent = "";
        if (array.length === 0) {
            const item = document.createElement("div");
            item.className = "search-item-link search-no-results";
            item.textContent = "No matching requests found.";
            searchDropdown.appendChild(item);
        } else {
            array.forEach(item => {
                const a = document.createElement("a");
                a.className = "search-item-link";
                a.href = `#request-details?id=${item.id}`;
                a.textContent = item.title;
                searchDropdown.appendChild(a);
            });
        }
        searchDropdown.classList.remove("hidden");
    }

    document.addEventListener("click", (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.add("hidden");
        }
    });
}