FROM node:20

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY . .

RUN npm run clean

EXPOSE 80

CMD ["npm", "run", "prod"]
