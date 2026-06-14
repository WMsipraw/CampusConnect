// alert("JavaScript is successfully loading!");

// console.log("1. requests-list element is:", document.getElementById("requests-list"));
// console.log("2. userProfileSpan element is:", document.querySelector(".user-profile"));
// console.log("3. currentUser session is:", localStorage.getItem("currentUser"));



const API_BASE_URL = "http://localhost:3000";


const fullnameInput = document.getElementById("fullname");
const emailInput = document.getElementById("email");
const requestForm = document.getElementById("request-form");
const requestsListContainer = document.getElementById("requests-list");
const userProfileSpan = document.querySelector(".user-profile");
const logoutBtn = document.querySelector(".logout-btn");


if(fullnameInput){
    const registerForm = document.querySelector("form.card");
    if(registerForm){
        registerForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            clearInlineErrors();

            const fullname = fullnameInput.value.trim();
            const email = emailInput.value.trim();
            const universityId = document.getElementById("university_id").value.trim();
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirm_password").value;

            let isValid = true;
            if(password !== confirmPassword){
                showInlineError("confirm_password", "Passwords do not match!");
                isValid = false;
            }
            if(password.length < 6){
                showInlineError("password", "Password must be at least 6 characters.");
                isValid = false;
            }

            if(!isValid)return;

            try{
                const checkResponse = await fetch(`${API_BASE_URL}/users?email=${email}`);
                if(!checkResponse.ok)throw new Error("Database check failed.");
                
                const existingUsers = await checkResponse.json();
                if(existingUsers.length > 0){
                    showInlineError("email", "This email is already registered.");
                    return;
                }

                const newUser = { fullname, email, universityId, password };
                const response = await fetch(`${API_BASE_URL}/users`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newUser)
                });

                if(!response.ok) throw new Error("Registration failed.");
                window.location.href = "login.html";

            }catch(error){
                console.error(error);
                showFormAlert("Server connection error. Is json-server running?", "error");
            }
        });
    }
}


if(emailInput && !fullnameInput){
    const loginForm = document.querySelector("form.card");
    if(loginForm){
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            clearInlineErrors();

            const email = emailInput.value.trim();
            const password = document.getElementById("password").value;

            try{
                const response = await fetch(`${API_BASE_URL}/users?email=${email}`);
                if(!response.ok) throw new Error("Failed to connect to authentication server.");

                const matchedUsers = await response.json();
                if(matchedUsers.length === 0){
                    showInlineError("email", "No account found with this email.");
                    return;
                }

                const user = matchedUsers[0];
                if(user.password !== password){
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

            }catch(error){
                console.error(error);
                showFormAlert("Authentication connection error. Is json-server running?", "error");
            }
        });
    }
}


if(userProfileSpan || logoutBtn){
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if(!currentUser){
        window.location.href = "login.html";
    } 
    else{
        if(userProfileSpan){
            userProfileSpan.textContent = currentUser.fullname;
        }
    }

    if(logoutBtn){
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("currentUser");
            window.location.href = "index.html";
        });
    }
}


