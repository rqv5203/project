# Assignments Repository

## Assignment 2

> Please checkout to the latest version of main to ensure project is up to date.  
> Begin by opening two terminals, one working directory at the project root, and another at client.  

## Commands
> In the root directory, run:  
$ npm install  
$ node server.js  
> In the client directory, run:  
$ npm install  
$ npm start  
> Respond to the prompt  
$ Something is already running on port 3000. Would you like to run the app on another port instead? » (Y/n)  
> Press enter  

## Social Media Login Integration  

### Google  
1. Create a project at console.cloud.google.com  
2. Navigate to  APIs and Services > OAuth Consent screen
3. Configure authorized domain (localhost), support email, devloper contact information
4. Define scopes (user requested data: name, profile, openid)
5. Define test users who will view the consent screen
6. Still under APIs and Services, navigate to Credentials
7. Set as Web Application and setup request URL and redirect URL (http://localhost:3000, http://localhost:3000/oauth)
8. In a terminal: npm install google-auth-library

### Linked In
1. Create a LinkedIn developer account at linkedin.com/developers
2. Select create app.
3. Create a name for your project, and connect with your existing LinkedIn account.
4. Define scopes (openid, profile, email).
5. Configure authorized redirect URL (http://localhost:3000/auth/linkedin/callback).
6. Verify your app from your email. 

## Troubleshooting  
> Ensure that both google and linked in client and secret IDs are defined in a .env file.   
> These can be obtained from the respective consoles.  
> Confirm that the correct test email is defined within each console.  
> See that each request and redirect domains are correct.
> Make sure that your LinkedIn app has been verified. 