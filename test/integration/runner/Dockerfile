FROM ubuntu:18.04

ARG DOCKER_COMPOSE_VERSION
ARG NODE_VERSION

RUN apt-get update -y && apt-get install -y build-essential git curl

RUN curl -sL https://deb.nodesource.com/setup_$NODE_VERSION.x | bash - && apt-get install -y nodejs software-properties-common python

RUN curl -L https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose
RUN chmod +x /usr/local/bin/docker-compose

ADD ./test/integration/runner/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR /usr/src/app
ADD package.json ./
RUN npm i

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["sh"]
