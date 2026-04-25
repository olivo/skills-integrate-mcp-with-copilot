document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const accountButton = document.getElementById("account-button");
  const authPanel = document.getElementById("auth-panel");
  const closeAuthPanelButton = document.getElementById("close-auth-panel");
  const loginForm = document.getElementById("login-form");
  const logoutButton = document.getElementById("logout-button");
  const authStatusText = document.getElementById("auth-status-text");
  const signupHelperText = document.getElementById("signup-helper-text");

  let authState = {
    loggedIn: false,
    username: null,
  };

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateAuthUI() {
    const isLoggedIn = authState.loggedIn;

    signupForm.classList.toggle("hidden", !isLoggedIn);
    signupHelperText.textContent = isLoggedIn
      ? `Logged in as ${authState.username}. You can register or unregister students.`
      : "Teacher login is required to register or unregister students.";

    authStatusText.textContent = isLoggedIn
      ? `Logged in as ${authState.username}.`
      : "Log in to manage student registrations.";

    loginForm.classList.toggle("hidden", isLoggedIn);
    logoutButton.classList.toggle("hidden", !isLoggedIn);
    accountButton.classList.toggle("logged-in", isLoggedIn);
    accountButton.title = isLoggedIn
      ? `Logged in as ${authState.username}`
      : "Teacher login";
  }

  async function fetchAuthStatus() {
    const response = await fetch("/auth/status");
    const result = await response.json();

    authState = {
      loggedIn: result.logged_in,
      username: result.username,
    };

    updateAuthUI();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML =
        '<option value="">-- Select an activity --</option>';

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
                      `<li><span class="participant-email">${email}</span>${authState.loggedIn ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ""}</li>`
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
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!authState.loggedIn) {
      showMessage("Teacher login required", "error");
      return;
    }

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

        if (response.status === 401) {
          await fetchAuthStatus();
        }
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "Login failed", "error");
        return;
      }

      loginForm.reset();
      await fetchAuthStatus();
      await fetchActivities();
      showMessage(result.message, "success");
      authPanel.classList.add("hidden");
    } catch (error) {
      showMessage("Failed to log in. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/auth/logout", { method: "POST" });
      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "Logout failed", "error");
        return;
      }

      await fetchAuthStatus();
      await fetchActivities();
      showMessage(result.message, "success");
      authPanel.classList.add("hidden");
    } catch (error) {
      showMessage("Failed to log out. Please try again.", "error");
      console.error("Error logging out:", error);
    }
  });

  accountButton.addEventListener("click", () => {
    authPanel.classList.toggle("hidden");
  });

  closeAuthPanelButton.addEventListener("click", () => {
    authPanel.classList.add("hidden");
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authState.loggedIn) {
      showMessage("Teacher login required", "error");
      return;
    }

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

        if (response.status === 401) {
          await fetchAuthStatus();
        }
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchAuthStatus().then(fetchActivities);
});
