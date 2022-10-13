
import {DynamicCanvasLayer} from './canvas_layers.mjs';


export class TOCManager {
	
	constructor(p_mapctx, p_mode) {
		this.layers = [];
		this.mode = p_mode;  // 'canvas', para já
		this.mapctx = p_mapctx;
		this.initLayersFromConfig();
	}
	static readLayerConfigItem(p_lyrob, p_configvar, p_layerkey, p_itemname) {
		if (p_configvar.lorder[p_layerkey][p_itemname] !== undefined) {	
			p_lyrob[p_itemname]	= p_configvar.lorder[p_layerkey][p_itemname];
		}
	}

	initLayersFromConfig() {

		let currentLayer = [];
		let items;

		const cfgvar = this.mapctx.cfgvar;

		this.layers.length = 0;
		const layerscfg = cfgvar["layers"];

		for (let lyk, i=0; i < layerscfg.lorder.length; i++) {


			lyk = layerscfg.lorder[i];
			if (layerscfg.layers[lyk] !== undefined) {

					
				if (layerscfg.layers[lyk]["type"] !== undefined) {

					switch (layerscfg.layers[lyk]["type"]) {
					
						case "wms":
						case "graticule":

							if (this.mode == 'canvas')	{
								currentLayer.push(new DynamicCanvasLayer(layerscfg.layers[lyk]["type"]));
							}
							break;

								
					}

					if (currentLayer.length == 0) {
						throw new Error(`TOCManager, layer '${lyk}' type not known: '${layerscfg.layers[lyk]["type"]}'`);
					}

					const scaneables = [currentLayer[0]];
					
					if (currentLayer[0].default_stroke_symbol !== undefined) {
						scaneables.push(currentLayer[0].default_stroke_symbol);
					}

					try {
						for (let si=0; si < scaneables.length; si++) {

							items = Object.keys(scaneables[si]);
							for (let ii=0; ii < items.length; ii++) {
								
								if (layerscfg.layers[lyk][items[ii]] !== undefined) {
									scaneables[si][items[ii]] = layerscfg.layers[lyk][items[ii]];
								} else {
									// item has no default value

									if (scaneables[si][items[ii]] == null) {
										currentLayer[0].missing_mandatory_configs.push(items[ii]);
									}
							
								}
							}	
							
							if (currentLayer[0].missing_mandatory_configs.length > 0) {
								throw new Error(`TOCManager, layer '${lyk}' config is missing mandatory items: '${currentLayer[0].missing_mandatory_configs}'`);
							}
	
						}
					} catch(e) {
						console.error(e);
					}
					
					try {
						if (currentLayer[0].init !== undefined) {
							currentLayer[0].init(this.mapctx);
						}
					} catch(e) {
						console.error(e);
					}

					currentLayer[0].key = lyk;

					this.layers.push(currentLayer[0]);
					console.info(`[init RISCO] TOCManager, layer '${lyk}' (${currentLayer[0].constructor.name}) prepared`);

					currentLayer.length = 0;

				} else {
					console.error(`TOCManager, layer with key '${lyk}' has no type, cannot be read.`);
				}

			} else {
				console.error(`TOCManager, no layer with key '${lyk}' found in config.`);
			}
		}

		console.info("[init RISCO] TOCManager, layers init finished");
	}

	draw(p_scaleval) {
		//console.log("TOCManager draw, layers: ", this.layers.length, "scale:", p_scaleval);
		let gfctx;
		const ckeys = new Set();
		const canvas_dims = [];

		this.mapctx.canvasmgr.getCanvasDims(canvas_dims);

		for (let li=0; li < this.layers.length; li++) {
			ckeys.add(this.layers[li].canvasKey);
		}

		for (const ck of ckeys) {
			gfctx = this.mapctx.canvasmgr.getDrwCtx(ck, '2d');
			// console.log("clear ck:", ck);
			gfctx.clearRect(0, 0, ...canvas_dims); 
		}

		for (let li=0; li < this.layers.length; li++) {
			console.log(".. drawing lyr", this.layers[li].key);
			this.layers[li].draw2D(this.mapctx, p_scaleval);
		}

	}

}