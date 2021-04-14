docker build -t jinx/express-server .
docker rmi -f $(docker images -f "dangling=true" -q)