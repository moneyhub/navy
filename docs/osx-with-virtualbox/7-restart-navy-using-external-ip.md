# Restart Navy using External IP
Now that you have your docker-machine installed on your external HDD, you'll need to wake it up and restart Navy. As your docker-machine will be running from the IP supplied by VirtrualBox, you'll need to run your Navy services from your Dev machines IP and then foward each serivces port to your docker-machine running on VirtualBox (Phew!).

1. Restart your docker-machine
    ```
    $ docker-machine start default
    ```

2. Set your Navy config to use your external-ip
    ```
    $ navy config set external-ip 10.2.3.4 # or whatever your external IP is
    ```
3. Navy should now restart each service using your external IP. To check that this has happened correctly run, you should see that your exc:
    ```
    $ navy external-ip
    10.2.3.4
    ```