if(requestForm){
    requestForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        clearInlineErrors();

        const title = document.getElementById("request-title").value.trim();
        const description = document.getElementById("request-description").value.trim();
        const category = document.getElementById("request-category").value;
        const deadline = document.getElementById("request-deadline").value;
        const budget = Number(document.getElementById("request-budget").value);

        let isValid = true;
        if(title.length < 5){
            showInlineError("request-title", "Title must be at least 5 characters long.");
            isValid = false;
        }
        if(description.length < 15){
            showInlineError("request-description", "Description must be at least 15 characters.");
            isValid = false;
        }
        if(!deadline){
            showInlineError("request-deadline", "Please select a valid deadline date.");
            isValid = false;
        }
        if(budget <= 0){
            showInlineError("request-budget", "Budget must be a positive number greater than 0.");
            isValid = false;
        }

        if(!isValid)return;

        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        if(!currentUser){
            alert("You must be logged in to create a request!");
            window.location.href = "login.html";
            return;
        }

        const requestPayload ={
            title,
            description,
            category,
            deadline,
            budget,
            userId: currentUser.id,
            userName: currentUser.fullname,
            status: "Open"
        };

        try{
            const response = await fetch(`${API_BASE_URL}/requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestPayload)
            });

            if(!response.ok)throw new Error("Unable to create request on database.");
            window.location.href = "home.html";

        } catch(error){
            console.error(error);
            alert("Could not submit request. Is your json-server running?");
        }
    });
}


if(requestsListContainer){
    const sortCategoryBtn = document.getElementById("sort-category");
    const sortNewestBtn = document.getElementById("sort-newest");
    const sortBudgetBtn = document.getElementById("sort-budget");

    let activeRequests = [];

    async function fetchActiveRequests(){
        requestsListContainer.innerHTML = "<div class='status-message'>Loading requests...</div>";
        
        try{
            const response = await fetch(`${API_BASE_URL}/requests`);
            if(!response.ok)throw new Error("Unable to fetch requests.");

            activeRequests = await response.json();


            activeRequests.forEach((req, idx) => {
                req.seq = idx;
            });

            activeRequests.sort((a, b) => b.seq - a.seq);
            if(sortNewestBtn)setActiveSortButton(sortNewestBtn);

            renderRequests(activeRequests);

        }catch(error){
            console.error(error);
            requestsListContainer.innerHTML = "<div class='status-message error-message'>Unable to connect to database. Make sure json-server is running!</div>";
        }
    }

    function renderRequests(requestsArray){
        requestsListContainer.innerHTML = ""; 

        if(requestsArray.length === 0){
            const emptyMessage = document.createElement("div");
            emptyMessage.className = "status-message";
            emptyMessage.textContent = "No active campus requests found.";
            requestsListContainer.appendChild(emptyMessage);
            return;
        }

        requestsArray.forEach(req =>{
            
            const card = document.createElement("div");
            card.className = "service-card";

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
            pCategory.innerHTML = `<strong>Category:</strong> ${req.category}`;
            metaDiv.appendChild(pCategory);

            const pBudget = document.createElement("p");
            pBudget.innerHTML = `<strong>Budget:</strong> Rs. ${req.budget}`;
            metaDiv.appendChild(pBudget);

            const pDeadline = document.createElement("p");
            pDeadline.innerHTML = `<strong>Deadline:</strong> ${req.deadline}`;
            metaDiv.appendChild(pDeadline);

            const pClient = document.createElement("p");
            pClient.innerHTML = `<strong>Client:</strong> ${req.userName}`;
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
    if(sortCategoryBtn){
        sortCategoryBtn.addEventListener("click", () => {

            const categoryCounts = {};
            activeRequests.forEach(req => {
                categoryCounts[req.category] = (categoryCounts[req.category] || 0) + 1;
            });

            activeRequests.sort((a, b) => {
                const countA = categoryCounts[a.category];
                const countB = categoryCounts[b.category];

                if(countA !== countB){
                    return countA - countB;
                }

                return a.category.localeCompare(b.category);
            });

            setActiveSortButton(sortCategoryBtn);
            renderRequests(activeRequests);
        });
    }

    if(sortNewestBtn){
        sortNewestBtn.addEventListener("click", () => {
            activeRequests.sort((a, b) => b.seq - a.seq);
            setActiveSortButton(sortNewestBtn);
            renderRequests(activeRequests);
        });
    }

    if(sortBudgetBtn){
        sortBudgetBtn.addEventListener("click", () => {
            activeRequests.sort((a, b) => Number(b.budget) - Number(a.budget));
            setActiveSortButton(sortBudgetBtn);
            renderRequests(activeRequests);
        });
    }

    function setActiveSortButton(activeButton){
        if(sortCategoryBtn && sortNewestBtn && sortBudgetBtn){
            [sortCategoryBtn, sortNewestBtn, sortBudgetBtn].forEach(btn => {
                btn.classList.remove("active");
            });
            activeButton.classList.add("active");
        }
    }

    fetchActiveRequests();
}





function showInlineError(inputId, message){
    const inputElement = document.getElementById(inputId);
    const errorSpan = document.createElement("small");
    errorSpan.className = "inline-error-text"; 
    errorSpan.textContent = message;
    
    inputElement.parentNode.insertBefore(errorSpan, inputElement.nextSibling);
}

function clearInlineErrors(){
    document.querySelectorAll(".inline-error-text").forEach(el => el.remove());
}

function showFormAlert(message, type){
    const formCard = document.querySelector("form.card");
    if(!formCard) return;

    const alertDiv = document.createElement("div");
    alertDiv.className = `form-alert alert-${type}`; 
    alertDiv.textContent = message;

    formCard.insertBefore(alertDiv, formCard.firstChild);
    setTimeout(() => alertDiv.remove(), 4000);
}

function escapeHTML(str){
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}


const exploreBtn = document.querySelector(".explore-btn");
if(exploreBtn){
    exploreBtn.addEventListener("click", () =>{
        requestsListContainer.scrollIntoView({ behavior: "smooth" });
    });
}

const detailsTitle = document.getElementById("details-title");
const offerForm = document.getElementById("offer-form");

if(detailsTitle){
    const urlParams = new URLSearchParams(window.location.search);
    const requestId = urlParams.get("id");

    let loadedRequestData = null; 

    if(!requestId){
        window.location.href = "home.html"; 
    }

    async function fetchRequestDetails(){
        try{
            const response = await fetch(`${API_BASE_URL}/requests/${requestId}`);
            if (!response.ok) throw new Error("Could not find request details.");

            loadedRequestData = await response.json();

            detailsTitle.textContent = loadedRequestData.title;
            document.getElementById("details-desc").textContent = loadedRequestData.description;
            document.getElementById("details-category").textContent = loadedRequestData.category;
            document.getElementById("details-budget").textContent = `Rs. ${loadedRequestData.budget}`;
            document.getElementById("details-deadline").textContent = loadedRequestData.deadline;
            document.getElementById("details-client").textContent = loadedRequestData.userName;

            const currentUser = JSON.parse(localStorage.getItem("currentUser"));
            if(currentUser && currentUser.id === loadedRequestData.userId){
                const offerSection = document.querySelector(".offer-form-section");
                if (offerSection) {
                    offerSection.innerHTML = "<p class='status-message' style='color: #64748b; font-weight: 500;'>This is your own request. You cannot make an offer to yourself!</p>";
                }
            }

        }catch(error){
            console.error("Error loading details:", error);
            detailsTitle.textContent = "Error Loading Request Details";
        }
    }

    if(offerForm){
        offerForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const message = document.getElementById("offer-message").value.trim();
            const currentUser = JSON.parse(localStorage.getItem("currentUser"));

            if(!currentUser){
                alert("You must be logged in to send an offer!");
                window.location.href = "login.html";
                return;
            }

            const bookingPayload ={
                requestId: loadedRequestData.id,
                requestTitle: loadedRequestData.title,
                clientId: loadedRequestData.userId,
                clientName: loadedRequestData.userName,
                providerId: currentUser.id,
                providerName: currentUser.fullname,
                message: message,
                status: "Pending Client Confirmation" 
            };

            try{
                const response = await fetch(`${API_BASE_URL}/bookings`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(bookingPayload)
                });

                if (!response.ok) throw new Error("Could not submit help offer.");

                alert("Offer sent successfully! The client will verify your offer on their profile.");
                window.location.replace("home.html"); // Force-redirect to bypass browser lag

            } catch (error) {
                console.error("Error submitting offer:", error);
                alert("Connection error. Could not send offer.");
            }
        });
    }

    fetchRequestDetails();
};    