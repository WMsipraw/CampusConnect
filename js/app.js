// alert("JavaScript is successfully loading!");

// console.log("1. requests-list element is:", document.getElementById("requests-list"));
// console.log("2. userProfileSpan element is:", document.querySelector(".user-profile"));
// console.log("3. currentUser session is:", localStorage.getItem("currentUser"));



// 1. Global API Configuration
const API_BASE_URL = "http://localhost:3000";

// --- GLOBAL PAGE SELECTORS ---
const fullnameInput = document.getElementById("fullname");
const emailInput = document.getElementById("email");
const requestForm = document.getElementById("request-form");
const requestsListContainer = document.getElementById("requests-list");
const userProfileSpan = document.querySelector(".user-profile");
const logoutBtn = document.querySelector(".logout-btn");

// --- RUN ACTIVE SCRIPT FOR THE CURRENT PAGE ---

// A. USER REGISTRATION (register.html)
if (fullnameInput) {
    const registerForm = document.querySelector("form.card");
    if (registerForm) {
        registerForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            clearInlineErrors();

            const fullname = fullnameInput.value.trim();
            const email = emailInput.value.trim();
            const universityId = document.getElementById("university_id").value.trim();
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirm_password").value;

            let isValid = true;
            if (password !== confirmPassword) {
                showInlineError("confirm_password", "Passwords do not match!");
                isValid = false;
            }
            if (password.length < 6) {
                showInlineError("password", "Password must be at least 6 characters.");
                isValid = false;
            }

            if (!isValid) return;

            try {
                const checkResponse = await fetch(`${API_BASE_URL}/users?email=${email}`);
                if (!checkResponse.ok) throw new Error("Database check failed.");
                
                const existingUsers = await checkResponse.json();
                if (existingUsers.length > 0) {
                    showInlineError("email", "This email is already registered.");
                    return;
                }

                const newUser = { fullname, email, universityId, password };
                const response = await fetch(`${API_BASE_URL}/users`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newUser)
                });

                if (!response.ok) throw new Error("Registration failed.");
                window.location.href = "login.html";

            } catch (error) {
                console.error(error);
                showFormAlert("Server connection error. Is json-server running?", "error");
            }
        });
    }
}

// B. USER LOGIN (login.html)
if (emailInput && !fullnameInput) {
    const loginForm = document.querySelector("form.card");
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            clearInlineErrors();

            const email = emailInput.value.trim();
            const password = document.getElementById("password").value;

            try {
                const response = await fetch(`${API_BASE_URL}/users?email=${email}`);
                if (!response.ok) throw new Error("Failed to connect to authentication server.");

                const matchedUsers = await response.json();
                if (matchedUsers.length === 0) {
                    showInlineError("email", "No account found with this email.");
                    return;
                }

                const user = matchedUsers[0];
                if (user.password !== password) {
                    showInlineError("password", "Incorrect password.");
                    return;
                }

                localStorage.setItem("currentUser", JSON.stringify({
                    id: user.id,
                    fullname: user.fullname,
                    email: user.email,
                    universityId: user.universityId
                }));

                window.location.href = "home.html";

            } catch (error) {
                console.error(error);
                showFormAlert("Authentication connection error. Is json-server running?", "error");
            }
        });
    }
}

// C. DASHBOARD SESSION & LOGOUT (home.html / profile.html)
if (userProfileSpan || logoutBtn) {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (!currentUser) {
        window.location.href = "login.html";
    } else {
        if (userProfileSpan) {
            userProfileSpan.textContent = currentUser.fullname;
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("currentUser");
            window.location.href = "index.html";
        });
    }
}

