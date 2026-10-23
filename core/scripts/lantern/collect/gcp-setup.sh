#!/bin/bash

set -euxo pipefail

# Chrome apt-key
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee -a /etc/apt/sources.list.d/google.list
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -

# Node apt-key
curl -sL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Install dependencies
sudo apt-get update
sudo apt-get install -y xvfb nodejs google-chrome-canary git zip
sudo npm install -g yarn

# Add a lighthouse user
sudo useradd -m -s $(which bash) -G sudo lighthouse || echo "Lighthouse user already exists!"
sudo chmod 755 /home/lighthouse
sudo mv /tmp/gcp-run.sh /home/lighthouse/gcp-run.sh
sudo chown lighthouse.lighthouse /home/lighthouse/gcp-run.sh
sudo chmod +x /home/lighthouse/gcp-run.sh
