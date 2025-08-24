// Global Variables
let shortURLsWrapper = document.querySelector(".url-shorten-results");
let shortUrlForm = document.querySelector("#url-shorten-form");
let submitButton = shortUrlForm.querySelector("button");
let input = shortUrlForm.querySelector(".url-input");
let alertMessage = shortUrlForm.querySelector(".alert");

// Localstorage
localStorage.getItem("saved")
  ? ((savedURLs = JSON.parse(localStorage.getItem("saved"))),
    RebuildSavedURLS())
  : (savedURLs = []);

// Rebuild Exists Saved URLs
function RebuildSavedURLS() {
  savedURLs
    .map((url) => {
      generatedShortUrlHtml(url.id, url.originalURL, url.shortUrl);
    })
    .join("");
}

// Build Short URL HTML Structure
function generatedShortUrlHtml(id, originalURL, shortUrl) {
  shortURLsWrapper.insertAdjacentHTML(
    "beforeend",
    `
  <div class="url-shorten-result" id='${id}'>
    <div class="old-url">
    <p><a href="${originalURL}" target="_blank">${originalURL}</a></p>
    </div>
    <div class="new-url">
      <p><a href="${shortUrl}" target="_blank">${shortUrl}</a></p>
      <div class="options">
        <button type="button" class="copy-new-url btn btn-sm scale-effect">
          copy
        </button>

        <button type="button" class="delete-url scale-effect">
          <i class="fa-regular fa-trash-can icon"></i>
        </button>
      </div>
    </div>
  </div>`
  );
  removeURL();
  copyURL();
  removeAllGeneratedURLs();
}

// Add Remove All Generated URls
function removeAllGeneratedURLs() {
  if (shortURLsWrapper.querySelectorAll(".url-shorten-result").length >= 2) {
    if (shortURLsWrapper.querySelector(".delete-all-urls")) {
      shortURLsWrapper.querySelector(".delete-all-urls").remove();
    }
    let button = document.createElement("button");
    button.type = "button";
    button.classList = "btn btn-sm delete-all-urls scale-effect";
    button.textContent = "delete all";
    function insertAfter(newNode, existingNode) {
      existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
    }
    insertAfter(button, shortURLsWrapper.lastElementChild);
    let deleteAll = shortURLsWrapper.querySelector(".delete-all-urls");
    deleteAll.addEventListener("click", () => {
      shortURLsWrapper.innerHTML = "";
      savedURLs = [];
      localStorage.removeItem("saved");
    });
  } else {
    if (shortURLsWrapper.querySelector(".delete-all-urls")) {
      shortURLsWrapper.querySelector(".delete-all-urls").remove();
    }
  }
}

// Remove Single URL
function removeURL() {
  let deleteURLButton = shortURLsWrapper.querySelectorAll(".delete-url");
  deleteURLButton.forEach((button) => {
    button.addEventListener("click", () => {
      let linkId = button.closest(".url-shorten-result").id;
      button.closest(".url-shorten-result").remove();
      const index = savedURLs.findIndex((url) => url.id == linkId);
      savedURLs.splice(index, 1);
      localStorage.setItem("saved", JSON.stringify(savedURLs));
      removeAllGeneratedURLs();
    });
  });
}

// Copy URl
function copyURL() {
  let copyButtons = shortURLsWrapper.querySelectorAll(".copy-new-url");
  copyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      let urlText = button
        .closest(".url-shorten-result")
        .querySelector(".new-url p").textContent;
      const body = document.querySelector("body");
      const area = document.createElement("textarea");
      body.appendChild(area);
      area.value = urlText;
      area.select();
      document.execCommand("copy");
      button.classList.add("copied");
      button.innerHTML = "copied!";
      setTimeout(() => {
        button.classList.remove("copied");
        button.innerHTML = "copy";
      }, 1500);
      body.removeChild(area);
    });
  });
}

