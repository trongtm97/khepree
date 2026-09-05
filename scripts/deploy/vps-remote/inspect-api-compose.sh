#!/usr/bin/env bash
set -euo pipefail
docker inspect khepree-production-api-1 --format '{{index .Config.Labels "com.docker.compose.project"}}'
docker inspect khepree-production-api-1 --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}'
docker inspect khepree-production-api-1 --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}'
docker inspect khepree-production-api-1 --format '{{index .Config.Labels "com.docker.compose.service"}}'