// D. CREATE A REQUEST (create-request.html)
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
            showInlineError("request-title", "Title must be at least 5 characters long.");
            isValid = false;
        }
        if (description.length < 15) {
            showInlineError("request-description", "Description must be at least 15 characters.");
            isValid = false;
        }
        if (!deadline) {
            showInlineError("request-deadline", "Please select a valid deadline date.");
            isValid = false;
        }
        if (budget <= 0) {
            showInlineError("request-budget", "Budget must be a positive number greater than 0.");
            isValid = false;
        }

        if (!isValid) return;

        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        if (!currentUser) {
            alert("You must be logged in to create a request!");
            window.location.href = "login.html";
            return;
        }

        const requestPayload = {
            title,
            description,
            category,
            deadline,
            budget,
            userId: currentUser.id,
            userName: currentUser.fullname,
            status: "Open"
        };

        try {
            const response = await fetch(`${API_BASE_URL}/requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestPayload)
            });

            if (!response.ok) throw new Error("Unable to create request on database.");
            window.location.href = "home.html";

        } catch (error) {
            console.error(error);
            alert("Could not submit request. Is your json-server running?");
        }
    });
}

// E. ACTIVE REQUEST BOARD & SORTING (home.html)
if (requestsListContainer) {
    const sortCategoryBtn = document.getElementById("sort-category");
    const sortNewestBtn = document.getElementById("sort-newest");
    const sortBudgetBtn = document.getElementById("sort-budget");

    let activeRequests = [];

    async function fetchActiveRequests() {
        requestsListContainer.textContent = ""; 
        const loaderDiv = document.createElement("div");
        loaderDiv.className = "status-message";
        loaderDiv.textContent = "Loading requests...";
        requestsListContainer.appendChild(loaderDiv);
        
        try {
            const response = await fetch(`${API_BASE_URL}/requests`);
            if (!response.ok) throw new Error("Unable to fetch requests.");

            const rawRequests = await response.json();

            // Auto-Hiding completed requests from students (Only fetch where status === Open)
            activeRequests = rawRequests.filter(req => req.status === "Open" || !req.status);

            // Set dynamic sequence indices for chronological sorting (Random String ID safe)
            activeRequests.forEach((req, idx) => {
                req.seq = idx;
            });

            // Default sort: Newest first
            activeRequests.sort((a, b) => b.seq - a.seq);
            if (sortNewestBtn) setActiveSortButton(sortNewestBtn);

            renderRequests(activeRequests);

        } catch (error) {
            console.error(error);
            requestsListContainer.textContent = ""; 
            const errorDiv = document.createElement("div");
            errorDiv.className = "status-message error-message";
            errorDiv.textContent = "Unable to connect to database. Make sure json-server is running!";
            requestsListContainer.appendChild(errorDiv);
        }
    }

    // Fully Programmatic DOM Creation (100% innerHTML & Inline CSS Free)
    function renderRequests(requestsArray) {
        requestsListContainer.textContent = ""; 

        if (requestsArray.length === 0) {
            const emptyMessage = document.createElement("div");
            emptyMessage.className = "status-message";
            emptyMessage.textContent = "No active campus requests found.";
            requestsListContainer.appendChild(emptyMessage);
            return;
        }

        requestsArray.forEach(req => {
            const card = document.createElement("div");
            card.className = "service-card";

            // DEADLINE TRACKER: Check if the request is "Expiring Soon" (<= 2 days away)
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Midnight reset for clean day math
            const deadlineDate = new Date(req.deadline);
            deadlineDate.setHours(0, 0, 0, 0);

            const diffTime = deadlineDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays <= 2) {
                const badge = document.createElement("span");
                badge.className = "badge-expiring";
                badge.textContent = "Expiring Soon!";
                card.appendChild(badge);
            }

            const h3 = document.createElement("h3");
            h3.textContent = req.title;
            card.appendChild(h3);

            const pDesc = document.createElement("p");
            pDesc.className = "request-desc";
            pDesc.textContent = req.description;
            card.appendChild(pDesc);

            const metaDiv = document.createElement("div");
            metaDiv.className = "request-meta";

            const pCategory = document.createElement("p");
            const strongCat = document.createElement("strong");
            strongCat.textContent = "Category: ";
            pCategory.appendChild(strongCat);
            pCategory.appendChild(document.createTextNode(req.category));
            metaDiv.appendChild(pCategory);

            const pBudget = document.createElement("p");
            const strongBudget = document.createElement("strong");
            strongBudget.textContent = "Budget: ";
            pBudget.appendChild(strongBudget);
            pBudget.appendChild(document.createTextNode(`Rs. ${req.budget}`));
            metaDiv.appendChild(pBudget);

            const pDeadline = document.createElement("p");
            const strongDeadline = document.createElement("strong");
            strongDeadline.textContent = "Deadline: ";
            pDeadline.appendChild(strongDeadline);
            pDeadline.appendChild(document.createTextNode(req.deadline));
            metaDiv.appendChild(pDeadline);

            const pClient = document.createElement("p");
            const strongClient = document.createElement("strong");
            strongClient.textContent = "Client: ";
            pClient.appendChild(strongClient);
            pClient.appendChild(document.createTextNode(req.userName));
            metaDiv.appendChild(pClient);

            card.appendChild(metaDiv);

            const contactBtn = document.createElement("a");
            contactBtn.className = "contact-btn";
            contactBtn.href = `request-details.html?id=${req.id}`;
            contactBtn.textContent = "Contact Client";
            card.appendChild(contactBtn);

            requestsListContainer.appendChild(card);
        });
    }

    if (sortCategoryBtn) {
        sortCategoryBtn.addEventListener("click", () => {
            const categoryCounts = {};
            activeRequests.forEach(req => {
                categoryCounts[req.category] = (categoryCounts[req.category] || 0) + 1;
            });

            activeRequests.sort((a, b) => {
                const countA = categoryCounts[a.category];
                const countB = categoryCounts[b.category];
                if (countA !== countB) return countA - countB;
                return a.category.localeCompare(b.category);
            });

            setActiveSortButton(sortCategoryBtn);
            renderRequests(activeRequests);
        });
    }

    if (sortNewestBtn) {
        sortNewestBtn.addEventListener("click", () => {
            activeRequests.sort((a, b) => b.seq - a.seq);
            setActiveSortButton(sortNewestBtn);
            renderRequests(activeRequests);
        });
    }

    if (sortBudgetBtn) {
        sortBudgetBtn.addEventListener("click", () => {
            activeRequests.sort((a, b) => Number(b.budget) - Number(a.budget));
            setActiveSortButton(sortBudgetBtn);
            renderRequests(activeRequests);
        });
    }

    function setActiveSortButton(activeButton) {
        if (sortCategoryBtn && sortNewestBtn && sortBudgetBtn) {
            [sortCategoryBtn, sortNewestBtn, sortBudgetBtn].forEach(btn => {
                btn.classList.remove("active");
            });
            activeButton.classList.add("active");
        }
    }

    fetchActiveRequests();
}

// F. DISCOVER BUTTON SMOOTH SCROLL
const exploreBtn = document.querySelector(".explore-btn");
if (exploreBtn) {
    exploreBtn.addEventListener("click", () => {
        if (requestsListContainer) {
            requestsListContainer.scrollIntoView({ behavior: "smooth" });
        }
    });
}

// G. REQUEST DETAILS & BOOKING SUBMISSION (request-details.html)
const detailsTitle = document.getElementById("details-title");
const offerForm = document.getElementById("offer-form");

if (detailsTitle) {
    const urlParams = new URLSearchParams(window.location.search);
    const requestId = urlParams.get("id");
    let loadedRequestData = null;

    if (!requestId) {
        window.location.href = "home.html";
    }

    async function fetchRequestDetails() {
        try {
            const response = await fetch(`${API_BASE_URL}/requests/${requestId}`);
            if (!response.ok) throw new Error("Could not find request details.");

            loadedRequestData = await response.json();

            detailsTitle.textContent = loadedRequestData.title;
            document.getElementById("details-desc").textContent = loadedRequestData.description;
            document.getElementById("details-category").textContent = loadedRequestData.category;
            document.getElementById("details-budget").textContent = `Rs. ${loadedRequestData.budget}`;
            document.getElementById("details-deadline").textContent = loadedRequestData.deadline;
            document.getElementById("details-client").textContent = loadedRequestData.userName;

            // Secure Relationship Join: Fetch and save the client's email programmatically
            const clientUserRes = await fetch(`${API_BASE_URL}/users/${loadedRequestData.userId}`);
            if (clientUserRes.ok) {
                const clientUserData = await clientUserRes.json();
                loadedRequestData.clientEmail = clientUserData.email; // Safely attached
            }

            const currentUser = JSON.parse(localStorage.getItem("currentUser"));
            if (currentUser) {
                // A. Security Check 1: Prevent offering help to yourself
                if (currentUser.id === loadedRequestData.userId) {
                    const offerSection = document.querySelector(".offer-form-section");
                    if (offerSection) {
                        offerSection.textContent = "";
                        const warningPara = document.createElement("p");
                        warningPara.className = "status-message";
                        warningPara.textContent = "This is your own request. You cannot make an offer to yourself!";
                        offerSection.appendChild(warningPara);
                    }
                } 
                // B. Security Check 2: Prevent sending more than one offer to the SAME request (One-Offer Limit)
                else {
                    const existingBookingRes = await fetch(`${API_BASE_URL}/bookings?requestId=${requestId}&providerId=${currentUser.id}`);
                    if (existingBookingRes.ok) {
                        const existingBookings = await existingBookingRes.json();
                        if (existingBookings.length > 0) {
                            const offerSection = document.querySelector(".offer-form-section");
                            if (offerSection) {
                                offerSection.textContent = "";
                                const warningPara = document.createElement("p");
                                warningPara.className = "status-message";
                                warningPara.textContent = "You have already sent a help offer for this request! You can track its status on your Profile page.";
                                offerSection.appendChild(warningPara);
                            }
                        }
                    }
                }
            }

        } catch (error) {
            console.error(error);
            detailsTitle.textContent = "Error Loading Request Details";
        }
    }

    if (offerForm) {
        offerForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const message = document.getElementById("offer-message").value.trim();
            const currentUser = JSON.parse(localStorage.getItem("currentUser"));

            if (!currentUser) {
                alert("You must be logged in to send an offer!");
                window.location.href = "login.html";
                return;
            }

            const bookingPayload = {
                requestId: loadedRequestData.id,
                requestTitle: loadedRequestData.title,
                clientId: loadedRequestData.userId,
                clientName: loadedRequestData.userName,
                clientEmail: loadedRequestData.clientEmail,   // Client's Email secured
                providerId: currentUser.id,
                providerName: currentUser.fullname,
                providerEmail: currentUser.email,             // Provider's Email secured
                message: message,
                status: "Pending Client Confirmation"
            };

            try {
                const response = await fetch(`${API_BASE_URL}/bookings`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(bookingPayload)
                });

                if (!response.ok) throw new Error("Could not submit help offer.");

                alert("Offer sent successfully! The client will verify your offer on their profile.");
                window.location.replace("home.html");

            } catch (error) {
                console.error(error);
                alert("Connection error. Could not send offer.");
            }
        });
    }

    fetchRequestDetails();
}

// H. PROFILE LOADING & CLIENT CONFIRMATION (profile.html)
const profileName = document.getElementById("profile-name");
const offersReceivedList = document.getElementById("offers-received-list");

if (profileName) {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (!currentUser) {
        window.location.href = "login.html";
    } else {
        profileName.textContent = currentUser.fullname;
        document.getElementById("profile-email-header").textContent = currentUser.email;
        document.getElementById("profile-id").textContent = currentUser.universityId;
        document.getElementById("profile-email").textContent = currentUser.email;
    }

    async function fetchReceivedOffers() {
        if (!offersReceivedList) return;
        
        offersReceivedList.textContent = ""; 
        const loaderDiv = document.createElement("div");
        loaderDiv.className = "status-message";
        loaderDiv.textContent = "Loading offers...";
        offersReceivedList.appendChild(loaderDiv);

        try {
            const response = await fetch(`${API_BASE_URL}/bookings?clientId=${currentUser.id}`);
            if (!response.ok) throw new Error("Could not fetch help offers.");

            const offers = await response.json();
            renderOffers(offers);

        } catch (error) {
            console.error(error);
            offersReceivedList.textContent = ""; 
            const errorDiv = document.createElement("div");
            errorDiv.className = "status-message error-message";
            errorDiv.textContent = "Failed to load offers. Is json-server running?";
            offersReceivedList.appendChild(errorDiv);
        }
    }

    // Fully Programmatic DOM Creation (100% innerHTML & Inline CSS Free)
    function renderOffers(offersArray) {
        offersReceivedList.textContent = ""; 

        if (offersArray.length === 0) {
            const noOffers = document.createElement("p");
            noOffers.className = "status-message";
            noOffers.textContent = "You haven't received any help offers on your requests yet.";
            offersReceivedList.appendChild(noOffers);
            return;
        }

        offersArray.forEach(offer => {
            const item = document.createElement("div");
            item.className = "activity-item";

            const h3 = document.createElement("h3");
            h3.className = "profile-offer-title";
            h3.textContent = `Offer on: ${offer.requestTitle}`;
            item.appendChild(h3);

            const pProvider = document.createElement("p");
            pProvider.className = "profile-offer-meta";
            const strongHelper = document.createElement("strong");
            strongHelper.textContent = "Helper: ";
            pProvider.appendChild(strongHelper);
            pProvider.appendChild(document.createTextNode(offer.providerName)); 
            item.appendChild(pProvider);

            const pMsg = document.createElement("p");
            pMsg.className = "profile-offer-meta";
            const strongMsg = document.createElement("strong");
            strongMsg.textContent = "Message: ";
            pMsg.appendChild(strongMsg);
            pMsg.appendChild(document.createTextNode(`"${offer.message}"`));
            item.appendChild(pMsg);

            const pStatus = document.createElement("p");
            pStatus.className = "profile-offer-meta";
            const strongStatus = document.createElement("strong");
            strongStatus.textContent = "Status: ";
            pStatus.appendChild(strongStatus);
            pStatus.appendChild(document.createTextNode(offer.status));
            item.appendChild(pStatus);

            // Client Accepts (PATCH Updates Status)
            if (offer.status === "Pending Client Confirmation") {
                const acceptBtn = document.createElement("button");
                acceptBtn.className = "contact-btn";
                acceptBtn.style.marginTop = "10px";
                acceptBtn.textContent = "Accept Offer";
                
                acceptBtn.addEventListener("click", async () => {
                    try {
                        const patchResponse = await fetch(`${API_BASE_URL}/bookings/${offer.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "Accepted by Client, Pending Admin Approval" })
                        });

                        if (!patchResponse.ok) throw new Error("Unable to update offer status.");

                        alert("Offer accepted! Waiting for final Admin approval.");
                        fetchReceivedOffers(); 

                    } catch (err) {
                        console.error(err);
                        alert("Failed to accept offer.");
                    }
                });

                item.appendChild(acceptBtn);
            } 
            else if (offer.status === "Accepted by Client, Pending Admin Approval") {
                const infoText = document.createElement("p");
                infoText.className = "status-pending-admin";
                infoText.textContent = "Waiting for Admin to approve this booking.";
                item.appendChild(infoText);
            } 
            else if (offer.status === "Approved") {
                const infoText = document.createElement("p");
                infoText.className = "status-approved";
                infoText.textContent = "Booking finalized and approved!";
                item.appendChild(infoText);

                // SECURITY UNLOCKED: Display the Helper's Email safely
                const pContact = document.createElement("p");
                pContact.className = "contact-highlight";
                const strongContact = document.createElement("strong");
                strongContact.textContent = "Connect with Helper at: ";
                pContact.appendChild(strongContact);
                pContact.appendChild(document.createTextNode(offer.providerEmail));
                item.appendChild(pContact);
            }

            offersReceivedList.appendChild(item);
        });
    }

    fetchReceivedOffers();
}


