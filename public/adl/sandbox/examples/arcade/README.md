XAPIGame
========

# IFest XAPI integration demo game.

This game allows for user editing of an enviornment with a simple drag and drop interface. Actions taken by the player and the
author are recorded to an LRS using the XAPI. The game runs within the ADL Sandbox.

## Setup

First, you must have a copy of the ADL Sandbox installed. 

Create a file under the Sandbox data directory called `/{datadir}/DataFiles/XAPIGame/` and clone this repo into it.
Note: The files should be directly under this directory, not under any subdirectory. 

when you clone this repo, you will have a set of files including `gamegui.js` and `state`. These two files are the 
actual code of the game, all other files are game resouces like 3D models or sounds. 

The file called `state` is a copy of a Sandbox world. You'll need to import this into your Sandbox install. To do this:
 1. Create a new world, and note its UUID. Enter the world once to establish an entry on the filesystem.
 2. Browse under `/{datadir}/States/{your UUID}/` and paste the `state` file.
 3. Load the world.
 
## Notes:
 1. The behaviors of the entities are descripted in the `gamegui.js` file. They are standard VWF object definitions.
 2. In order to edit these, you may update the JSON directly. This can be very hard. You may also create one in the game
    and then edit the code with the Sandbox editor tools. You'll need to get the JSON representation of the modified object
    and paste it into the `gamegui.js` file. You can do by saving the object to your inventory, selecting it in the 
    inventory manager, and clicking `view`.
 3. The XAPI endpoints are coded into the object called 'GameCode' in the Sandbox environment. This must be edited in the 
    Sandbox editor tools. 
 4. Note that if you modify it, please copy the `state` file out of your `/{datadir}/States/{UUID}/` and check it into GIT     
 
