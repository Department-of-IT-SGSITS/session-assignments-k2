// ---COGNITO AND API DETAILS ---
const cognitoConfig = {
  UserPoolId: "us-east-1_b2B3qymqU",
  ClientId: "1bhpl5kklaj9cavtbfib58b1fv",
};
const API_BASE_URL = "https://86aja8ns6k.execute-api.us-east-1.amazonaws.com";
// -----------------------------------------

const userPool = new AmazonCognitoIdentity.CognitoUserPool(cognitoConfig);
let currentUser;

// --- UI Element References ---
const views = ["app-view", "login-view", "signup-view", "confirm-view"];
const fileInput = document.getElementById("file-input");
const uploadButton = document.getElementById("upload-button");
const statusDiv = document.getElementById("status");
const fileList = document.getElementById("file-list");
const userEmailSpan = document.getElementById("user-email");
const progressBar = document.getElementById("progress-bar");

// --- UI State Management ---
function showView(viewId) {
  views.forEach((id) => document.getElementById(id).classList.add("hidden"));
  document.getElementById(viewId).classList.remove("hidden");
}

// --- API Calls ---
async function getJwtToken() {
  return new Promise((resolve, reject) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      reject(new Error("No user logged in."));
      return;
    }
    cognitoUser.getSession((err, session) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

// --- Cognito Authentication Logic ---
document
  .getElementById("signup-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    // Get all three values from the form
    const name = document.getElementById("signup-name").value;
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    // Create an attribute list for the name
    const attributeList = [];
    const dataName = {
      Name: "name",
      Value: name,
    };
    const attributeName = new AmazonCognitoIdentity.CognitoUserAttribute(
      dataName
    );
    attributeList.push(attributeName);

    // Pass the attribute list to the signUp function
    userPool.signUp(email, password, attributeList, null, (err, result) => {
      if (err) {
        document.getElementById("signup-status").innerText = err.message;
        return;
      }
      document.getElementById("signup-status").innerText =
        "Sign up successful! Please check your email for a confirmation code.";
      showView("confirm-view");
    });
  });

document
  .getElementById("confirm-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();
    const email = document.getElementById("signup-email").value; // Need email to confirm
    const code = document.getElementById("confirm-code").value;
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.confirmRegistration(code, true, (err, result) => {
      if (err) {
        document.getElementById("confirm-status").innerText = err.message;
        return;
      }
      document.getElementById("confirm-status").innerText =
        "Confirmation successful! You can now sign in.";
      showView("login-view");
    });
  });

document
  .getElementById("login-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const authenticationDetails =
      new AmazonCognitoIdentity.AuthenticationDetails({
        Username: email,
        Password: password,
      });
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        initApp();
      },
      onFailure: (err) => {
        document.getElementById("login-status").innerText = err.message;
      },
    });
  });

document.getElementById("sign-out-button").addEventListener("click", () => {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
  showView("login-view");
});

async function initApp() {
  currentUser = userPool.getCurrentUser();
  if (!currentUser) {
    showView("login-view");
    return;
  }

  currentUser.getSession((err, session) => {
    if (err || !session.isValid()) {
      showView("login-view");
      return;
    }

    // Get user attributes to find the 'name'
    currentUser.getUserAttributes((err, attributes) => {
      if (err) {
        // If there's an error, just fall back to the username
        console.error("Could not get user attributes:", err);
        userEmailSpan.textContent = currentUser.getUsername();
      } else {
        // Find the 'name' attribute from the list
        const nameAttribute = attributes.find((attr) => attr.Name === "name");
        const displayName = nameAttribute
          ? nameAttribute.Value
          : currentUser.getUsername();

        // Display the user's name
        userEmailSpan.textContent = displayName;
      }

      // Show the main app and load files
      showView("app-view");
      uploadButton.addEventListener("click", uploadFile);
      fetchFiles();
    });
  });
}

