# Create a new docker-machine

Now that docker Toolbox has been installed you'll need to create a new docker-machine. This will run on VirtualBox with the side effect of creating a virtual disk that can be copied to and external HDD.

1. First you'll want to create a new instance of your docker-machine using VirtualBox.
    ```
    $ docker-machine create --driver virtualbox default
    ```
2. Next, copy the docker environment variables so that docker and docker-compose know that you're using VirtualBox:
    ```
    $ eval $(docker-machine env default)
    ```
    *Tip: to speed this up in future, add and alias to your .bash_profile or .zshrc e.g.*
    ```
    alias dockerize='eval "$(docker-machine env default)"'
    ```
    *Then just use the following to copy these into your current shell*
    ```
    $ dockerize
    ```
3. Confirm that your new docker-machine is running:
    ```
    $ docker-machine start default
    $ docker-machine ls
    NAME             ACTIVE   DRIVER         STATE     URL                         SWARM   DOCKER    ERRORS
    default          *        virtualbox     Running   tcp://192.168.99.101:2376           v1.10.1
    ```
    
