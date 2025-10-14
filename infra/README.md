# INFRA SETUP

## MONITORING

### Prometheus

Install Prometheus

```
make install_prometheus
```

Update the file located at `~/config/prometheus.yaml`

```
vim ~/config/prometheus.yaml
systemctl restart prometheus --user
```

### Grafana

Install grafana

```
make install_grafana
```

You need to update variables at `/etc/default/grafana-server`

```
sudo vim /etc/default/grafana-server
sudo systemctl restart grafana-server
```
