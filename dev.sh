docker compose -f docker-compose-dev.yaml rm --force
docker compose -f docker-compose-dev.yaml build
docker compose -f docker-compose-dev.yaml up
