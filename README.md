# RISCO js V2

ES6 Webmap client library

## Currently supported datasources

- RISCO server [rpcavaco/riscosrv_v2](https://github.com/rpcavaco/riscosrv_v2) custom GeoJSON-like content
- OGC WMS and WFS

## Installation

First, you must be aware that RiscoJS instances can be used in multiplicity in a web page, you can have more than one map panel.

1. Expand **riscojs_v2.zip** file into 'js' folder (or at the root of site, don't forget to remove 'js/' in src attribute of script tag -- see next item).

2. Create a JavaScript source file (example 'risco_config.js'), placing it where you find preferable, containing a global variable named e.g.*RISCOJS_CFG* containing a JSON dictionary ('{}') to host a RiscoJS instance; 
3. insert in HTML source a *script* tag for this file, inside *header* element or at *body* element's final:

	<script src="risco_config.js"></script>

4. Insert RiscoJS entry point *script* tag, after it (dont forget mandatory *type='module'* attribute):

	<script src="risco_config.js"></script>
	<script src="js/riscojs_v2/main.js" type="module"></script>

5. Insert a named DIV in HTML file

	<div id="RiscoPanelDiv">
	</div>

6. Create a initialization script, like this, relating the config variable defined in 2 and the name of DIV just created:

	<script>
		var RiscoInst = new RiscoJS(RISCOJS_CFG, "RiscoPanelDiv");
	</script>

## Configuring

Configuring has three parts: **basic** configuration, **layers** configuration and **text** messages configuration. 

- basic config: risco_basic_config.js
- layers config: risco_layers_config.js
- text config: risco_text_config.js

You can find generic examples of these files in this [folder](rpcavaco/riscojs_v2/testbed).

To see a working example, you should check the web app (TBD).

The expected location of these files is (TBD).


### Basic config

The file name for basic config is *risco_basic_config.js*.

The expected location of thisfiles is webapp is (TBD).

#### Syntax items

- mapname: name of 'map', must coincide with same 'mapname' in risco_map table



