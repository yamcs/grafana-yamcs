# Contributing

The following explains how to get a development setup running.

## Incremental Builds

    yarn dev


## Runtime

Use the Docker Compose configuration to launch both Yamcs and Grafana:

    yarn server

Navigate to the Grafana UI at http://localhost:3000. Select `Configuration > Data Sources` from the sidebar.

Add a `Yamcs` datasource with:

* URL: `http://yamcs:8090`. This is the name by which the two containers can find each other.
* Instance: `simulator`.


## Testing

Instead of creating a panel, easier is to use the Explore mode.