// --- UTILITY/HELPER FUNCTIONS ---

function showInlineError(inputId, message) {
    const inputElement = document.getElementById(inputId);
    const errorSpan = document.createElement("small");
    errorSpan.className = "inline-error-text"; 
    errorSpan.textContent = message;
    inputElement.parentNode.insertBefore(errorSpan, inputElement.nextSibling);
}

function clearInlineErrors() {
    document.querySelectorAll(".inline-error-text").forEach(el => el.remove());
}

function showFormAlert(message, type) {
    const formCard = document.querySelector("form.card");
    if (!formCard) return;
    const alertDiv = document.createElement("div");
    alertDiv.className = `form-alert alert-${type}`;
    alertDiv.textContent = message;
    formCard.insertBefore(alertDiv, formCard.firstChild);
    setTimeout(() => alertDiv.remove(), 4000);
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// --- LANDING PAGE LOCAL ANCHOR SMOOTH SCROLLING (index.html) ---
const categoriesLink = document.querySelector(".nav-links a[href='#categories']");
const howItWorksLink = document.querySelector(".nav-links a[href='#how-it-works']");

if (categoriesLink) {
    categoriesLink.addEventListener("click", (e) => {
        e.preventDefault();
        const categoriesSection = document.getElementById("categories");
        if (categoriesSection) {
            categoriesSection.scrollIntoView({ behavior: "smooth" });
        }
    });
}

if (howItWorksLink) {
    howItWorksLink.addEventListener("click", (e) => {
        e.preventDefault();
        const howItWorksSection = document.getElementById("how-it-works");
        if (howItWorksSection) {
            howItWorksSection.scrollIntoView({ behavior: "smooth" });
        }
    });
}

// --- START OF AUTOCOMPLETE DROPDOWN SEARCH & NAV SMOOTH SCROLL ---
const searchInput = document.getElementById("search-input");
const searchDropdown = document.getElementById("search-dropdown");

if (searchInput && searchDropdown) {
    let debounceTimer;

    searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        const query = searchInput.value.trim().toLowerCase();

        // Debouncing: waits 300ms after typing stops before querying the server (Bonus feature!)
        debounceTimer = setTimeout(async () => {
            if (query.length < 2) {
                searchDropdown.classList.add("hidden");
                searchDropdown.textContent = "";
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/requests`);
                if (!response.ok) throw new Error();

                const requests = await response.json();
                
                // Filters requests (Case-Insensitive and Partial Word Match!)
                const matches = requests.filter(req => 
                    req.title.toLowerCase().includes(query)
                );

                renderSearchDropdown(matches);

            } catch (error) {
                console.error("Search fetch error:", error);
            }
        }, 300);
    });

    // Render search results dynamically (100% innerHTML & Inline CSS Free)
    function renderSearchDropdown(matches) {
        searchDropdown.textContent = ""; // Clear old results securely

        if (matches.length === 0) {
            const noResult = document.createElement("div");
            // Uses grouped classes for general styling and the "no-results" state
            noResult.className = "search-item-link search-no-results";
            noResult.textContent = "No matching requests found.";
            searchDropdown.appendChild(noResult);
            searchDropdown.classList.remove("hidden");
            return;
        }

        matches.forEach(req => {
            const item = document.createElement("a");
            item.className = "search-item-link";
            item.href = `request-details.html?id=${req.id}`;
            item.textContent = req.title;
            searchDropdown.appendChild(item);
        });

        searchDropdown.classList.remove("hidden");
    }

    // Closes search dropdown list if the user clicks anywhere else on the screen
    document.addEventListener("click", (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.add("hidden");
        }
    });
}

// HOME NAVIGATION SMOOTH VERTICAL SCROLLING
const servicesNavLink = document.querySelector(".nav-links a[href='#Services']");
const requestsNavLink = document.querySelector(".nav-links a[href='#Requests']");
const aboutNavLink = document.querySelector(".nav-links a[href='#About']");

if (servicesNavLink) {
    servicesNavLink.addEventListener("click", (e) => {
        e.preventDefault();
        const servicesSection = document.querySelector(".services-section");
        if (servicesSection) {
            servicesSection.scrollIntoView({ behavior: "smooth" });
        }
    });
}

if (requestsNavLink) {
    requestsNavLink.addEventListener("click", (e) => {
        e.preventDefault();
        if (requestsListContainer) {
            requestsListContainer.scrollIntoView({ behavior: "smooth" });
        }
    });
}

if (aboutNavLink) {
    aboutNavLink.addEventListener("click", (e) => {
        e.preventDefault();
        const footer = document.querySelector("footer");
        if (footer) {
            footer.scrollIntoView({ behavior: "smooth" });
        }
    });
}

// --- START OF POPULAR SERVICES CONTACT LOGIC ---
const popularCards = document.querySelectorAll(".services-section .service-card");

if (popularCards.length > 0) {
    popularCards.forEach(card => {
        const contactBtn = card.querySelector("button");
        const serviceTitle = card.querySelector("h3").textContent;

        if (contactBtn) {
            contactBtn.addEventListener("click", async () => {
                // Dynamically maps the card header to its database category representation
                const dbCategory = mapCardTextToCategory(serviceTitle);

                try {
                    // Fetch verified campus providers matching this category (GET method)
                    const response = await fetch(`${API_BASE_URL}/providers?category=${encodeURIComponent(dbCategory)}`);
                    if (!response.ok) throw new Error();

                    const providers = await response.json();
                    openProviderModal(serviceTitle, providers);

                } catch (error) {
                    console.error("Error loading providers:", error);
                    alert("Could not load campus providers.");
                }
            });
        }
    });

    // Helper map
    function mapCardTextToCategory(text) {
        if (text === "DBMS Tutoring") return "Tutoring";
        if (text === "Assignment Formatting") return "Other";
        return text; // Programming Help, Laptop Repair, Photography, Graphic Design match exactly
    }

    // Programmatic Modal Renderer (100% innerHTML & Inline CSS Free)
    function openProviderModal(title, providersList) {
        const backdrop = document.createElement("div");
        backdrop.className = "modal-backdrop";

        const content = document.createElement("div");
        content.className = "modal-content";

        const h2 = document.createElement("h2");
        h2.textContent = `${title} Providers`;
        content.appendChild(h2);

        const pDesc = document.createElement("p");
        pDesc.textContent = "Verified, active student providers available in your campus community.";
        content.appendChild(pDesc);

        if (providersList.length === 0) {
            const noProviders = document.createElement("p");
            noProviders.className = "status-message";
            noProviders.textContent = "No verified campus providers are currently listed for this category.";
            content.appendChild(noProviders);
        } else {
            providersList.forEach(prov => {
                const item = document.createElement("div");
                item.className = "provider-modal-item";

                const h4 = document.createElement("h4");
                h4.textContent = prov.name;
                item.appendChild(h4);

                const pAvail = document.createElement("p");
                pAvail.className = "profile-offer-meta";
                pAvail.textContent = prov.availability;
                item.appendChild(pAvail);

                const emailLink = document.createElement("a");
                emailLink.className = "provider-email-btn";
                emailLink.href = `mailto:${prov.email}`;
                emailLink.textContent = `Email ${prov.name.split(" ")[0]}`;
                item.appendChild(emailLink);

                content.appendChild(item);
            });
        }

        const closeBtn = document.createElement("button");
        closeBtn.className = "cancel-btn";
        closeBtn.style.marginTop = "15px"; // Safe visual separation
        closeBtn.textContent = "Close";
        closeBtn.addEventListener("click", () => backdrop.remove());
        content.appendChild(closeBtn);

        backdrop.appendChild(content);

        // Closes modal if you click on the darkened backdrop background
        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) {
                backdrop.remove();
            }
        });

        document.body.appendChild(backdrop);
    }
}
// --- END OF POPULAR SERVICES CONTACT LOGIC ---