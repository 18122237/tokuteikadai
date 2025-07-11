#!/usr/bin/env bash
#   Use this script to test if a given TCP host/port are available

set -e

HOST="$1"
shift
PORT="$1"
shift

while ! nc -z "$HOST" "$PORT"; do
  echo "Waiting for $HOST:$PORT..."
  sleep 1
done

exec "$@"
