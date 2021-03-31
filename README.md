# Yamcs Datasource for Grafana

![Dashboard](https://raw.githubusercontent.com/yamcs/grafana-yamcs/master/src/img/dashboard.png)
![Explore](https://raw.githubusercontent.com/yamcs/grafana-yamcs/master/src/img/explore.png)

## Summary

[Yamcs](https://yamcs.org/) is a Mission Control System framework developed by [Space Applications Services](https://www.spaceapplications.com/).

[Grafana](https://grafana.com/) is a data visualization and analytics tool supporting a large range of existing datasources as well as custom ones through the use of plugins.

This Grafana plugin allows the use of Yamcs as a Datasource.


## Requirements

### Yamcs
Yamcs source code and installation instructions can be found on GitHub [here](https://github.com/yamcs/yamcs).


### Grafana

Follow [these](https://grafana.com/docs/grafana/latest/getting-started/getting-started/) instructions to install and setup Grafana.


## Installation

### Install a prebuilt version using the Grafana CLI 
```bash
grafana-cli --pluginUrl https://github.com/yamcs/grafana-yamcs/releases/download/v2.0.0/yamcs-yamcs-datasource-2.0.0.zip plugins install yamcs-yamcs-datasource
systemctl restart grafana-server
```

**Note:** This plugin is not yet available from the central Grafana.com plugin directory, that is why for now the use of the `--pluginUrl` argument is required.


### Install the most recent snapshot

Clone this repository
```bash
cd /path/to/grafana/plugin/directory
git clone https://github.com/yamcs/grafana-yamcs.git
cd grafana-yamcs
yarn install
yarn build
```

After each modification of the plugin run :
```bash
yarn build
systemctl restart grafana-server
```


## Configuration

Add a datasource (search for *Yamcs*)

Enter the URL to your Yamcs Server (from the point of view of the Grafana server)
Test and confirm the settings using the `Save & Test` button.


## Current Limitations

* No authentication support
* No realtime data (only polling)


## License

[Apache License 2.0](https://github.com/yamcs/grafana-yamcs/blob/master/LICENSE) 
