// On load, show error message if ?error=1
document.addEventListener("DOMContentLoaded", () => {
  if (new URLSearchParams(window.location.search).has("error")) {
    document.getElementById("error-msg").textContent =
      "Invalid username or password.";
  }
});
