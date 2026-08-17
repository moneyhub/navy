FROM jwilder/nginx-proxy

ADD ./nginx.tmpl /app/
ADD ./Procfile /app/
ADD ./status-helper.pl /app/
ADD ./error_503.html /usr/share/nginx/html/
ADD ./error_502.html /usr/share/nginx/html/
ADD ./error_page.css /usr/share/nginx/html/
ADD ./custom_settings.conf /etc/nginx/conf.d/
RUN chmod +x /app/status-helper.pl
