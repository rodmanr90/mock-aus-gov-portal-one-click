# VULNERABLE DOCKERFILE FOR DEMO PURPOSES
# Using an old base image with many CVEs
FROM node:14.17.0

# Run as root - VULNERABLE (Wiz will flag this)
USER root

WORKDIR /app

# Hardcoded Secret in Dockerfile - VULNERABLE
ENV ADMIN_PASSWORD="GovPassword123!"
ENV AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"

COPY package*.json ./

# Install dependencies (including those with vulnerabilities)
RUN npm install

COPY . .

EXPOSE 3000

# Using a vulnerable start command or similar
CMD ["node", "server.js"]