function renderFileList(files) {
  fileList.innerHTML = "";

  function formatDate(dateString) {
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleString(undefined, options);
  }

  if (files.length === 0) {
    fileList.innerHTML = "<li>No files uploaded yet.</li>";
    return;
  }

  files.forEach((file) => {
    const li = document.createElement("li");

    // === Left side: Info ===
    const fileInfoDiv = document.createElement("div");
    fileInfoDiv.className = "file-info";

    const tagSpan = document.createElement("span");
    tagSpan.textContent = file.tag || file.originalFileName;
    tagSpan.style.fontWeight = "bold";

    const renameInput = document.createElement("input");
    renameInput.type = "text";
    renameInput.value = file.tag || file.originalFileName;
    renameInput.className = "hidden";

    const dateSpan = document.createElement("span");
    dateSpan.textContent = `Uploaded: ${formatDate(file.uploadTimestamp)}`;
    dateSpan.style.display = "block";
    dateSpan.style.fontSize = "0.8em";
    dateSpan.style.color = "#6c757d";

    fileInfoDiv.appendChild(tagSpan);
    fileInfoDiv.appendChild(renameInput);
    fileInfoDiv.appendChild(dateSpan);

    // === Right side: Actions ===
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "file-actions";

    const downloadLink = document.createElement("a");
    downloadLink.href = file.downloadUrl;
    downloadLink.textContent = "Download";
    downloadLink.download = file.originalFileName;
    downloadLink.className = "action-button download-button"; // For styling

    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.className = "hidden";
    saveButton.onclick = () => renameFile(file.fileId, renameInput.value);

    const renameButton = document.createElement("button");
    renameButton.textContent = "Rename";
    renameButton.className = "rename-button";
    renameButton.onclick = () => {
      tagSpan.classList.add("hidden");
      dateSpan.classList.add("hidden");
      renameButton.classList.add("hidden");
      renameInput.classList.remove("hidden");
      saveButton.classList.remove("hidden");
      renameInput.focus();
    };

    const shareButton = document.createElement("button");
    shareButton.textContent = "Share";
    shareButton.className = "share-button";
    shareButton.onclick = () => getShareableLink(file.fileId);

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.className = "delete-button";
    deleteButton.onclick = () => deleteFile(file.fileId);

    actionsDiv.appendChild(saveButton);
    actionsDiv.appendChild(renameButton);
    actionsDiv.appendChild(shareButton);
    actionsDiv.appendChild(deleteButton);
    actionsDiv.appendChild(downloadLink);

    li.appendChild(fileInfoDiv);
    li.appendChild(actionsDiv);
    fileList.appendChild(li);
  });
}
// --- Core App Functions (using JWT Token) ---
async function fetchFiles() {
  try {
    console.log("5. fetchFiles started.");
    statusDiv.textContent = "Fetching file list...";
    const token = await getJwtToken();

    console.log("6. Token retrieved, about to fetch from API.");
    const response = await fetch(`${API_BASE_URL}/files`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch files");

    const files = await response.json();
    console.log("7. API call successful, rendering list.");
    renderFileList(files);
    statusDiv.textContent = "File list updated.";
  } catch (error) {
    statusDiv.textContent = `Error: ${error.message}`;
    console.error("ERROR in fetchFiles:", error); // <-- More detailed error log
  }
}

const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const clearSearchButton = document.getElementById("clear-search-button");

async function searchFiles() {
  const query = searchInput.value;
  if (!query) {
    return;
  }
  try {
    statusDiv.textContent = `Searching for "${query}"...`;
    const token = await getJwtToken();
    const response = await fetch(
      `${API_BASE_URL}/files/search?query=${query}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok) throw new Error("Search failed.");

    const files = await response.json();
    renderFileList(files);
    statusDiv.textContent = `Found ${files.length} result(s).`;
  } catch (error) {
    statusDiv.textContent = `Error: ${error.message}`;
    console.error("Error searching files:", error);
  }
}

searchButton.addEventListener("click", searchFiles);
clearSearchButton.addEventListener("click", () => {
  searchInput.value = "";
  fetchFiles();
});

// Replace your old uploadFile function with this new one
async function uploadFile() {
  const file = fileInput.files[0];
  const tag = document.getElementById("tag-input").value;

  if (!tag.trim()) {
    statusDiv.textContent = "Error: The tag field is required.";
    return;
  }

  if (!file) {
    statusDiv.textContent = "Please select a file first.";
    return;
  }

  const MAX_FILE_SIZE_MB = 5;
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    statusDiv.textContent = `Error: File is too large. Max size is ${MAX_FILE_SIZE_MB} MB.`;
    return;
  }
  const ALLOWED_FILE_TYPES = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "video/mp4",
  ];
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    statusDiv.textContent = `Error: Invalid file type.`;
    return;
  }

  progressBar.classList.remove("hidden"); // Show the progress bar
  progressBar.value = 0;
  statusDiv.textContent = "1/4: Getting secure upload URL...";

  try {
    const token = await getJwtToken();
    // Step 1: Get the presigned URL (same as before)
    const presignedUrlResponse = await fetch(`${API_BASE_URL}/get-upload-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }),
    });
    if (!presignedUrlResponse.ok) throw new Error("Failed to get upload URL");
    const { uploadUrl, storageKey } = await presignedUrlResponse.json();

    // Step 2: NEW - Upload the file directly to S3 using XMLHttpRequest
    statusDiv.textContent = "2/4: Uploading file to S3...";

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type);

      // This is the event listener for progress
      xhr.upload.onprogress = function (event) {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          progressBar.value = percentComplete;
        }
      };

      xhr.onload = function () {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error("S3 upload failed. Status: " + xhr.status));
        }
      };

      xhr.onerror = function () {
        reject(new Error("S3 upload failed due to a network error."));
      };

      xhr.send(file);
    });

    // Step 3: Save the metadata (same as before)
    statusDiv.textContent = "3/4: Saving file information...";
    const metadataResponse = await fetch(`${API_BASE_URL}/files`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        storageKey,
        originalFileName: file.name,
        fileSize: file.size,
        tag,
      }),
    });
    if (!metadataResponse.ok) throw new Error("Failed to save file metadata.");

    // Step 4: Refresh the file list (same as before)
    statusDiv.textContent = "4/4: Upload complete! Refreshing file list...";
    await fetchFiles();
    progressBar.classList.add("hidden"); // Hide the progress bar again
  } catch (error) {
    statusDiv.textContent = `Error: ${error.message}`;
    progressBar.classList.add("hidden"); // Hide on error
    console.error("Upload process failed:", error);
  }
}

