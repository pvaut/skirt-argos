# Serving a large number of resources

In some cases you may want to serve a large number of resources, and offer the end user the possibility to **explore the full set of _resources_** first, in order to identify those resource(s) that they want to exolore individually in detail.

Imagine that you have run a large-scale cosmological simulation, resulting in many thousands or even millions of galaxy snapshots.

ARGOS can deal with this use case in a simple, elegant and powerful manner:

 1. Create a single _resource_ (the "catalog") that contains an overview of all the _resources_ you want to serve.
  For example, you can think of this as the catalog of all your simulated galaxies.
 1. Make sure this catalog _resource_ has a dashboard that makes it convenient for the user to explore and filter the catalog members in a meaningful way.
 1. At the level of an individual _entity_ in this catalog _resource_, create a **script automation** that injects a button that
    * automatically fetches the associated source data
    * creates a new _resource_ for the downloaded data
    * opens this new _resource_ in a new _dashboard_.
 1. Make sure your ARGOS deployment also serves the _concept_ definition of the individual member _resources_.