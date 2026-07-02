// app.js
const API_BASE_URL = "http://127.0.0.1:8000/api";

const logoutBtns = document.querySelectorAll(".logout-btn");
const searchInput = document.getElementById("search-input");
const searchDropdown = document.getElementById("search-dropdown");

// app.js (Updated secureFetch)
async function secureFetch(url, options = {}) {
    const session = localStorage.getItem("currentUser");
    const parsed = session ? JSON.parse(session) : null;
    
    if (!options.headers) {
        options.headers = {};
    }
    
    if (options.body && !options.headers["Content-Type"]) {
        options.headers["Content-Type"] = "application/json";
    }
    
    // Check if the target is a public route
    const isPublicRoute = url.includes("/login/") || url.includes("/register/");
    
    // Only inject token key into Request headers if NOT on public registration/login endpoints
    if (parsed && parsed.token && !isPublicRoute) {
        options.headers["Authorization"] = `Token ${parsed.token}`;
    }
    
    return fetch(url, options);
}

// Custom Professional Notification Engine
function showNotification(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add("show");
    }, 50);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// Input Sanitization Helper against XSS Inject Attacks
function sanitize(str) {
    if (!str) return "";
    const temp = document.createElement("div");
    temp.textContent = str;
    return temp.innerHTML;
}

// --- LIGHTWEIGHT ROUTER WITH SECURITY ROUTE GUARDS ---
window.addEventListener("hashchange", routeSPA);
document.addEventListener("DOMContentLoaded", () => {
    routeSPA();
    setupGlobalEventListeners();
    setupServiceCardContacts();
    setupLiveSearch();
});

// app.js (Updated routeSPA)
async function routeSPA() {
    const hash = window.location.hash || "#landing";
    
    // Hide all view sections
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.add("hidden"));
    
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

    // Security Verification / Redirection Boundaries
    const protectedRoutes = ["#home", "#create-request", "#profile", "#request-details"];
    const isProtected = protectedRoutes.some(route => hash.startsWith(route));

    if (isProtected && !parsedSession) {
        window.location.hash = "#login";
        showNotification("Security alert: Authentication required.", "error");
        return;
    }

    // Fast-track logged-in sessions to Home away from Landing page
    if (parsedSession && (hash === "#landing" || hash === "" || hash === "#login" || hash === "#register")) {
        window.location.hash = "#home";
        return;
    }

    // SPA routing engine
    if (hash === "#landing" || hash === "#categories" || hash === "#how-it-works") {
        document.getElementById("view-landing").classList.remove("hidden");
        if (hash !== "#landing") {
            const targetId = hash.substring(1);
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                setTimeout(() => {
                    targetEl.scrollIntoView({ behavior: "smooth" });
                }, 100); // 100ms delay lets browser paint layout
            }
        }
    } else if (hash === "#login") {
        document.getElementById("view-login").classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" }); // Ensure user is scrolled to form on transition
    } else if (hash === "#register") {
        document.getElementById("view-register").classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" }); // Ensure user is scrolled to form on transition
    } else if (hash.startsWith("#home")) {
        document.getElementById("view-home").classList.remove("hidden");
        
        if (activeRequests.length === 0) {
            await fetchActiveRequests();
        } else {
            setupRequestsControls();
        }

        // Layout-paint delay to ensure smooth scrolling and accurate destination coordinates
        setTimeout(() => {
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
        }, 100);
    } else if (hash === "#create-request") {
        document.getElementById("view-create-request").classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (hash.startsWith("#request-details")) {
        document.getElementById("view-request-details").classList.remove("hidden");
        const params = new URLSearchParams(hash.split("?")[1]);
        fetchRequestDetails(params.get("id"));
        window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (hash === "#profile") {
        document.getElementById("view-profile").classList.remove("hidden");
        loadProfileData();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

// --- CORE EVENT LISTENERS INITIALIZATION ---
function setupGlobalEventListeners() {
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
        
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showInlineError("register-email", "Please enter a valid email structure.");
                isValid = false;
            }
            if (password !== confirmPassword) {
                showInlineError("register-confirm_password", "Passwords do not match.");
                isValid = false;
            }
            if (password.length < 6) {
                showInlineError("register-password", "Password must be at least 6 characters.");
                isValid = false;
            }

            if (!isValid) return;

            const newUser = { fullname, email, university_id: universityId, password, username: email };

            try {
                const response = await secureFetch(`${API_BASE_URL}/register/`, {
                    method: "POST",
                    body: JSON.stringify(newUser)
                });

                if (!response.ok) {
                    const errorDetails = await response.json().catch(() => ({}));
                    if (errorDetails.email) {
                        showInlineError("register-email", "This email is already registered.");
                    } else if (errorDetails.university_id) {
                        showInlineError("register-university_id", "This University ID is already registered.");
                    } else if (errorDetails.username) {
                        showInlineError("register-email", "This email/username is already in use.");
                    } else {
                        const firstError = Object.values(errorDetails).flat()[0];
                        showNotification(firstError || "Registration failed. Please try again.", "error");
                    }
                    return;
                }
            
                showNotification("Registration successful! Please log in.");
                registerForm.reset(); 
                window.location.hash = "#login"; 
            } catch (err) {
                showNotification(err.message, "error");
            }
        });
    }

    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            clearInlineErrors();

            const email = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value;

            try {
                const response = await secureFetch(`${API_BASE_URL}/login/`, {
                    method: "POST",
                    body: JSON.stringify({ email, password })
                });

                if (!response.ok) {
                    const errorDetails = await response.json().catch(() => ({}));
                    const msg = errorDetails.error || "Invalid credentials entered.";
                    showNotification(msg, "error");
                    return;
                }

                const user = await response.json();
                localStorage.setItem("currentUser", JSON.stringify(user));
                showNotification(`Welcome back, ${user.fullname}!`);
                window.location.hash = "#home";
            } catch (err) {
                showNotification("Server communication failed.", "error");
            }
        });
    }

    logoutBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            localStorage.removeItem("currentUser");
            showNotification("Logged out successfully.");
            window.location.hash = "#landing";
        });
    });

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

            if (!isValid) return;

            const user = JSON.parse(localStorage.getItem("currentUser"));
            const payload = {
                title, description, category, deadline, budget,
                client: user.id,
                status: "Open"
            };

            try {
                const response = await secureFetch(`${API_BASE_URL}/requests/`, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error("Could not submit requested post.");
                requestForm.reset();
                activeRequests = []; 
                showNotification("Campus help request posted successfully!");
                window.location.hash = "#home";
            } catch (err) {
                showNotification(err.message, "error");
            }
        });
    }

    const exploreBtn = document.querySelector(".explore-btn");
    if (exploreBtn) {
        exploreBtn.addEventListener("click", () => {
            window.location.hash = "#home-services";
        });
    }
}

