FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG SITE=https://www.example.com
ENV SITE=$SITE
RUN npm run build
ENV HOST=0.0.0.0 PORT=4321 DATA_DIR=/data
VOLUME /data
EXPOSE 4321
CMD ["npm", "start"]
