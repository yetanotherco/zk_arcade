#!/bin/bash

# This script updates Grafana dashboards on a Linux system.

sudo cp -rf grafana/provisioning/* /etc/grafana/provisioning/
sudo systemctl restart grafana-server
