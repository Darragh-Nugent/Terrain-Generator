const Cognito = require("@aws-sdk/client-cognito-identity-provider");
const crypto = require("crypto");
const jwt = require('jsonwebtoken');
const pool =require('../db')
// can go in secrets manager 
// https://ap-southeast-2.console.aws.amazon.com/cognito/v2/idp/user-pools/ap-southeast-2_uLIJT0rVY/applications/app-clients/3q30pl220o1tbp1tlqp8eiovse/quick-setup-guide?region=ap-southeast-2
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const userPoolId = process.env.USER_POOL_ID;
const client = new Cognito.CognitoIdentityProviderClient({ region: 'ap-southeast-2' });
const customId = "unused";

function secretHash(clientId, clientSecret, username) {
    const hasher = crypto.createHmac('sha256', clientSecret);
    hasher.update(`${username}${clientId}`);
    return hasher.digest('base64');
}

exports.AddUser = async (uName, email, pass) => {
    try {
        const command = new Cognito.SignUpCommand({
            ClientId: clientId,
            SecretHash: secretHash(clientId, clientSecret, uName),
            Username: uName,
            Password: pass,
            UserAttributes: [{ Name: "email", Value: email }, { Name: "custom:id", Value: customId }],
        });
        const res = await client.send(command);
        console.log("SignUp response: ", res);

        // add user to postgre
        const id = res.UserSub;
        try {
            const result = await pool.query(
                'INSERT INTO users (id, username, password) VALUES ($1, $2, %3) RETURNING id',
                [id, uName, pass]
            );
            return { id: id, uName, pass };
        } catch (err) {
            console.log(err);
        }
        // Return a response indicating the user was created (but not the `sub` yet)
        return { message: "User created successfully, please check email for confirmation" };
    } catch (err) {
        console.log(err);
        throw new Error(`Error adding user: ${err.name}: ${err.message}`)
    }
}

exports.confirmUser = async (uName, confirmationCode) => {
    try {
        // Check if username and confirmation code are provided
        if (!uName || !confirmationCode) {
            throw new Error('Username and confirmation code are required.');
        }

        // Step 1: Confirm the user
        const confirmCommand = new Cognito.ConfirmSignUpCommand({
            ClientId: clientId,
            SecretHash: secretHash(clientId, clientSecret, uName),
            Username: uName,
            ConfirmationCode: confirmationCode,
        });

        const res = await client.send(confirmCommand);

        // Step 2: Check the response and log it
        console.log('User confirmed successfully:', res);
        return { success: true, message: 'User confirmed successfully' };
    } catch (err) {
        console.error('Error confirming user:', err);
        throw new Error(`Error confirming user: ${err.name}: ${err.message}`)
    };
}
exports.resendConfirmationCode = async (username) => {
    try {
        const command = new Cognito.ResendConfirmationCodeCommand({
            ClientId: clientId,
            Username: username,
            SecretHash: secretHash(clientId, clientSecret, username)
        });

        const response = await client.send(command);

        return {
            success: true,
            message: 'Confirmation code resent successfully',
            deliveryDetails: response.CodeDeliveryDetails
        };
    } catch (err) {
        console.error('Cognito error:', err);
        throw new Error(`Could not resend confirmation code: ${err.name}: ${err.message}`);
    }
};



exports.getAll = async () => {
    try {
        // Prepare the ListUsers command
        const command = new Cognito.ListUsersCommand({
            UserPoolId: userPoolId,
        });

        // Send the command to AWS Cognito
        const result = await client.send(command);

        // Extract the list of users
        const users = result.Users.map(user => ({
            username: user.Username,
            email: user.Attributes.find(attr => attr.Name === 'email')?.Value,
            status: user.Status,
            created: user.UserCreateDate,
            modified: user.UserLastModifiedDate,
        }));

        return users;
    } catch (err) {
        console.log("Error fetching users from Cognito:", err);
        throw `Error getting all users: ${err.name}: ${err.message}`;  // You can throw or return a custom error here
    }
};



// Trigger forgot password
exports.forgotPassword = async (username) => {
    try {
        const command = new Cognito.ForgotPasswordCommand({
            ClientId: clientId,
            Username: username,
            SecretHash: secretHash(clientId, clientSecret, username)
        });

        const result = await client.send(command);
        console.log("Forgot password initiated:", result);
        return { success: true };
    } catch (err) {
        console.error("Error triggering forgot password:", err);
        throw new Error(`Error triggering forget password: ${err.name}: ${err.message}`);
    }
}

