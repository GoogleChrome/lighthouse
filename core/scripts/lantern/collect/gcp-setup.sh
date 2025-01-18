#!/bin/bash

set -euxo pipefail

# GCloud apt-key
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -

# Chrome apt-key
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee -a /etc/apt/sources.list.d/google.list
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -

# Node apt-key
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install dependencies
sudo apt-get update
sudo apt-get install -y xvfb nodejs google-chrome-stable google-cloud-sdk git zip
sudo npm install -g yarn

# Add a lighthouse user
sudo useradd -m -s $(which bash) -G sudo lighthouse || echo "Lighthouse user already exists!"
sudo mv /tmp/wpt-key /home/lighthouse/.env
sudo mv /tmp/gcp-run.sh /home/lighthouse/gcp-run.sh
sudo chown lighthouse.lighthouse /home/lighthouse/.env /home/lighthouse/gcp-run.sh
sudo chmod +x /home/lighthouse/gcp-run.sh
