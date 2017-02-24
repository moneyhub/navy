---
title: HTTP Proxy
---

HTTP Proxy
==========

Navy includes a built in Nginx reverse proxy which allows you to access all of your HTTP services on port 80 using `[servicename].[navyname].0.0.0.0.nip.io`.

This takes advantage of the [nip.io](http://nip.io) service, which provides a URL which resolves to whatever IP address you put in the subdomain, for example:

```
[servicename].[navyname].0.0.0.0.nip.io               resolves to 0.0.0.0
[servicename].[navyname].192.168.1.10.nip.io    resolves to 192.168.1.10
```

This allows Navy to easily proxy all of your HTTP services by using virtual hosts in nginx, and also allows for you to quickly reconfigure Navy so it is using your external LAN IP for nip.io domains so you can easily test your services on other devices on your LAN.

Navy will automatically pick up and proxy any services which publish port 80, but if your service uses another port then you will need to [explicitly configure it in `Navyfile.js`](navyfile-config.md).