// --- ACTIVE REQUESTS BOARD ENGINE ---
let activeRequests = [];
async function fetchActiveRequests() {
    const list = document.getElementById("requests-list");
    list.innerHTML = `<div class="status-message">Loading active board requests...</div>`;

    try {
        const response = await secureFetch(`${API_BASE_URL}/requests/`);
        if (!response.ok) throw new Error("Database transit fault.");
        const raw = await response.json();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

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
            <p><strong>Category:</strong> ${sanitize(req.category)}</p>
            <p><strong>Budget:</strong> Rs. ${sanitize(String(req.budget))}</p>
            <p><strong>Deadline:</strong> ${sanitize(req.deadline)}</p>
            <p><strong>Client:</strong> ${sanitize(req.userName)}</p>
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

// --- REQUEST DETAILS & SECURED PROPOSALS SYSTEM ---
let loadedRequest = null;
async function fetchRequestDetails(id) {
    const formSec = document.getElementById("details-offer-section");
    const noticeSec = document.getElementById("details-security-notice");
    
    formSec.classList.add("hidden");
    noticeSec.classList.add("hidden");
    noticeSec.textContent = "";

    try {
        const response = await secureFetch(`${API_BASE_URL}/requests/${id}/`);
        if (!response.ok) throw new Error("The requested post cannot be resolved.");
        loadedRequest = await response.json();

        document.getElementById("details-title").textContent = loadedRequest.title;
        document.getElementById("details-desc").textContent = loadedRequest.description;
        document.getElementById("details-category").textContent = loadedRequest.category;
        document.getElementById("details-budget").textContent = `Rs. ${loadedRequest.budget}`;
        document.getElementById("details-deadline").textContent = loadedRequest.deadline;
        document.getElementById("details-client").textContent = loadedRequest.userName;

        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        if (currentUser) {
            if (currentUser.id === loadedRequest.client) {
                noticeSec.className = "secure-banner";
                noticeSec.textContent = "You posted this request. Track bids inside your Profile dashboard.";
                noticeSec.classList.remove("hidden");
                return;
            }

            const bookingCheck = await secureFetch(`${API_BASE_URL}/bookings/?request=${id}&provider=${currentUser.id}`);
            if (bookingCheck.ok) {
                const existing = await bookingCheck.json();
                if (existing.length > 0) {
                    noticeSec.className = "secure-banner";
                    noticeSec.textContent = "You have already submitted an active offer for this request.";
                    noticeSec.classList.remove("hidden");
                    return;
                }
            }

            formSec.classList.remove("hidden");
        }

    } catch (err) {
        document.getElementById("details-title").textContent = "Request Error";
        document.getElementById("details-desc").textContent = "Unable to fetch request details.";
        showNotification(err.message, "error");
    }
}

const offerForm = document.getElementById("offer-form");
if (offerForm) {
    offerForm.onsubmit = async function (e) {
        e.preventDefault();
        clearInlineErrors();
        
        const msg = document.getElementById("offer-message").value.trim();
        const curr = JSON.parse(localStorage.getItem("currentUser"));

        const payload = {
            request: loadedRequest.id,
            provider: curr.id,
            message: msg,
            status: "Pending Client Confirmation"
        };

        try {
            const res = await secureFetch(`${API_BASE_URL}/bookings/`, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Booking registration failed.");
            }
            
            showNotification("Your proposal has been securely delivered to the client!");
            offerForm.reset();
            window.location.hash = "#home";
        } catch (err) {
            showNotification(err.message, "error");
        }
    };
}

// --- PROFILE LOADER ENGINE ---
async function loadProfileData() {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    if (!user) return;

    document.getElementById("profile-name").textContent = user.fullname;
    document.getElementById("profile-email-header").textContent = user.email;
    document.getElementById("profile-id").textContent = user.universityId;
    document.getElementById("profile-email").textContent = user.email;

    const list = document.getElementById("offers-received-list");
    list.innerHTML = `<div class="status-message">Loading received bookings...</div>`;

    try {
        const response = await secureFetch(`${API_BASE_URL}/bookings/`);
        if (!response.ok) throw new Error("Inbound request query failed.");
        const bookings = await response.json();
        
        const userRequestsRes = await secureFetch(`${API_BASE_URL}/requests/?client=${user.id}`);
        const userRequests = await userRequestsRes.json();
        const userRequestIds = userRequests.map(r => r.id);

        const filteredBookings = bookings.filter(b => userRequestIds.includes(b.request));
        renderProfileReceivedBookings(filteredBookings);
    } catch (err) {
        list.innerHTML = `<div class="status-message error-message">Failed to load offers.</div>`;
    }
}

function renderProfileReceivedBookings(array) {
    const list = document.getElementById("offers-received-list");
    list.textContent = "";

    if (array.length === 0) {
        list.innerHTML = `<p class="status-message">You have not received any proposals yet.</p>`;
        return;
    }

    array.forEach(offer => {
        const item = document.createElement("div");
        item.className = "activity-item";
        
        const title = document.createElement("h3");
        title.className = "profile-offer-title";
        title.textContent = `Offer ID: ${offer.id}`;
        item.appendChild(title);

        const message = document.createElement("p");
        message.className = "profile-offer-meta";
        message.innerHTML = `<strong>Proposal Message:</strong> "${sanitize(offer.message)}"`;
        item.appendChild(message);

        const status = document.createElement("p");
        status.className = "profile-offer-meta";
        status.innerHTML = `<strong>Status:</strong> ${sanitize(offer.status)}`;
        item.appendChild(status);

        if (offer.status === "Pending Client Confirmation") {
            const btn = document.createElement("button");
            btn.className = "contact-btn";
            btn.style.marginTop = "10px";
            btn.textContent = "Accept Offer";
            btn.onclick = async () => {
                try {
                    const res = await secureFetch(`${API_BASE_URL}/bookings/${offer.id}/`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: "Accepted by Client, Pending Admin Approval" })
                    });
                    if (!res.ok) throw new Error("Acceptance protocol synchronization failed.");
                    showNotification("Proposal accepted! Redirected for Moderator Approval.");
                    loadProfileData();
                } catch (err) {
                    showNotification(err.message, "error");
                }
            };
            item.appendChild(btn);
        } else if (offer.status === "Approved") {
            const info = document.createElement("p");
            info.className = "contact-highlight";
            info.innerHTML = `<strong>Match finalized! Please connect through email.</strong>`;
            item.appendChild(info);
        }

        list.appendChild(item);
    });
}

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

