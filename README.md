# Yamcs Datasource for Grafana

![dashboardExample](https://raw.githubusercontent.com/yamcs/grafana-yamcs/master/src/img/dashboardExample.png)
![queryExample](https://raw.githubusercontent.com/yamcs/grafana-yamcs/master/src/img/queryExample.png)

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
grafana-cli --pluginUrl https://github.com/yamcs/grafana-yamcs/archive/v1.0.0.zip plugins install yamcs-datasource
systemctl restart grafana-server
```

**Note:** This plugin is not yet available from the central Grafana.com plugin directory, that is why for now the use of the `--pluginUrl` argument is required.


### Install a development snapshot

Clone this repository
```bash
cd path/to/grafana/plugin/directory
git clone https://github.com/yamcs/grafana-yamcs.git
cd grafana-yamcs
yarn install
yarn dev
```

After each modification of the plugin run :
```bash
yarn dev
systemctl restart grafana-server
```


## Usage
Run the yamcs simulator in one terminal :
```bash
cd path/to/yamcs
./run-example.sh simulation
```

On ```localhost:3000``` you should find the Grafana homepage.

Add a datasource : on ```localhost:3000/datasources ``` -> add a datasource -> search for *yamcs-datasource*.

You should now be able to configure this datasource and select it when editing a dashboard panel.


## Configuration

### Instructions

Enter the name of your Yamcs Server in the *Host name* field.

Enter the name of your Yamcs instance in the *Instance* field.

(Optional) Enter your Yamcs username and password.

You can have multiple instances of this plugin with different configurations.

You can test your configuration using the ```Save & Test``` button.


### Example

For monitoring the Yamcs *simulation* example : ```./run-example simulation ``` 
with the Yamcs server running on the same host as Grafana.

![configExample](https://raw.githubusercontent.com/yamcs/grafana-yamcs/master/src/img/configExample.png)


### License

[Apache License 2.0](https://github.com/yamcs/grafana-yamcs/blob/master/LICENSE) 
