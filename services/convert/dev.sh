docker build -t converter .
docker run --rm -p 8000:8000 --name converter converter