// --- Dynamic Verified Campus Providers System ---
function setupServiceCardContacts() {
    const cards = document.querySelectorAll(".services-grid .service-card");
    cards.forEach(card => {
        const titleEl = card.querySelector("h3");
        const buttonEl = card.querySelector("button");
        if (!titleEl || !buttonEl) return;

        const titleText = titleEl.textContent.trim();
        let category = "Other";
        if (titleText.includes("Tutoring")) category = "Tutoring";
        else if (titleText.includes("Programming")) category = "Programming Help";
        else if (titleText.includes("Repair")) category = "Laptop Repair";
        else if (titleText.includes("Photography")) category = "Photography";
        else if (titleText.includes("Design")) category = "Graphic Design";
        else if (titleText.includes("Formatting")) category = "Other";

        buttonEl.addEventListener("click", () => {
            fetchVerifiedProviders(category, titleText);
        });
    });
}

async function fetchVerifiedProviders(category, serviceTitle) {
    try {
        const response = await secureFetch(`${API_BASE_URL}/providers/?category=${category}`);
        if (!response.ok) throw new Error("Could not fetch verified providers.");
        const providers = await response.json();

        showProviderModal(providers, serviceTitle);
    } catch (err) {
        showNotification("Failed to fetch verified providers.", "error");
    }
}

