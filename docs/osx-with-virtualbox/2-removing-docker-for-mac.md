# Removing Docker for Mac

1. Remove all existing docker images and containers using the following
    - Delete all containers
        ```
        $ docker rm $(docker ps -a -q)
        ```
    - Delete all images
        ```
        $ docker rmi $(docker images -q)
        ```
2. Next uninstall docker for Mac, run
    ```
    $ /Applications/Docker.app/Contents/MacOS/Docker --uninstall
    ```
3. You'll also need to reset your your docker environment variables as Docker for Mac will have created symlinks for docker, docker-compose and docker-machine. Firstly check to see if any Docker environment variables exist:
    ```
    $ env | grep DOCKER
    DOCKER_HOST=tcp://192.168.99.100:2376
    DOCKER_MACHINE_NAME=default
    DOCKER_TLS_VERIFY=1
    DOCKER_CERT_PATH=/Users/victoriabialas/.docker/machine/machines/default
    ```
    If they do exist then remove then with :
    ```
    $ unset DOCKER_TLS_VERIFY
    $ unset DOCKER_CERT_PATH
    $ unset DOCKER_MACHINE_NAME
    $ unset DOCKER_HOST
    ```
