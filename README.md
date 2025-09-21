# Mini Dropbox: A Serverless File Storage Application on AWS

A full-stack, cloud-native file storage application similar to Dropbox. This project allows users to sign up, log in, and securely upload, view, search, share, and manage their personal files. The entire backend is built on a serverless architecture using AWS Lambda, API Gateway, S3, DynamoDB, and Cognito.

## Features

- **Secure User Authentication:** Full sign-up with name and email, account confirmation, and sign-in flow handled by Amazon Cognito.
- **Personalized Experience:** Greets users by their name after login.
- **File Tagging:** Users can add a custom "tag" or description to each file during upload for easy identification.
- **Secure File Uploads:** Files are uploaded directly to a private S3 bucket using temporary, secure presigned URLs.
- **Secure File Downloads:** Files are downloaded via presigned URLs that force a download action in the browser.
- **File Deletion:** Users can securely delete their own files, which removes the object from S3 and its metadata from DynamoDB.
- **File Renaming:** Users can update the tag of an existing file. The backend performs a secure, conditional update in DynamoDB to ensure ownership.
- **Search Functionality:** A search bar allows users to find files by their tag or original filename.
- **Shareable Links:** Users can generate a long-lived (7-day) shareable download link, which is automatically shortened using the TinyURL API.
- **Server-Side Validation:** Enforces limits on file size and allows a wide range of file types (images, PDFs, documents, videos).
- **Polished UI/UX:** The frontend features a real-time upload progress bar and drag-and-drop support for a modern user experience.
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
- **Third-Party Services:** TinyURL API

### Frontend
- HTML5, CSS3, Vanilla JavaScript
- Amazon Cognito Identity SDK for JavaScript

## Getting Started

### Prerequisites
- An AWS Account
- Node.js and npm installed
- AWS CLI configured locally (`aws configure`)
- Serverless Framework installed globally (`npm install -g serverless`)

### 1. Backend Deployment
1.  Navigate to the `mini-dropbox-backend` directory and run `npm install`.
2.  Manually create the following AWS resources:
    - **Amazon Cognito:** A User Pool with an App Client, configured to require the `name` attribute on sign-up. Note the **User Pool ID** and **App Client ID**.
    - **Amazon S3:** A private S3 bucket for file uploads. Note the **Bucket Name**.
    - **Amazon DynamoDB:** A DynamoDB table named `files` with a primary key of `fileId` and a GSI on `userId`.
    - **AWS IAM:** An IAM Role with a policy that allows Lambda to interact with S3, DynamoDB, and CloudWatch. Ensure the policy includes actions like `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` and `dynamodb:Query`, `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:DeleteItem`, `dynamodb:UpdateItem`. Note the **Role ARN**.
3.  Update the `mini-dropbox-backend/serverless.yml` file with your specific resource details.
4.  Deploy the backend stack:
    ```bash
    serverless deploy
    ```
5.  After deployment, copy the **API Base URL** from the output.

### 2. Frontend Deployment
1.  Create a new S3 bucket and enable **Static website hosting**.
2.  Add a **public read-access bucket policy**.
3.  Update the `frontend/script.js` file with your **Cognito User Pool ID**, **Client ID**, and the **API Base URL**.
4.  Upload your `index.html`, `style.css`, and `script.js` files to the bucket.
5.  Navigate to the **Bucket website endpoint** URL to use the application.

## API Endpoints

The following endpoints are created and secured by the Cognito Authorizer.

| Method | Path | Protected? | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/get-upload-url` | Yes | Generates a presigned URL for uploading a file. |
| `POST` | `/files` | Yes | Saves file metadata (tag, size, etc.) after an upload. |
| `GET` | `/files` | Yes | Lists all files for the logged-in user. |
| `DELETE` | `/files/{fileId}` | Yes | Deletes a specific file. |
| `PATCH` | `/files/{fileId}` | Yes | Renames a specific file's tag. |
| `POST` | `/files/{fileId}/share`| Yes | Generates a long-lived, shareable link via TinyURL. |
| `GET` | `/files/search` | Yes | Searches for files by tag or filename. |

## Future Enhancements
- **Folder Management:** Allow users to create folders and organize their files.
- **Multi-File Download:** Implement a feature to select multiple files and download them as a single `.zip` archive.
- **Automatic Image Previews:** Create a Lambda function that automatically generates thumbnails for uploaded images.