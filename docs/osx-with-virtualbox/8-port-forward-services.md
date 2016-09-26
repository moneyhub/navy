# Port forward each active Navy service to your VirtialBox docker-machine
The final step is to port-forward each external port used for each active service to your docker-machine running on VirtualBox.

The complication here is that Navy at the moment will only return each services external port if your know both the service name and it's internal port. To simplify this process you can use the following bash script which essentially reads the output of ``` $ navy ps ``` and port-forwards each active service to your docker-machine on VirtualBox.

Copy the following :
```
IFS=' '
output=$(navy ps)
while read -r line; do
  running=$(echo $line | awk '{ print $4 }');
  if test "$running" = "running"; then
    service=$(echo $line | awk '{ print $2 }');
    internal=$(echo $line | grep -o -- '->[0-9]\+/tcp' | grep -o '[0-9]\+');
    external=$(navy port "$service" "$internal");
    VBoxManage controlvm "default" natpf1 delete "${service}">/dev/null 2>&1
    VBoxManage controlvm "default" natpf1 "${service},tcp,,${external},,${external}">/dev/null 2>&1
    echo "Adding port forwarding for: \`${service}\` from \`${internal}\` to \`${external}\`"
  fi
done <<< "$output"
```

Save this script to a file e.g. map-navy-ports.sh and execute that file from the command line

```
$ map-navy-ports.sh
```

You can check that this has worked by going to yout VirtualBix GUI for your docker-machine, right click and select settings > Network > Advanced > Port Forwarding

You should then see a list of each service with it's external port mapped.
