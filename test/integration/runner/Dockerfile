FROM ubuntu

ARG DOCKER_COMPOSE_VERSION

RUN apt-get update -y && apt-get install -y build-essential git curl

RUN curl -sL https://deb.nodesource.com/setup_6.x | bash - && apt-get install -y nodejs python-software-properties python

RUN curl -L https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose
RUN chmod +x /usr/local/bin/docker-compose

ADD ./test/integration/runner/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR /usr/src/app
ADD package.json ./
RUN npm i

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["sh"]