// Generate Random IDs
function reandomIds() {
  let currentTime = Date.now();
  let currentTimeString = currentTime.toString(32).slice(0, 8);
  let reandomNumber = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
    .toString()
    .slice(0, 4);
  let reabdomId = `${currentTimeString}-${reandomNumber}`;
  return reabdomId;
}

// === UPDATED BACKEND CALL ===
// Flask API instead of shrtco.de
async function makeShortURL(url) {
  try {
    let response = await fetch("/api/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    let data = await response.json();
    let status = data.ok;

    if (status) {
      let originalURL = data.result.original_link;
      let shortUrl = data.result.full_short_link;
      let generatedURL = {
        id: reandomIds(),
        originalURL: originalURL,
        shortUrl: shortUrl,
      };
      shortUrlForm.classList.add("success");
      submitButton.innerHTML = `<i class="fa-solid fa-check icon"></i> shortened!`;
      setTimeout(() => {
        shortUrlForm.classList.remove("success");
        submitButton.innerHTML = "shorten it!";
      }, 1700);
      generatedShortUrlHtml(generatedURL.id, originalURL, shortUrl);
      savedURLs.push(generatedURL);
      localStorage.setItem("saved", JSON.stringify(savedURLs));
    } else {
      submitButton.innerHTML = "shorten it!";
      let errorCode = data.error_code;
      switch (errorCode) {
        case 1:
          alerts("Please add a link first");
          break;
        case 2:
          alerts(data.error + ", Please check your link again.");
          break;
        case 10:
          alerts("The link you entered is not allowed to be shortened.");
          break;
        default:
          alerts(data.error || "Unknown error");
      }
    }
  } catch (error) {
    alerts("Sorry, unknown error happened please try again later.");
  }
}

// Submit handler
shortUrlForm.addEventListener("submit", (e) => {
  e.preventDefault();
  let inputValue = input.value.trim().replace(" ", "");
  submitButton.innerHTML = `<i class="fa-solid fa-spinner icon fa-spin"></i> Generating...`;
  makeShortURL(inputValue);
  shortUrlForm.reset();
});

// Show Alerts
function alerts(message) {
  shortUrlForm.classList.add("empty");
  alertMessage.textContent = message;
  setTimeout(() => {
    shortUrlForm.classList.remove("empty");
  }, 5000);
}

// Expand Header Navigation
function expandNavgation() {
  let navgation = document.querySelector(".header .main-navgation");
  let toggleMenu = document.querySelector(".header .burger-menu");
  let icon = toggleMenu.querySelector(".icon");
  let closed = true;

  toggleMenu.addEventListener("click", () => {
    icon.classList.contains("fa-bars")
      ? (icon.className = "fa-regular fa-xmark icon")
      : (icon.className = "fa-regular fa-bars icon");
    let navgationHeight = navgation.scrollHeight;
    closed
      ? (navgation.style.height = `${navgationHeight}px`)
      : (navgation.style.height = "");
    closed = !closed;
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 992) {
      icon.className = "fa-regular fa-bars icon";
      navgation.style.height = "";
      closed = true;
    }
  });
}
expandNavgation();
// === Dark / Light Mode Toggle ===
const themeToggle = document.getElementById("theme-toggle");
const body = document.body;

// Load saved theme
if (localStorage.getItem("theme") === "dark") {
  body.classList.add("dark-mode");
  themeToggle.innerHTML = `<i class="fa-regular fa-sun icon"></i>`;
}

// Toggle theme
themeToggle.addEventListener("click", () => {
  body.classList.toggle("dark-mode");
  if (body.classList.contains("dark-mode")) {
    localStorage.setItem("theme", "dark");
    themeToggle.innerHTML = `<i class="fa-regular fa-sun icon"></i>`;
  } else {
    localStorage.setItem("theme", "light");
    themeToggle.innerHTML = `<i class="fa-regular fa-moon icon"></i>`;
  }
});