// Confirm the password reset after user provides the verification code
exports.confirmPassword = async (username, verificationCode, newPassword) => {
    try {
        const command = new Cognito.ConfirmForgotPasswordCommand({
            ClientId: clientId,
            Username: username,
            ConfirmationCode: verificationCode, // Code sent to the user
            Password: newPassword,               // The new password chosen by the user
            SecretHash: secretHash(clientId, clientSecret, username)
        });

        const result = await client.send(command);
        console.log("Password reset confirmed:", result);
        return { success: true };
    } catch (err) {
        console.error("Error confirming password reset:", err);
        throw new Error(`Error confirming password reset: ${err.name}: ${err.message}`);
    }
}

// Function to allow a logged-in user to delete their own account
exports.remove = async (accessToken) => {
    try {
        const command = new Cognito.DeleteUserCommand({
            AccessToken: accessToken, // The access token of the logged-in user
        });

        const result = await client.send(command);
        console.log("User deleted successfully from Cognito");
        return { deleted: true };
    } catch (err) {
        console.error("Error deleting user from Cognito:", err);
        throw new Error(`Error deleting user: ${err.name}: ${err.message}`);
    }
}

// this is to prevent refresh tokens -- does not invalidate active tokens
exports.invalidateToken = async (accessToken) => {
    try {
        const command = new Cognito.GlobalSignOutCommand({
            AccessToken: accessToken,
        });
        await client.send(command);
        console.log('Global sign out successful');
    } catch (error) {
        console.error('Error during global sign out:', error);
        // Handle error appropriately, e.g., throw or return a response
        throw new Error(`Error signing out user globally: ${err.name}: ${err.message}`);
    }
}


exports.respondToMFA = async (username, mfaCode, session, challengeName) => {
    // Map challenge names to the appropriate MFA code key
    const codeKeyMap = {
        EMAIL_OTP: 'EMAIL_OTP_CODE',
        SOFTWARE_TOKEN_MFA: 'SOFTWARE_TOKEN_MFA_CODE',
        SMS_MFA: 'SMS_MFA_CODE',
    };

    const codeKey = codeKeyMap[challengeName];

    if (!codeKey) {
        throw new Error(`Unsupported challenge name: ${challengeName}`);
    }

    const command = new Cognito.RespondToAuthChallengeCommand({
        ChallengeName: challengeName,
        ClientId: clientId,
        ChallengeResponses: {
            USERNAME: username,
            [codeKey]: mfaCode, // Dynamically assign correct key
            SECRET_HASH: secretHash(clientId, clientSecret, username),
        },
        Session: session,
    });
    return await client.send(command);
};
exports.verifyUser = async (username, password) => {
    try {
        const command = new Cognito.InitiateAuthCommand({
            AuthFlow: Cognito.AuthFlowType.USER_PASSWORD_AUTH, // Authentication flow type
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password,
                SECRET_HASH: secretHash(clientId, clientSecret, username),
            },
            ClientId: clientId,
        });

        // Send the command to initiate authentication
        const result = await client.send(command);
        // Scenario 1 - if userpool MFA is mandatory
        if (result.ChallengeName === 'SMS_MFA' || result.ChallengeName === 'SOFTWARE_TOKEN_MFA' || result.ChallengeName === "EMAIL_OTP") {
            return {
                challenge: true,
                challengeName: result.ChallengeName,
                session: result.Session, // for the /auth/mfa endpoint
                message: 'MFA required. Please provide the MFA code.',
            };
        }

        // Scenario 2- if userpool MFA is optional
        // If successful, Cognito returns authentication tokens (ID token, Access token)
        if (result.AuthenticationResult) {
            // You can extract user info from the AuthenticationResult or decode the ID token
            const { IdToken, AccessToken } = result.AuthenticationResult;
            console.log('Authentication successful:', IdToken, AccessToken);

            // Decode the IdToken to get the user's attributes like sub and username
            const decodedToken = jwt.decode(IdToken); // Decode the ID token to extract user info

            // The 'sub' field contains the unique Cognito User ID
            const { sub, 'cognito:username': cognitoUsername, email } = decodedToken; // Extract the sub and username from the decoded token

            // Return both the sub (user ID) and username
            return { id: sub, email: email, username: cognitoUsername, AccessToken: AccessToken, IdToken: IdToken }; // sub is the Cognito User ID
        } else {
            throw new Error('Invalid username or password');
        }

    } catch (err) {
        if (err.name === 'NotAuthorizedException') {
            throw new Error('Invalid username or password');
        } else if (err.name === 'UserNotFoundException') {
            throw new Error('User does not exist');
        }
        else if (err.name === 'UserNotConfirmedException') {
            throw new Error('User is not confirmed. Please check your email for the confirmation code.');
        }
        console.error("Error verifying user:", err);
        throw new Error(`Error verifying user: ${err.name}: ${err.message}`);
    }
};