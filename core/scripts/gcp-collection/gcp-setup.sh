#!/bin/bash

set -euxo pipefail

##
# @license
# Copyright 2020 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

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
sudo apt-get install -y xvfb nodejs google-chrome-stable google-cloud-sdk git zip golang-go
sudo npm install -g yarn

# Add a lighthouse user
sudo useradd -m -s $(which bash) -G sudo lighthouse || echo "Lighthouse user already exists!"
sudo mv /tmp/lhenv /home/lighthouse/.env
sudo mv /tmp/urls.txt /home/lighthouse/urls.txt
sudo mv /tmp/run.sh /home/lighthouse/run.sh
sudo mv /tmp/run-on-url.sh /home/lighthouse/run-on-url.sh
sudo chown lighthouse.lighthouse /home/lighthouse/.env /home/lighthouse/*
sudo chmod +x /home/lighthouse/run.sh
sudo chmod +x /home/lighthouse/run-on-url.sh
