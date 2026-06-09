mkcert -install
mkcert -key-file docker/nginx/certs/localhost-key.pem -cert-file docker/nginx/certs/localhost.pem localhost
