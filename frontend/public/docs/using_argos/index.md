
# Using ARGOS

A good starting point is to familiarize yourself with the [ARGOS foundations & architecture](foundations/index.md).

## Start page

This page shows an overview of all _resources_ that are currently available for you, each one a separate tile. There are three possible ways in which a _resource_ becomes available here:

  1. It is part of the set of sample _resources_ defined by the ARGOS deployment (see [Exploring the sample data sets](sample_data.md)).
  2. You created it from a local data file on your computer.
  3. A script fetched an additional _resource_ from the ARGOS deployment.
  4. Click on the placeholder tile to start importing a local data file (see [Importing your own data](importing_data/index.md)).

What you can do:

* Clicking on a _resource_ tile opens the corresponding visual analytics dashboard.
* You can enter a search term in the search bar, to only show the _resources_ containing that term.
* Each _resource_ belongs to a _concept_. You can filter on _resources_ of a certain _concept_ by clicking on a filter tag.

## Visual analytics dashboard

This is the place where you visually explore data. The source of a dashboard is one or more tables, and for each table one or more charts can be shown on the dashboards.

### Current selection
A core feature of ARGOS is the concept of _current selection_ of records in a table. This selection is visualized on all charts, and user interactions with charts automatically alter that current _current selection_. For example, you can draw a lasso selection on a scatterplot to select all data points in that plot.

This _current selection_ is a core feature to facilitate drilling down on data, and e.g. find interesting clusters or anomalies
in large volumes of high-dimensional data.

The panel on the left displays all currently applied filter steps for all data tables in the current _resource).


### Changing chart settings
You can change the content and appearance of a chart by clicking on the menu button.

### Changing the dashboard layout
You can dynamically add new charts to the dashboard in two ways:
 1. Via the "Plus" button at the bottom of the dashboard.
 2. By switching the dashboard to edit layout mode via the pencil button in the bottom left corner. This provides more power for chosing the layout.

 You can chose to save the new dashboard layout, so that it becomes the new default for the current _resource_ en all other _resources_ belonging to the same _concept_. If you do not save the new dashboard layout, next time you reload ARGOS it will revert to the previous layout.
