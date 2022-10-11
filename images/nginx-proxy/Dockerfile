FROM jwilder/nginx-proxy

ADD ./nginx.tmpl /app/
ADD ./error_503.html /usr/share/nginx/html/
ADD ./error_502.html /usr/share/nginx/html/
ADD ./error_page.css /usr/share/nginx/html/
ADD ./custom_settings.conf /etc/nginx/conf.d/
