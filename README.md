# Mini Dropbox: A Serverless File Storage Application on AWS

A full-stack, cloud-native file storage application similar to Dropbox. This project allows users to sign up, log in, and securely upload, view, and download their files. The entire backend is built on a serverless architecture using AWS Lambda, API Gateway, S3, DynamoDB, and Cognito.

## Features

- **Secure User Authentication:** Full sign-up, email confirmation, and sign-in flow handled by Amazon Cognito.
- **Secure File Uploads:** Files are uploaded directly to a private S3 bucket using temporary, secure presigned URLs. The backend never processes the file's raw data.
- **Secure File Downloads:** Files are downloaded via presigned URLs, ensuring the S3 bucket remains private.
- **Dynamic File Listing:** File metadata is stored in DynamoDB and retrieved in real-time.
- **Server-Side Validation:** Enforces limits on file size and file type (images only) for security.
- **Infrastructure as Code (IaC):** The entire backend is defined and deployed using the Serverless Framework.
- **Static Site Hosting:** The vanilla JavaScript frontend is hosted on S3 for high availability and scalability.

## Tech Stack & Architecture

### Backend
- **Compute:** AWS Lambda (Node.js)
- **API:** Amazon API Gateway (HTTP API)
- **Storage:** Amazon S3
- **Database:** Amazon DynamoDB
- **Authentication:** Amazon Cognito
- **Permissions:** AWS IAM
- **Monitoring:** Amazon CloudWatch
- **Deployment:** Serverless Framework

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Amazon Cognito Identity SDK for JavaScript

### Architecture Diagram
The application follows a standard serverless web application pattern. The frontend (hosted on S3) communicates with a secure API Gateway. The API Gateway invokes Lambda functions that contain the business logic. These functions interact with other AWS services like S3 for storage, DynamoDB for metadata, and Cognito for user identity.



## Getting Started

To set up and run this project in your own AWS account, follow these steps.

### Prerequisites
- An AWS Account
- Node.js and npm installed
- AWS CLI configured locally (`aws configure`)
- Serverless Framework installed globally (`npm install -g serverless`)

### 1. Backend Deployment
1.  Navigate to the `mini-dropbox-backend` directory.
2.  Install the required Node.js dependencies:
    ```bash
    npm install
    ```
3.  Set up the required AWS resources manually:
    - **Amazon Cognito:** Create a User Pool and an App Client as detailed in the project steps. Note the **User Pool ID** and **App Client ID**.
    - **Amazon S3:** Create an S3 bucket for file uploads. Note the **Bucket Name**.
    - **Amazon DynamoDB:** Create a DynamoDB table named `files` with a primary key of `fileId` and a GSI on `userId`.
    - **AWS IAM:** Create the `MiniDropboxLambdaRole` with permissions for S3, DynamoDB, and CloudWatch Logs. Note the **Role ARN**.
4.  Update the `mini-dropbox-backend/serverless.yml` file with your specific resource details (Role ARN, Cognito IDs, Bucket Name, etc.).
5.  Deploy the backend stack:
    ```bash
    serverless deploy
    ```
6.  After deployment, copy the **API Base URL** from the output.

### 2. Frontend Deployment
1.  Create a new, separate S3 bucket for the frontend (e.g., `your-name-dropbox-frontend`).
2.  Enable **Static website hosting** on this bucket.
3.  Add a **public read-access bucket policy** to make the website accessible.
4.  Update the `frontend/script.js` file with your **Cognito User Pool ID**, **Cognito Client ID**, and the **API Base URL** from the backend deployment.
5.  Upload the `index.html`, `style.css`, and `script.js` files to the root of your frontend S3 bucket.
6.  Navigate to the **Bucket website endpoint** URL to use the application.

## API Endpoints

The following endpoints are created and secured by the Cognito Authorizer.

| Method | Path              | Protected? | Description                                          |
| :----- | :---------------- | :--------: | :--------------------------------------------------- |
| `POST` | `/get-upload-url` |    Yes     | Generates a presigned URL for uploading a file.        |
| `GET`  | `/files`          |    Yes     | Lists all files for the logged-in user.              |
| `DELETE`| `/files/{fileId}` |    Yes     | *(Future enhancement)* Deletes a specific file.       |

## Future Enhancements
- [ ] **Delete Files:** Implement the `DELETE /files/{fileId}` endpoint and corresponding Lambda and frontend logic.
- [ ] **Upload Progress Bar:** Add a visual progress bar for a better user experience during uploads.
- [ ] **Folder Management:** Allow users to create folders to organize their files.
- [ ] **File Sharing:** Implement functionality to generate a shareable link for a file.