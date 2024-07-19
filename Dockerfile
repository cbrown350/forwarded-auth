FROM node:21-slim AS build

# Install tools for packages
RUN apt-get update \
    && apt-get install -y \
        build-essential \
        python3-launchpadlib \
            --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Build/Install node_modules
WORKDIR /app
COPY package*.json ./
ENV NODE_ENV=production
RUN npm ci --omit=dev


FROM node:21-slim 

ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=America/Denver
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install Python3 needed for some node packages
RUN apt-get update \
    && apt-get install -y \
        python3-launchpadlib \
            --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install app dependencies
COPY package*.json ./

ENV NODE_ENV=production
COPY --chown=user:group --from=build /app/node_modules ./node_modules

COPY src/ ./src/

ENV SERVER_IP=0.0.0.0
ENV SERVER_PORT=8000
RUN mkdir /app/config
ENV DB_FILE_PATH=/app/config/json.sqlite

EXPOSE ${SERVER_PORT}
CMD [ "npm", "start" ]
