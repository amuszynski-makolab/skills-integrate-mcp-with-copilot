document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const signupLockedMessage = document.getElementById("signup-locked-message");
  const adminMenuBtn = document.getElementById("admin-menu-btn");
  const adminModal = document.getElementById("admin-modal");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const adminLoginForm = document.getElementById("admin-login-form");
  const adminSessionInfo = document.getElementById("admin-session-info");
  const adminWelcomeText = document.getElementById("admin-welcome-text");
  const logoutBtn = document.getElementById("logout-btn");

  let adminUsername = null;

  function setAdminUi() {
    const isAdmin = Boolean(adminUsername);
    signupForm.classList.toggle("hidden", !isAdmin);
    signupLockedMessage.classList.toggle("hidden", isAdmin);
    adminSessionInfo.classList.toggle("hidden", !isAdmin);
    adminLoginForm.classList.toggle("hidden", isAdmin);
    adminMenuBtn.textContent = isAdmin ? "✅" : "👤";

    if (isAdmin) {
      adminWelcomeText.textContent = `Logged in as ${adminUsername}`;
    }
  }

  async function loadAdminSession() {
    try {
      const response = await fetch("/admin/session");
      const result = await response.json();
      adminUsername = result.authenticated ? result.username : null;
      setAdminUi();
    } catch (error) {
      adminUsername = null;
      setAdminUi();
      console.error("Error loading admin session:", error);
    }
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        adminUsername
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      if (adminUsername) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  adminMenuBtn.addEventListener("click", () => {
    adminModal.classList.remove("hidden");
  });

  modalCloseBtn.addEventListener("click", () => {
    adminModal.classList.add("hidden");
  });

  adminModal.addEventListener("click", (event) => {
    if (event.target === adminModal) {
      adminModal.classList.add("hidden");
    }
  });

  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("admin-username").value;
    const password = document.getElementById("admin-password").value;

    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        adminUsername = result.username;
        setAdminUi();
        fetchActivities();
        adminLoginForm.reset();
        adminModal.classList.add("hidden");
        showMessage("Admin login successful", "success");
      } else {
        showMessage(result.detail || "Login failed", "error");
      }
    } catch (error) {
      showMessage("Login failed", "error");
      console.error("Error logging in:", error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/admin/logout", { method: "POST" });
      const result = await response.json();

      if (response.ok) {
        adminUsername = null;
        setAdminUi();
        fetchActivities();
        adminModal.classList.add("hidden");
        showMessage(result.message, "success");
      } else {
        showMessage(result.detail || "Logout failed", "error");
      }
    } catch (error) {
      showMessage("Logout failed", "error");
      console.error("Error logging out:", error);
    }
  });

  // Initialize app
  loadAdminSession().then(fetchActivities);
});
