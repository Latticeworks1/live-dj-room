#!/bin/bash
cd /home/latticeworks225/live-dj-room/server
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20
npm start
