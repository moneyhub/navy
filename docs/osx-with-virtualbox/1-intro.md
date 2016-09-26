# Running Navy on OSX with VirtualBox

This guide is intended for users who want to run Navy without relying on
Docker for Mac. The main reason for this at the time of writing is that
Docker for Mac uses up a lot of disc space. As more docker images
are added this quickly adds up to a fair amount of disc bloat.

To mitigate against this problem, and until Docker or Mac can be installed to
an external HDD, the simplest option is to use VirtualBox to host the
docker-machine, thereby freeing up disc resource on dev machines.

### Steps Involved
1. If you have Docker for mac installed, you'll need to remove this.
    * You'll need to remove all existing docker containers and images.
    * You'll also need to clean up your docker environment variables.
2. You'll need to install the latest version of Docker ToolBox
3. Create a new docker-machine running on VirtualBox
4. Copy the virtual disk for your docker-machine to your external HDD
5. Re-allocate your virtual disk for docker-machine to your external HDD
6. Restart Navy using your external-ip
7. Port forward each active Navy service to your VirtialBox docker-machine

The following guides describe how to perform each step.
