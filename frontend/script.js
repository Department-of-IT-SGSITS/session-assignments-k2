// ---COGNITO AND API DETAILS ---
const cognitoConfig = {
    UserPoolId: 'us-east-1_gT7aTwLmQ', 
    ClientId: '7kjlbaivc6l2rj7otiahdp49m6',
};
const API_BASE_URL = 'https://86aja8ns6k.execute-api.us-east-1.amazonaws.com';
// -----------------------------------------

const userPool = new AmazonCognitoIdentity.CognitoUserPool(cognitoConfig);
let currentUser;

// --- UI Element References ---
const views = ['app-view', 'login-view', 'signup-view', 'confirm-view'];
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-button');
const statusDiv = document.getElementById('status');
const fileList = document.getElementById('file-list');
const userEmailSpan = document.getElementById('user-email');

// --- UI State Management ---
function showView(viewId) {
    views.forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
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
document.getElementById('signup-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    userPool.signUp(email, password, [], null, (err, result) => {
        if (err) {
            document.getElementById('signup-status').innerText = err.message;
            return;
        }
        document.getElementById('signup-status').innerText = 'Sign up successful! Please check your email for a confirmation code.';
        showView('confirm-view');
    });
});

document.getElementById('confirm-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const email = document.getElementById('signup-email').value; // Need email to confirm
    const code = document.getElementById('confirm-code').value;
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({ Username: email, Pool: userPool });
    
    cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
            document.getElementById('confirm-status').innerText = err.message;
            return;
        }
        document.getElementById('confirm-status').innerText = 'Confirmation successful! You can now sign in.';
        showView('login-view');
    });
});

document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({ Username: email, Password: password });
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({ Username: email, Pool: userPool });

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
            initApp();
        },
        onFailure: (err) => {
            document.getElementById('login-status').innerText = err.message;
        },
    });
});

document.getElementById('sign-out-button').addEventListener('click', () => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
        cognitoUser.signOut();
    }
    showView('login-view');
});

async function initApp() {
    currentUser = userPool.getCurrentUser();
    if (!currentUser) {
        showView('login-view');
        return;
    }
    
    currentUser.getSession(async (err, session) => {
        if (err || !session.isValid()) {
            showView('login-view');
            return;
        }
        userEmailSpan.textContent = currentUser.getUsername();
        showView('app-view');
        
        uploadButton.addEventListener('click', uploadFile);
        
        // Fetch initial files
        await fetchFiles();
    });
}

// --- Core App Functions (using JWT Token) ---
async function fetchFiles() {
    try {
        statusDiv.textContent = 'Fetching file list...';
        const token = await getJwtToken();
        const response = await fetch(`${API_BASE_URL}/files`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch files');
        
        const files = await response.json();
        fileList.innerHTML = '';
        files.forEach(file => {
            const li = document.createElement('li');
            const link = document.createElement('a');
            link.href = file.downloadUrl;
            link.textContent = `${file.originalFileName} (${(file.fileSize / 1024).toFixed(2)} KB)`;
            link.download = file.originalFileName;
            li.appendChild(link);
            fileList.appendChild(li);
        });
        statusDiv.textContent = 'File list updated.';
    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
        console.error('Error fetching files:', error);
    }
}

async function uploadFile() {
    const file = fileInput.files[0];
    if (!file) {
        statusDiv.textContent = 'Please select a file first.';
        return;
    }
    // Client-side validation
    const MAX_FILE_SIZE_MB = 5;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        statusDiv.textContent = `Error: File is too large. Max size is ${MAX_FILE_SIZE_MB} MB.`;
        return;
    }
    const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png"];
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        statusDiv.textContent = `Error: Invalid file type. Please upload a JPG or PNG.`;
        return;
    }

    statusDiv.textContent = '1/3: Getting secure upload URL...';

    try {
        const token = await getJwtToken();
        const response = await fetch(`${API_BASE_URL}/get-upload-url`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to get upload URL');
        }
        const { uploadUrl } = await response.json();

        statusDiv.textContent = '2/3: Uploading file to S3...';
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type }
        });
        
        if (!uploadResponse.ok) throw new Error('S3 upload failed');

        statusDiv.textContent = '3/3: Upload complete! Refreshing file list...';
        setTimeout(fetchFiles, 2000);
    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
        console.error('Upload process failed:', error);
    }
}

// --- Initial Load ---
initApp();