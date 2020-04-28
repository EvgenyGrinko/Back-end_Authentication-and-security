# Back-end_Authentication-and-security

In this project was implemented 6 levels of user's data security:

1. Registration with local Username and Password.
2. Password encryption using "mongoose-encryption" module.
3. Password hashing with "md5" algorithm.
4. Password hashing and salting with "bcrypt" algorithm.
5. Registration by Username and Password using "Passport.js".
6. OAuth authorization with Google or Github account using "Passport.js".

Watch commit history for more details.

Final version of this website allows for users to register either locally (using Local Strategy of the "Passport.js"), 
or by their Google/Github account (using Passport strategies for authenticating by the OAuth 2.0 API). Every logged in user
is able to see the list of all users secrets, posted anonymously. Any user is able also to submit his secret (for the project
simplicity, in the database stored only one secret per user, if he submitted any).
