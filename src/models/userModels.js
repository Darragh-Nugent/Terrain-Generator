// const pool = require('../db');
// const Person = require("../data/Person");
// const bcrypt = require('bcrypt');

const Cognito = require("@aws-sdk/client-cognito-identity-provider");
const crypto = require("crypto");

// can go in secrets manager 
// https://ap-southeast-2.console.aws.amazon.com/cognito/v2/idp/user-pools/ap-southeast-2_uLIJT0rVY/applications/app-clients/3q30pl220o1tbp1tlqp8eiovse/quick-setup-guide?region=ap-southeast-2
const clientId = "3q30pl220o1tbp1tlqp8eiovse";
const clientSecret = "o6tpgds0s9fion8uii6gs8fa31djefrkg7m4rgi7cukb47iontk";
const userPoolId = "ap-southeast-2_uLIJT0rVY";
const client = new Cognito.CognitoIdentityProviderClient({ region: 'ap-southeast-2' });
const customId = "unused";

function secretHash(clientId, clientSecret, username) {
    const hasher = crypto.createHmac('sha256', clientSecret);
    hasher.update(`${username}${clientId}`);
    return hasher.digest('base64');
}

// for changing password, you have to call forgot password (sends code to email) and confirm password with the new code
// for authorized endpoints, you need an 'Authorization': `Bearer ${token}` in the header
// you will have to confirm the email after registering a user via add user
// change auth imports to cognito
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

        // Return a response indicating the user was created (but not the `sub` yet)
        return { message: "User created successfully, please check email for confirmation" };
    } catch (err) {
        console.log(err);
        throw new Error(`Error adding user: ${err.name}: ${err.message}`)
    }
}

/// need this after registration so users have to confirm their email ---------------------------------
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
// exports.AddUser = async (uName, pass) => {
//     try {
//         const result = await pool.query(
//             'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
//             [uName, pass]
//         );
//         return { id: result.rows[0].id, uName, pass };
//     } catch (err) {
//         console.log(err);
//     }
// }



// Trigger forgot password
exports.forgotPassword = async (username) => {
    try {
        const command = new Cognito.ForgotPasswordCommand({
            ClientId: clientId,
            Username: username,
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
        });

        const result = await client.send(command);
        console.log("Password reset confirmed:", result);
        return { success: true };
    } catch (err) {
        console.error("Error confirming password reset:", err);
        throw new Error(`Error confirming password reset: ${err.name}: ${err.message}`);
    }
}

// // Update function adapted for Cognito
// exports.update = async (username, old_password, new_password) => {
//   try {
//     // Step 1: Trigger forgot password flow
//     await forgotPassword(username); // Send verification code to the user's email/phone

//     // Step 2: The user receives the verification code (you need to handle this UI-side)
//     // Step 3: After the user enters the code, you confirm the password reset
//     // This is where the user would provide the code and new password

//     // Example values (these would be user inputs):
//     const verificationCode = "user-input-verification-code"; // This is the code the user got via email/SMS
//     const result = await confirmPassword(username, verificationCode, new_password); // Confirm password reset

//     return { updated: result.success };
//   } catch (err) {
//     throw new Error("An error occurred while updating the password: " + err.message);
//   }
// };


// exports.update = async (username, old_password, new_password) => {
//     try {
//         const valid_user = await this.verifyUser(username, old_password);
//         if (valid_user.id && valid_user.username) {
//             let salt_rounds = 10;
//             const hash = await bcrypt.hash(new_password, salt_rounds);

//             const result = await pool.query(
//                 'UPDATE users SET password = $1 WHERE username = $2',
//                 [hash, username]
//             );
//             return { updated: result.affectedRows > 0 };
//         }
//         else {
//             throw new Error("Invalid username or password!");
//         }
//     } catch (err) {
//         throw new Error("An error occured while updating: " + err.message);
//     }
// };

// exports.remove = async (id) => {
//     let conn;
//     try {
//         const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
//         return { deleted: result.rowCount > 0 };
//     } catch (err) {
//         throw new Error("An error has occured while deleting a user: " + err.message);
//     }
// };

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
// authcontrller uses this but like authcontrller not even used

// exports.findByUsername = async (uName) => {
//     const conn = await pool.getConnection();
//     try {
//         const result = await pool.query('SELECT * FROM users WHERE username = $1', [uName]);
//         if (result.rows.length === 0) return null;

//         const user = result.rows[0];
//         return new Person(user.id, user.username, user.password);
//     } catch (err) {
//         throw new Error("An error has occured while finding a user: " + err.message);
//     }
// }
// async function findByUsername(username) {
//     try {
//         const command = new ListUsersCommand({
//             UserPoolId: 'YOUR_USER_POOL_ID',
//             Filter: `username = "${username}"`, // Filter for username (can also filter by other attributes)
//             Limit: 1, // Limit the results to just 1 user
//         });

//         const data = await client.send(command);

//         if (data.Users.length === 0) {
//             return null; // If no user found, return null
//         }

//         const user = data.Users[0].Attributes.reduce((acc, attr) => {
//             acc[attr.Name] = attr.Value;
//             return acc;
//         }, {});

//         // Example: return user object with relevant data
//         return new Person(user.sub, user.username, user.email);
//     } catch (err) {
//         console.error("Error finding user:", err);
//         throw new Error("An error has occurred while finding the user in Cognito: " + err.message);
//     }
// }



// exports.checkUserExists = async (username) => {
//     let conn;
//     try {
//         const result = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
//         return { result: result.rows.length > 0 };
//     } catch (err) {
//         throw new Error("Error retreiving user: " + err.message)
//     }
// }

exports.checkUserExists = async (username) => {
    try {
        const command = new Cognito.ListUsersCommand({
            UserPoolId: userPoolId, // Replace with your User Pool ID
            Filter: `username = "${username}"`, // Filter for username
            Limit: 1, // Limit to only 1 result
        });

        const data = await client.send(command);

        // If data.Users is not empty, the user exists
        return { result: data.Users.length > 0 }; // Returns true if user exists
    } catch (err) {
        console.error('Error checking if user exists in Cognito:', err);
        throw new Error(`Error checking user existance: ${err.name}: ${err.message}`);
    }
};


// exports.verifyUser = async (username, password) => {
//     let conn;
//     try {
//         const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
//         if (result.rows.length === 0) throw new Error("Invalid username or password");
//         if (result.rows.length <= 0) throw new Error("User does not exist!");

//         const user = result.rows[0];

//         const correct_password = await bcrypt.compare(password, user.password);
//         if (!correct_password) throw new Error("Invalid username or password");

//         return { id: user.id, username: user.username };
//     } catch (err) {
//         throw new Error("Error verifying user: " + err.message)
//     }
// };
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