async function deleteFile(fileId) {
  if (!confirm("Are you sure you want to delete this file?")) {
    return;
  }

  try {
    statusDiv.textContent = "Deleting file...";
    const token = await getJwtToken();

    const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to delete the file.");
    }

    statusDiv.textContent = "File deleted successfully. Refreshing list...";
    await fetchFiles();
  } catch (error) {
    statusDiv.textContent = `Error: ${error.message}`;
    console.error("Error deleting file:", error);
  }
}

// Add this new function to script.js
async function renameFile(fileId, newTag) {
  if (!newTag || !newTag.trim()) {
    statusDiv.textContent = "Tag cannot be empty.";
    return;
  }

  try {
    statusDiv.textContent = "Renaming file...";
    const token = await getJwtToken();

    // Call our new PATCH API endpoint
    const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tag: newTag }),
    });

    if (!response.ok) {
      throw new Error("Failed to rename the file.");
    }

    statusDiv.textContent = "File renamed successfully. Refreshing list...";
    await fetchFiles(); // Refresh the file list
  } catch (error) {
    statusDiv.textContent = `Error: ${error.message}`;
    console.error("Error renaming file:", error);
  }
}

async function getShareableLink(fileId) {
  try {
    statusDiv.textContent = "Generating shareable link...";
    const token = await getJwtToken();

    const response = await fetch(`${API_BASE_URL}/files/${fileId}/share`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to generate link.");
    }

    const { shareableUrl } = await response.json();

    // Copy the URL to the user's clipboard
    await navigator.clipboard.writeText(shareableUrl);

    statusDiv.textContent = "✅ Link copied to clipboard!";
  } catch (error) {
    statusDiv.textContent = `Error: ${error.message}`;
    console.error("Error getting shareable link:", error);
  }
}

const dropZone = document.getElementById("drop-zone");

["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(
    eventName,
    () => {
      dropZone.classList.add("drag-over");
    },
    false
  );
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(
    eventName,
    () => {
      dropZone.classList.remove("drag-over");
    },
    false
  );
});

dropZone.addEventListener("drop", handleDrop, false);

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;

  if (files.length > 0) {
    fileInput.files = files;
  }
}

// --- Initial Load ---
initApp();
