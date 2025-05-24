#!/bin/bash

source ~/.aliases

docker compose down --volumes --remove-orphans

docker compose up --build -d