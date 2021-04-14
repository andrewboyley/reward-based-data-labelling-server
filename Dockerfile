FROM node:14

WORKDIR /jinx-server

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 4000

CMD ["node","dist/server.js"]