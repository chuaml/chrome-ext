# Docker usage

Docker container may be used, configurations are for:
* for development purpose only,
* to setup a development environment in a container

commands to run:
```bash
docker compose down --remove-orphans \
    # remove any leftover stopped container
&& \
# build image and then run it, auto remove when done and on exit
docker compose run --rm --build app
# you are in container now --sh--
# enter `exit` to exit from container's sh

```