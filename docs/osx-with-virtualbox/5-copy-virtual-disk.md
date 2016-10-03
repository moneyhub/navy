# Copy the virutal disk for your docker-machine to your external HDD
- In VirtualBox GUI, Navigate to the settings for the specific VM you want to relocate. Click on the Storage item and select your vdi file (your hard disk). Click on ‘Remove Attachment’.

- When you have done that, click on OK and then open up the Virtual Media Manager from the VirtualBox file menu.

- Select your disk.(vdi/vmdk) file again from the Hard drives tab and click on the Remove button.

- VirtualBox will now prompt you to confirm your selection to remove the hard disk (unless you selected not to show this message at an earlier time). Click on the ‘Remove’ button.

- Because we want to relocate the VM, you need to keep the hard disk. If you delete it here… well, just don’t.

- Once you have done that, go the the disk location for your VM (mine was at “C:\Users\[username]\VirtualBox”, but your path will be different) and copy it to your external drive. Go make a cup of coffee.
