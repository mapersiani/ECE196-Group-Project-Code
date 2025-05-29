document.addEventListener("DOMContentLoaded", () => {
  if (new URLSearchParams(window.location.search).has("error")) {
    document.getElementById("error-msg").textContent =
      "Invalid username or password.";
  }
});
