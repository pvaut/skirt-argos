
# ARGOS foundations

## Terminology

### _Resource_

Each dataset that can be visually explored in an ARGOS _dashboard_ is called a _resource_, and consists of one or more _data tables_ and _attributes_. For example, a _resource_ can be the result of a simulated galaxy, with _data tables_ describing the gas, stellar and dark matter phases.

### _Data Table_

A set of _entities_ that is stored in a tabular format as part of a _resource_, having one or more _properties_. For example, all gas particles in a simulation.

### _Entity_

An individual row in a _data table_. For example, an individual simulation particle.

### _Property_

Each _data table_ consists of one or more _properties_ (columns of that table).

### _Attribute_

A piece of information (numerical value, vector, text string...) that is part of a _resource_ but does not belong to a _data table_. Examples: simulation name, simulation global properties...

### _Concept_

A _concept_ defines a class of _resources_ of the same nature (e.g. different galaxies that were produced by the same simulation). _Resources_ that belong to the same _concept_ should have the same structure: the same _data tables_ and columns in those tables. All configuration that is done in ARGOS (e.g. defining how a dashboard looks like) is done at the level of _concepts_.

### _Dashboard_

A view in ARGOS, showing the data for a single _resource_, consisting in a number of _charts_.


## Data Flow
Schematic overview of the data flow in ARGOS:

![](docs/foundations/argos_data_flow_overview.png)

This data flow consists in two steps: **importing** and **dashboarding**. Both steps are defined via templates that apply to all _resources_ belonging to the same _concept_.

## Import

This part defines how the source data is processed upon ingestion in ARGOS, and becomes a _resource_. The following elements are defined:

* What _data table(s)_ to import from the source data. For example, for HDF5, this defines what groups are used as tables.
* What table columns to to import as _properties_ for each _data table_.
* For each _property_, add user-friendly metadata (display name, description).
* Optionally define a transformation for each _property_. This can e.g. be used to transform from one unit system to another.

## Dashboarding

This part defines how the _resource_ data is displayed and made explorable in an ARGOS _dashboard_. This definition contains the following elements:

* Computation of _derived properties_. These are defined as expressions over the existing _properties_. For example: compute the log value of a _property_, subtract the average, ...
* Definition of the different _charts_ in the _dashboard_, and the layout.
* Script automations. Automations can be used to add buttons to the _dashboard_ that perform custom actions (e.g. computations).
  They can also provide additional functionality at the level of an individual _entity_ (e.g. open an external website when
  clicking on a single galaxy data point).

## Use cases

Broadly speaking, there are two use cases of ARGOS that follow that same data flow, but differ in setup:

### Personal usage

You want to use ARGOS to explore some data that is already present on your own computer (either data that you generated yoirself, or that you received).

![](docs/foundations/use_case_personal.png)

See [Importing your own data](importing_data/index.md)


### Community serving

You want to use ARGOS to make one or more of your data sets explorable by the scientific community, 
for example in the context of a project or consortium.

![](docs/foundations/use_case_serving.png)


See [Serving data](serving_data/index.md)



