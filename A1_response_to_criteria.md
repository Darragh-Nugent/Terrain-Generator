Assignment 1 - REST API Project - Response to Criteria
================================================

Overview
------------------------------------------------

- **Name:** Darragh Nugent
- **Student number:** n11547227
- **Application name:** Terrain Generator
- **Two line description:** This REST API provides users the ability for users to generate their own 3D Perlin noise Terrains using set parameters. Users are then able to genrate an image of an example of what their 3D terrain might mook like as well as generate an image of their 2D height map for use in their own systems.


Core criteria
------------------------------------------------

### Containerise the app

- **ECR Repository name:** n11547227-a1
- **Video timestamp:**
- **Relevant files:**
    - Dockerfile
    - docker-compose.yml

### Deploy the container

- **EC2 instance ID:**
- **Video timestamp:**

### User login

- **One line description:** Users able to register their details which are stored in MariaDB. THey can then login using these stored details. JWS tokens are used for sessions and passwords are encrypted using Bcrypt.
- **Video timestamp:**
- **Relevant files:**
    - 

### REST API

- **One line description:** REST API with endpoints (as nouns) and HTTP methods (GET, POST, PUT, DELETE), and appropriate status codes
- **Video timestamp:**
- **Relevant files:**
    - app.js
    - client/index.html
    - controllers/terrainController.js
    - controllers/userController.js
    - controllers/authController.js

### Data types

- **One line description:** 3 data types used. Terrain metadata, terrain images, and terrain styles JSON file.
- **Video timestamp:**
- **Relevant files:**
    - data/Terrain.js
    - rules.json
    - controllers/terrainController.js

#### First kind

- **One line description:** Terrain metadata
- **Type:** Structured with Acid
- **Rationale:** Metadata stored in MariaDB database instead of storing entire image
- **Video timestamp:**
- **Relevant files:**
    - db.js
    - models/terrainModel.js

#### Second kind

- **One line description:** Terrain images
- **Type:** Unstructured
- **Rationale:** Too large for database, are streamed directly to the user instead
- **Video timestamp:**
- **Relevant files:**
  - controllers/terrainController.js

### CPU intensive task

 **One line description:** Generate terrain using a large terrain size and a large number of erosion iterations
- **Video timestamp:** 
- **Relevant files:**
    - data/Terrain.js
    - controllers/terrainController.js

### CPU load testing

 **One line description:** Script to generate requests to get image for large terrain
- **Video timestamp:** 
- **Relevant files:** #####################################################
    - 

Additional criteria
------------------------------------------------

### Extensive REST API features

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 

### External API(s)

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 

### Additional types of data

- **One line description:** Style data stored in JSON file
- **Video timestamp:**
- **Relevant files:**
    - rules.json

#### Third kind

- **One line description:** Terrain styles
- **Type:** Structured with without Acid
- **Rationale:** Styles for 3D terrain examples stored in JSON files due to its hierarchical nature.
- **Video timestamp:**
- **Relevant files:**
    - rules.json

### Custom processing

- **One line description:** Terrains are generated using custom height map generator (using Perlin noise library) as well as custom erosion simulation code.
- **Video timestamp:**
- **Relevant files:**
    - data/Terrain.js

### Infrastructure as code

- **One line description:** #########################################
- **Video timestamp:**
- **Relevant files:**
    - docker-compose.yml

### Web client

- **One line description:** Fully functional GUI web client that utilises all endpoints.
- **Video timestamp:**
- **Relevant files:**
    -   client/index.html

### Upon request

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 