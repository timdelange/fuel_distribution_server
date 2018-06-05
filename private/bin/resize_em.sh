#!/bin/bash
CONF_FILE="$1"
SOURCE_IMAGE="$2"
DEST_DIR="$3"
TOOL="convert"

cat $CONF_FILE | awk -F',' '{ print "'$TOOL' '$SOURCE_IMAGE' -resize "  $2  "  '$DEST_DIR'" "/" $1 ".png" }' 
