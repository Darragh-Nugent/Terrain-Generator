FROM nginx:alpine

COPY UI/ /usr/share/nginx/html/
COPY styles/ /usr/share/nginx/html/styles/
COPY js/ /usr/share/nginx/html/js/

# Add custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
