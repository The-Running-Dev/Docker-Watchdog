# Use the official lightweight Node.js image.
FROM node:alpine

ENV deployDir=./deploy

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy the built application code to the container image.
COPY $deployDir .

# Install production dependencies.
RUN npm install --omit-dev

# Run the web service on container startup.
CMD ["npm", "start"]