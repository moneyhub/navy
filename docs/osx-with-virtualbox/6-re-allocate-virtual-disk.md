# Re-allocate your virtual disk for docker-machine to your external HDD
- When the disk has been copied, you need to select the settings for your VM again and click on the Storage menu. This time, click on the ‘Add Hard Disk’ button.

- VirtualBox then asks you if you want to create a new disk or add an existing one. We want to use the disk we copied on to our external drive. Click on ‘Choose existing disk’ and browse to the location on your external drive.

- VirtualBox will then add the disk on your external drive to your storage tree. Click OK and start your VM.

- Lastly, don’t forget to remove the old VM from the location it originally was created in. Having my VM on an external Hard Drive allows me to free up space on my development machine. Another good idea is to Export Appliance once you have your VM set up just right. That way you can import it if you need to create a new VM or distribute it to others in your organization.
