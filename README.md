# Yamcs Datasource for Grafana

![](src/img/dashboardExample.png)
![](src/img/queryExample.png)

## Summary

[Yamcs](https://yamcs.org/) is an open source Mission Control System software developped by [Space Applications Services](https://www.spaceapplications.com/).

[Grafana](https://grafana.com/) is a data visualization and analytics tool supporting a large range of existing datasources as well as custom ones through the use of plugins.
<br></br>This Grafana plugin allows the use of Yamcs as a Datasource.


## Requirements

### Yamcs
Yamcs source code and installation instructions can be found on GitHub [here](https://github.com/yamcs/yamcs).


### Grafana

Follow [these](https://grafana.com/docs/grafana/latest/getting-started/getting-started/) instructions to install and setup Grafana.


## Installation

### Using the Grafana CLI 
```bash
grafana-cli plugins install yamcs-datasource
systemctl restart grafana-server
```

### For Developpers

Clone this repository
```bash
git clone https://github.com/yamcs/grafana-yamcs.git yamcs-datasource
```
Create a symbolic link to this plugin in the grafana plugin directory (located by default in ```/var/lib/grafana```).
```bash
ln -s path/to/yamcs-datasource path/to/plugin/directory/yamcs-datasource
``` 
On the first use, install dependecies
```bash
cd path/to/yamcs/datasource
yarn install
```
After each modifications of the plugin run :
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

Enter your Yamcs username and password.

You can have multiple instances of this plugin with different configurations.

You can test your configuration using the ```Save & Test``` button.

### Example

For monitoring the Yamcs *simulation* example : ```./run-example simulation ``` 
with the Yamcs server running on the same host<br></br> as Grafana. By default, the authentication module of yamcs is disabled so you do not have to worry about username and password.

![](src/img/configExample.png)


### License

[Apache License 2.0](https://github.com/yamcs/grafana-yamcs/blob/master/LICENSE) 


