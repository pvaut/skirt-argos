# Importing data

This page explains how you can import your own data into ARGOS.
Please read [ARGOS foundations](foundations/index.md) first to make yourself familiar with ARGOS' philosophy.




**IMPORTANT NOTE:** once a data file has been imported as a new _resource_, ARGOS is storing a copy of it in its local database on your computer. Changing the source file in its original location on your disk will not change it in ARGOS. You must re-import it in that case.

**IMPORTANT NOTE:** _Resources_ are stored in an ARGOS database on your local computer, in your browser. If you go to the ARGOS website via another browser or on another computer, you will not automatically see the same set of _resources_. In this use case, think of ARGOS as a local desktop application that happens to run in the browser.

## Supported data formats

ARGOS currently support 2 data formats:
* [HDF5](https://www.hdfgroup.org/solutions/hdf5/), being the de-facto standard for storing cosmological simulation snapshot results.
* TAB-delimited text files, with the extension `.tsv`. The first line should contain the column header identifiers.

## Importing a source file

Starting the import of a new source file is as easy as dragging the file to the drop field on that start page, with the text "Drag & drop a new file here, or click to select".

This triggers a wizard that guides you in a step-by-step way through the source data import process. The left part of the wizard displays the data tree as found in the source file (for HDF5 files, this displays the hierarchical structure of the data; for TSV files, only a single table will be visible).

### Step 1: Define _resource_ info

Define the core information fields of the new _resource_. In case the data source file is compatible with an already exising _concept (i.e. the corresponding _data table(s)_ and propertiers are present), it provides the choice between
 1. Using that existing _concept_ for import
 2. Creating a new _concept_ and defining its import structure.

In case no matching _concept_ is found, omly option 2 is present.

In case option 1 is chosen, this first step of the wizard is effectively the last step as well, since all other steps deal with defining aspects of the import logic for the new _concept_.

### Step 2: Define the _data tables_

(Only in case a new _concept_ is being created)

Identify one or more datasets in the data tree to be used as _data tables_ (note: for TSV files, only a single dataset is present).

### Step 3 - N-1: Define _properties_ for each _data table_

(Only in case a new _concept_ is being created)

For each _data table_, identify the _properties_ from the data tree to be used. For each _property_, you can define
 * A user-friendly display name
 * A description
 * A transformation: amathematical expression to be applied on the data, e.g. for changing units.

### Step N: Define _attributes_

(Only in case a new _concept_ is being created)

Here you can define _attributes_ of the _resource_, as mathematical expressions that can use
 1. Each _property_ of each _data table_ defined in the imp.ort
 2. Each attribute defined in the source HDF5 file (if any).
