#!/bin/bash

# This script installs Prometheus on a Linux system.
wget -P ~/ https://github.com/prometheus/prometheus/releases/download/v3.6.0/prometheus-3.6.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
mkdir -p ~/config
mkdir -p ~/.config/systemd/user/
cp infra/prometheus.yaml ~/config/prometheus.yaml
cp infra/prometheus.service ~/.config/systemd/user/prometheus.service
systemctl enable --user --now prometheus.service
