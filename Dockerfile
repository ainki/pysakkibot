FROM node:19.9.0-alpine

WORKDIR /app
COPY . ./

RUN npm install

CMD ["npm", "start"]