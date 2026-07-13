FROM public.ecr.aws/docker/library/nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY dist/subastas-front/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]