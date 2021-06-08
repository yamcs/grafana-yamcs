# Yamcs Datasource for Grafana

![Dashboard](https://raw.githubusercontent.com/yamcs/grafana-yamcs/master/src/img/dashboard.png)
![Explore](https://raw.githubusercontent.com/yamcs/grafana-yamcs/master/src/img/explore.png)

## Summary

This Grafana plugin allows to use Yamcs as a datasource.


## Installation

```bash
grafana-cli --pluginUrl https://github.com/yamcs/grafana-yamcs/releases/download/v2.1.0/yamcs-yamcs-datasource-2.1.0.zip plugins install yamcs-yamcs-datasource
systemctl restart grafana-server
```

**Note:** This plugin is not yet available from the central Grafana.com plugin directory, that is why for now the use of the `--pluginUrl` argument is required.


## Configuration

Add a datasource (search for *Yamcs*)

Enter the URL to your Yamcs Server (from the point of view of the Grafana server), and enter the name of the Yamcs instance.

Test and confirm the settings using the `Save & Test` button.


## Current Limitations

* Only BASIC auth
* Polling only


## License

[Apache License 2.0](https://github.com/yamcs/grafana-yamcs/blob/master/LICENSE) 
