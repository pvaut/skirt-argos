

# Introduction


## What is ARGOS?

ARGOS is a platform form interactive visual exploration of (simulated) galaxy data, with a strong focus on User Experience.

It was born from the thought that **seeing is understanding**: the ability to visualy explore large and complex data sets in a truly interactive way can help gain a deeper understanding. It is also rooted in the thought that **data exploration should be engaging and fun**, inviting the user to explore further and deeper. Considerable attention has been spent to a polished, attractive UI, and a very snappy performance.

The premier use case ARGOS was designed for is the **interactive visual exploration** of **particle set** snapshots from **cosmological simulations**.
However, because of its flexible and extendible architecture, it can be adapted to a wide variety of other use cases too, even outside astronomy.

### Strengths

* **Very user-friendly**
  - Web application that needs no local installation.
  - Strong, engaging User Experience.
  - No empty page syndrome: predefined templates (e.g. for dashboards) make it easy to start exploring.
* **Powerful**
  - Thanks to GPU rendering, ARGOS can visualise millions of data points in real time.
  - Advanced visual analytics features enable the user to interactively explore the data,
    identify and drill down on interesting subpopulations and discover trends.
  - Data fetching happens only once. After that, data sets remain available for exploration instantaneously.
* **Flexible & extendible**
  - A template system to easily adapt ARGOS to new types of data and use cases.
  - A built-in scripting system facilitates automation.
  - Can be used to host and make available your own data in a very cheap way (only static file serving).
* **Easy & cheap to set up for serving and maintain**
  - There is no server application component of ARGOS, just static files being served by a standard web server.
    All computations happen on the end user's computer, leveraging their own CPU and GPU. 
  - Nothing needs to be compiled, and no libraries need to be insalled. Just copy the ARGOS distribution to a static web server folder.
  - No need to perform patches over time on a server to address vulnerabilities.
  - Making your data available to the community is as easy as dropping the files into a folder on the static web server.


### Limitations

* Currently only handles table data, with numerical, categorical and text columns.
* Currently only imports HDF5 or CSV / TSV files.
* Limited to data sets that can downloaded to the end user's computer and handled in browser memory. For most browsers, this means around 2Gb.
* Not intended for the creation of complex, publication-ready visualizations.
  * No overlays of multiple visualizations.
  * No fancy axis labels.
  * Currently limited set of chart types.


## Further reading

[ARGOS foundations](foundations/index.md)

[Exploring the sample data sets](sample_data.md)

[Using ARGOS](using_argos/index.md)

[Importing your own data](importing_data/index.md)

[Making your data explorable by the community](serving_data/index.md)

