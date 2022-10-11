
import {DynamicCanvasLayer} from './canvas_layers.mjs';


export class TOCManager {
	
	constructor(p_mapctx, p_layers_config, p_mode) {
		this.layers = [];
		this.mode = p_mode;  // 'canvas', para já
		this.mapctx = p_mapctx;
		this.initLayersFromConfig(p_layers_config);
	}
	static readLayerConfigItem(p_lyrob, p_configvar, p_layerkey, p_itemname) {
		if (p_configvar.lorder[p_layerkey][p_itemname] !== undefined) {	
			p_lyrob[p_itemname]	= p_configvar.lorder[p_layerkey][p_itemname];
		}
	}

	initLayersFromConfig(p_configvar) {

		let currentLayer = [];
		let items;

		this.layers.length = 0;

		for (let lyk, i=0; i < p_configvar.lorder.length; i++) {


			lyk = p_configvar.lorder[i];
			if (p_configvar.layers[lyk] !== undefined) {

					
				if (p_configvar.layers[lyk]["type"] !== undefined) {

					switch (p_configvar.layers[lyk]["type"]) {
					
						case "graticule":

							if (this.mode == 'canvas')	{
								currentLayer.push(new DynamicCanvasLayer("graticule"));
							}
							break;
							
					}

					if (currentLayer.length == 0) {
						throw new Error(`TOCManager, layer '${lyk}' type not known: '${p_configvar.lorder[lyk]["type"]}'`);
					}

					const scaneables = [currentLayer[0], currentLayer[0].default_stroke_symbol];
					for (let si=0; si < scaneables.length; si++) {

						items = Object.keys(scaneables[si]);
						for (let ii=0; ii < items.length; ii++) {
							
							if (p_configvar.layers[lyk][items[ii]] !== undefined) {
								scaneables[si][items[ii]] = p_configvar.layers[lyk][items[ii]];
							} else {
								// item has no default value
								if (scaneables[si][items[ii]] == null) {
									throw new Error(`TOCManager, layer '${lyk}' config is missing mandatory item '${items[ii]}'`);
								}
							}
	
							// console.log("item:", items[ii], currentLayer[items[ii]], currentLayer[items[ii]] === undefined, currentLayer[items[ii]] == null);
						}						

					}

					this.layers.push(currentLayer[0]);
					currentLayer.length = 0;

					console.log(`TOCManager, layer '${lyk}' (${currentLayer.constructor.name}) prepared`);

				} else {
					console.warn(`TOCManager, layer with key '${lyk}' has no type, cannot be read.`);
				}

			} else {
				console.warn(`TOCManager, no layer with key '${lyk}' found in config.`);
			}
		}

		console.log("TOCManager, layers init finished");
	}

	draw(p_scaleval) {
		console.log("TOCManager draw, layers: ", this.layers.length, "scale:", p_scaleval);
		for (let li=0; li < this.layers.length; li++) {

			this.layers[li].draw2D(this.mapctx, p_scaleval);
		}
	}

}