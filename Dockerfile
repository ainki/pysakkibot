FROM node:16.20.0-alpine

WORKDIR /app
COPY . ./

RUN npm install

CMD ["npm", "start"]