
# Serving data

Please read [ARGOS foundations](foundations/index.md) first to make yourself familiar with ARGOS' philosophy.

Setting up a basic ARGOS configuration to serve your data to the community involves the following simple steps:
 1. Prepare your own data for deployment
 2. Set up an ARGOS deployment
 3. Deploy your own data 

**IMPORTANT NOTE** This basic approach works well if you only want to make a limited number of _resources_ explorable (e.g. <1000).
ARGOS also supports a more sophisticated pattern in case you want to serve large amounts of _resources_, and where the end user can use powerful filter tools to identify the _resource(s)_ they want to explore in detail.
See [Serving a large number of resources](serving_data/serving_large_number_of_resources.md) for more information.

## 1. Prepare your own data for deployment

A key ingredient for a deployment are the templates to define import and dashboarding your own _resource_ _concepts_. 

The easiest way to prepare this is to
1. import a source data file in the standard ARGOS deployment,
2. create and configure a new _concept_
3. explort that concept definition as a `yaml` file via the option "Export concept definition" in the _resource_ context menu on the start page.

## 2. Set up an ARGOS deployment

Fetch the ARGOS distribution from [https://skirt-argos.ugent.be/argos.zip](https://skirt-argos.ugent.be/argos.zip), and deploy those files from a static http server.

Note that this static server will need sufficient storage capacity and bandwith to be able to serve your own data, which may be large.

Crucial is that you do **not** need any capacity to deploy an active server component (e.g. python based): ARGOS performs everything in the end user's browser. This opens the door to a lot of standardized virtualized environments for hosting that are cheap and long term stable. Almost every academic institution offers the possibility for hosted serving of html files.


## 3. Deploy your own data

In the folder where the ARGOS distribution is served, create a `data` folder with the following structure:

```
data/
   concepts/
      concept_a.yaml
      concept_b.yaml
   resources/
      resource_1.yaml
      resource_2.yaml
      resource_3.yaml
   source_files/
      source_file_1.yaml
      source_file_2.yaml
      source_file_3.yaml
   images/
      thumbnail_1.jpg
      thumbnail_2.jpg
      thumbnail_3.jpg
   index.yaml
```

### Concept `yaml` file(s)

The file(s) in the `data/concepts/` folder correspond to those concept definitions that you exported in step 1.

### Resource `yaml` file(s)

For each _resource_that you want to serve, a corresponding `yaml` file should be present in the `data/resources/` folder, with the following content:

```
id: [Resource_identifier]
name: [Resource display name]]
description: [Resource description]
conceptId: [Identifier of the concept this resource belongs to]
dataFile: [Corresponding data source file in the data/source_files/ folder]
dataSourceType: [Data source format; currently HDF5 or TSV]
thumbnail: [Optional: name of the image in the data/images/ folder to be used as thumbnail]
```


### Data source files

For each _resource_ being served, the corresponding data source file should be in the `data/source_files` folder.

### The index `yaml` file

`index.yaml` should contain an overview of all _concepts_ and _resources_ being served, and had the following structure:

```
resources:
  - uri: resource_1
    version: 1
  - uri: resource_2
    version: 1
  - uri: resource_3
    version: 1
concepts:
  - id: concept_a
    version: 1
  - id: concept_b
    version: 1
```

The `version` tag can be used in case a resource or concept has been changed, so that it needs to be updated at the client's computer. Increasing the `version` tag will cause that update next time a user visits the ARGOS deployment.