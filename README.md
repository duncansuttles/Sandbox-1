Changes to the Git Repo
=======================

We've updated this repo! It is no longer a fork of VWF, but its own project. If you had a fork of this project, please rebase your work off this repository. Please note that in the past, this repo was named vwf.git, but more than a year ago was renamed to Sandbox.git. GitHub kept a 301 redirect in place to map vwf.git to Sandbox.git, but now that we have a new fork of vwf, that redirect might cause some drama. Please be sure to directly fork from Sandbox.git. 

Sorry for the confusion. We need a new fork of VWF in order to better manage our integration efforts, and we cannot have two individual forks under the same account. As a full merge of Sandbox into VWF is probably not possible, it made sense to us to break the relationship and start again.

ADL Sandbox
===========

The ADL sandbox is an application based on the [Virtual World Framework](https://github.com/virtual-world-framework/vwf)
with multiplayer simulation and content authoring capabilities. The whole application runs in native Javascript,
so no plugins or installs are required.

Features
--------

* Multiplayer simulation space
* No-install client
* Fully scriptable behaviors on in-world objects
* Manipulation and deformation tools similar to Second Life
* Integration with the 3D Repository for asset streaming
* Native in-browser audio/video chat (for capable browsers)

Requirements (Server)
---------------------

* Node.js v0.8 or newer
* Minimal CPU and memory resources

Requirements (Client)
---------------------

The simulation runs in the native browser, so in order for the app to run correctly your browser
must have support for the following technologies:

* WebGL
* ECMAScript5
* WebSockets
* WebRTC (for audio/video calls)

Sandbox has been tested and verified to run on the latest stable Chrome and Firefox, though Firefox
stable does not support video calls (Firefox beta/nightly does). The Sandbox does not run in Internet
Explorer 10 or less due to the lack of WebGL support, though some degree of support will be included
in Internet Explorer 11 (not tested as of this writing).

In addition, the system must meet the minimum hardware requirements:

* Dual-core processor
* 2GB RAM

More complex scenes will be more demanding on clients, so these specs may not be sufficient for
some simulations. Your mileage may vary.

Installation (Server)
---------------------

1. Clone this repository from Github (https://github.com/adlnet/Sandbox)

2. Install Node.js (if not already installed)

	Note: A Node.js v0.8.3 Windows binary is included with the repository, and it is verified to work.
	Feel free to use this binary instead of installing all of Node.js.

3. Run "npm install" in the project directory

4. (Optional) Download the assets packet found at http://3dr.adlnet.gov/dev/VWFSupportFiles.zip,
	and extract it to \<datadir\>/, making sure paths are preserved.
5. Run the server: > node app.js


