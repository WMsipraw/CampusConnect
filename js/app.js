const requestForm = document.getElementById("request-form");

if(requestForm){

    requestForm.addEventListener("submit", function(e){

        e.preventDefault();

        const title = document.getElementById("request-title").value;

        const description = document.getElementById("request-description").value;

        const category = document.getElementById("request-category").value;

        const deadline = document.getElementById("request-deadline").value;

        const budget = document.getElementById("request-budget").value;

        const requestData = {
            title,
            description,
            category,
            deadline,
            budget
        };

        localStorage.setItem(
            "campusRequest",
            JSON.stringify(requestData)
        );

        window.location.href = "home.html";

    });

}

const requestsList = document.getElementById("requests-list");

if(requestsList){

    const savedRequest = JSON.parse(
        localStorage.getItem("campusRequest")
    );

    if(savedRequest){

        const requestCard = document.createElement("div");

        requestCard.classList.add("request-card");

        requestCard.innerHTML = `
        
            <h3>${savedRequest.title}</h3>

            <p>${savedRequest.description}</p>

            <p><strong>Category:</strong> ${savedRequest.category}</p>

            <p><strong>Budget:</strong> ${savedRequest.budget}</p>

            <p><strong>Deadline:</strong> ${savedRequest.deadline}</p>

            <button>Offer Help</button>

        `;

        requestsList.appendChild(requestCard);

    }

}