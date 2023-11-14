FROM node:18
RUN apt update && apt install -y curl
RUN mkdir /usr/log 
RUN  chmod 777 -R /usr/log
RUN mkdir /usr/app
#copy all files from current directory to docker
RUN mkdir -p /usr/app/node_modules && chown -R node:node /usr/app
#/var/lib/docker/volumes/bureau_back/_data
WORKDIR /usr/app
COPY package.json ./
USER node
RUN npm install
COPY --chown=node:node . . 
RUN mkdir log && chmod 777 -R log
RUN npm install express
COPY . ./
EXPOSE 3001
HEALTHCHECK --interval=12s --timeout=12s --start-period=30s \  
CMD node healthcheck.js
CMD ["npm", "start"]