function showProviderModal(providers, serviceTitle) {
    const oldModal = document.getElementById("provider-modal");
    if (oldModal) oldModal.remove();

    const backdrop = document.createElement("div");
    backdrop.id = "provider-modal";
    backdrop.className = "modal-backdrop";

    const content = document.createElement("div");
    content.className = "modal-content";

    const h2 = document.createElement("h2");
    h2.textContent = `Verified Providers: ${serviceTitle}`;
    content.appendChild(h2);

    const pDesc = document.createElement("p");
    
    if (providers.length === 0) {
        pDesc.textContent = "No verified providers are currently listed for this category. Check back later or post an active request!";
        content.appendChild(pDesc);
    } else {
        pDesc.textContent = "Connect with these campus-verified experts directly:";
        content.appendChild(pDesc);

        const listContainer = document.createElement("div");
        listContainer.style.maxHeight = "300px";
        listContainer.style.overflowY = "auto";
        listContainer.style.marginBottom = "20px";

        providers.forEach(prov => {
            const item = document.createElement("div");
            item.className = "provider-modal-item";
            item.innerHTML = `
                <h4>${sanitize(prov.name)}</h4>
                <p style="margin: 3px 0; font-size: 13px;"><strong>Expertise:</strong> ${sanitize(prov.category)}</p>
                <p style="margin: 3px 0; font-size: 13px;"><strong>Availability:</strong> ${sanitize(prov.availability)}</p>
                <a href="mailto:${sanitize(prov.email)}" class="provider-email-btn">Email: ${sanitize(prov.email)}</a>
            `;
            listContainer.appendChild(item);
        });
        content.appendChild(listContainer);
    }

    const closeBtn = document.createElement("button");
    closeBtn.className = "cancel-btn";
    closeBtn.style.width = "100%";
    closeBtn.textContent = "Close";
    closeBtn.onclick = () => backdrop.remove();
    content.appendChild(closeBtn);

    backdrop.appendChild(content);
    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) backdrop.remove();
    });
}

// --- CASE-INSENSITIVE, DETAILED LIVE SEARCH ENGINE ---
function setupLiveSearch() {
    if (!searchInput || !searchDropdown) return;

    searchInput.addEventListener("input", async () => {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
            searchDropdown.classList.add("hidden");
            searchDropdown.innerHTML = "";
            return;
        }

        try {
            const response = await secureFetch(`${API_BASE_URL}/requests/`);
            if (!response.ok) throw new Error();
            const raw = await response.json();

            const today = new Date();
            today.setHours(0,0,0,0);

            const matches = raw.filter(req => {
                const isCompleted = req.status === "Completed";
                const deadlineDate = new Date(req.deadline);
                deadlineDate.setHours(0,0,0,0);
                const isExpired = deadlineDate < today;

                const queryMatch = req.title.toLowerCase().includes(query) || 
                                   req.description.toLowerCase().includes(query);

                return !isCompleted && !isExpired && queryMatch;
            });

            renderSearchDropdown(matches);
        } catch (err) {
            console.error("Search failure:", err);
        }
    });

    document.addEventListener("click", (e) => {
        if (searchInput && !searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.add("hidden");
        }
    });
}

function renderSearchDropdown(matches) {
    searchDropdown.innerHTML = "";
    if (matches.length === 0) {
        const empty = document.createElement("div");
        empty.className = "search-item-link search-no-results";
        empty.textContent = "No matching requests found.";
        searchDropdown.appendChild(empty);
        searchDropdown.classList.remove("hidden");
        return;
    }

    matches.slice(0, 5).forEach(req => {
        const a = document.createElement("a");
        a.className = "search-item-link";
        a.href = `#request-details?id=${req.id}`;
        
        const titleSpan = document.createElement("strong");
        titleSpan.textContent = req.title;
        a.appendChild(titleSpan);

        const detailsSpan = document.createElement("div");
        detailsSpan.style.fontSize = "12px";
        detailsSpan.style.color = "#64748b";
        detailsSpan.style.marginTop = "3px";
        detailsSpan.textContent = `${req.category} | Rs. ${req.budget} | Client: ${req.userName}`;
        a.appendChild(detailsSpan);

        a.addEventListener("click", () => {
            searchDropdown.classList.add("hidden");
            searchInput.value = "";
        });

        searchDropdown.appendChild(a);
    });

    searchDropdown.classList.remove("hidden");
}