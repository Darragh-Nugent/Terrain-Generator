Assignment 2 - Cloud Services Exercises - Response to Criteria
================================================

Instructions
------------------------------------------------
- Keep this file named A2_response_to_criteria.md, do not change the name
- Upload this file along with your code in the root directory of your project
- Upload this file in the current Markdown format (.md extension)
- Do not delete or rearrange sections.  If you did not attempt a criterion, leave it blank
- Text inside [ ] like [eg. S3 ] are examples and should be removed


Overview
------------------------------------------------

- **Name:** Darragh Nugent
- **Student number:** n11547227
- **Partner name (if applicable):** Bon Nguyen
- **Application name:** Winterscape
- **Two line description:** We have created an app that allows users to both generate 3D terrain images as well as simulate snowfall.
- **EC2 instance name or ID:**
i-023f65507fce85ab8
------------------------------------------------

### Core - First data persistence service

- **AWS service name:**  PostgresSQL
- **What data is being stored?:** Terrain Metadata
- **Why is this service suited to this data?:** Terrain metadata is highly structured and fits naturally into a relational, tabular format.
- **Why is are the other services used not suitable for this data?:** Given the data's tabular nature, NoSQL databases or S3 buckets won't have as efficient reads/writes as SQL databases.
- **Bucket/instance/table name:** s289.terrains
- **Video timestamp:** 00:10
- **Relevant files:**
    - src/db.js
    - src/models/terrainModel.js

### Core - Second data persistence service

- **AWS service name:**  DynamoDB
- **What data is being stored?:** Style configuration files in JSON format.
- **Why is this service suited to this data?:** DynamoDB is a NoSQL database optimized for storing semi-structured data like JSON.
- **Why is are the other services used not suitable for this data?:** SQL is best suited for structured, relational data anmd not semi-structured files and S3 buckets are not able to structure them as efficiently for key-based access.
- **Bucket/instance/table name:** n11547227-styles
- **Video timestamp:** 00:38
- **Relevant files:**
    - src/dynamo.js
    - src/models/styleModel.js

### Third data service

- **AWS service name:**  S3 Bucket
- **What data is being stored?:** Terrain images.
- **Why is this service suited to this data?:** S3 buckets are ideal for storing large image files.
- **Why is are the other services used not suitable for this data?:** Image data is too large to work efficiently with SQL and NoSQL databases.
- **Bucket/instance/table name:** n11547227-a2-terrains
- **Video timestamp:** 1:20
- **Relevant files:**
    - src/terrainBucket.js
    - src/models/terrainModel.js

### S3 Pre-signed URLs

- **S3 Bucket names:** n11547227-a2-terrains
- **Video timestamp:** 1:45
- **Relevant files:**
    - src/models/terrainModel.js

### In-memory cache

- **ElastiCache instance name:** group-88-winterscape-memcache
- **What data is being cached?:** JWT tokens
- **Why is this data likely to be accessed frequently?:** Every time a user performs an authenticated route (most of our routes) it needs to check if the token has been invalidated. Likewise, its TTL attribute will automatically clean up tokens which will be extremely important when the application scales up to users.
- **Video timestamp:** 2:12
- **Relevant files:**
    - src/controllers/userController.js
    - src/middleware/cognito.js

### Core - Statelessness

- **What data is stored within your application that is not stored in cloud data services?:** Heightmap data for terrain. Ffmpeg for 2D simualtion.
- **Why is this data not considered persistent state?:** For heightmap data, the application is mainly designed for storing the metadata and images of the terrain and not the exact heightmap values. They can be easily regenerated it needed. For ffmpeg, users do not require an account to access this. As such there is no account to save unique data to. Because it can easily be regenrerated if deleted.
- **How does your application ensure data consistency if the app suddenly stops?:** If the app stops, heightmap data is simply regernerated from metadata stored in PostgreSQL. Similarly, the ffpeg can be regenerated using the same inital conditions.
- **Relevant files:**
    - src/controllers/terrainController
    - src/models/terrainModel

### Graceful handling of persistent connections

- **Type of persistent connection and use:** [eg. server-side-events for progress reporting]
- **Method for handling lost connections:** [eg. client responds to lost connection by reconnecting and indicating loss of connection to user until connection is re-established ]
- **Relevant files:**
    -


### Core - Authentication with Cognito

- **User pool name:** Assessment 2 - Group 88 - WinterScape 
- **How are authentication tokens handled by the client?:** Response to login request returns an IdToken and Access token (AFTER validating MFA).
- **Video timestamp:** 3:12
- **Relevant files:**
    - src/models/userModels.js

### Cognito multi-factor authentication

- **What factors are used for authentication:** Password, Email One-Time Passcode
- **Video timestamp:** 3:50
- **Relevant files:**
    -   src/models/userModels.js

### Cognito federated identities

- **Identity providers used:**
- **Video timestamp:**
- **Relevant files:**
    -

### Cognito groups

- **How are groups used to set permissions?:** [eg. 'admin' users can delete and ban other users]
- **Video timestamp:**
- **Relevant files:**
    -

### Core - DNS with Route53

- **Subdomain**:  winterscape.cab432.com
- **Video timestamp:** 4:15

### Parameter store

- **Parameter names:** 
    - n11547227/terrain-app/db-host
    - n11547227/terrain-app/db-name
    - n11547227/terrain-app/db-username
    - n11547227/terrain-app/dynamo-name
    - n11547227/terrain-app/memcahed-url
    - n11547227/terrain-app/s3-bucket
- **Video timestamp:** 4:20
- **Relevant files:**
    - CloudFormationTemplate.yml
    - src/db.js
    - src/terrainBucket.js

### Secrets manager

- **Secrets names:** 
    - n11547227/terrain-app/cognito-credentials2
    - n11547227/terrain-app//db-password
- **Video timestamp:**
- **Relevant files:**
    - CloudFormationTemplate.yml
    - src/db.js
    - src/middleware/cognito.js

### Infrastructure as code

- **Technology used:** Cloud Formation
- **Services deployed:** Launch template/EC2 intance, Auto scaling group, Parameter store parameters.
- **Video timestamp:** 4:42
- **Relevant files:**
    - CloudFormationTemplate.yml
    - src/db.js
    - src/terrainBucket.js
    - src/middleware/cognito.js
    - src/dynamo.js

### Other (with prior approval only)

- **Description:**
- **Video timestamp:**
- **Relevant files:**
    -

### Other (with prior permission only)

- **Description:**
- **Video timestamp:**
- **Relevant files:**
    -