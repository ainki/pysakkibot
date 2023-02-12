FROM node:16.16.0-alpine

WORKDIR /app
COPY . ./

RUN npm install

CMD ["npm", "start"]