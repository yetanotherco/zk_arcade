#!/bin/bash

# This script installs Grafana on a Linux system.

cp infra/.env.grafana ~/config/

sudo apt-get install -y apt-transport-https software-properties-common wget
sudo mkdir -p /etc/apt/keyrings/
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | sudo tee -a /etc/apt/sources.list.d/grafana.list
# Updates the list of available packages
sudo apt-get update
# Installs the latest OSS release:
sudo apt-get install grafana

sudo cp -rf grafana/provisioning/* /etc/grafana/provisioning/

sudo bash -c "cat infra/.env.grafana >> /etc/default/grafana-server"

sudo systemctl restart grafana-server
