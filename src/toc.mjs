

import {CanvasWMSLayer, CanvasAGSMapLayer} from './canvas_rasterlayers.mjs';
import {CanvasGraticuleLayer, CanvasGraticulePtsLayer, CanvasAGSQryLayer} from './canvas_vectorlayers.mjs';

const canvas_layer_classes = {
    "graticule": CanvasGraticuleLayer,
    "graticulept": CanvasGraticulePtsLayer,	
    "wms": CanvasWMSLayer,
	"ags_map": CanvasAGSMapLayer,
	"ags_qry": CanvasAGSQryLayer	
};

export class DynamicCanvasLayer {
    constructor (p_classkey, opts) {
       return new canvas_layer_classes[p_classkey](opts);
    }
}

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

		// mandatory configs whose absence must be provisionally accepted at this stage, and be properly handled further ahead in initialization 
		const missing_configs_to_letgo = ["layernames"]; 

		this.layers.length = 0;
		const layerscfg = cfgvar["layers"];

		for (let lyk, i=0; i < layerscfg.lorder.length; i++) {


			lyk = layerscfg.lorder[i];
			if (layerscfg.layers[lyk] !== undefined) {

					
				if (layerscfg.layers[lyk]["type"] !== undefined) {

					if (this.mode == 'canvas')	{
						currentLayer.push(new DynamicCanvasLayer(layerscfg.layers[lyk]["type"]));
						currentLayer[0].setMapctxt(this.mapctx);
					}

					if (currentLayer.length == 0) {
						console.error(`TOCManager, layer '${lyk}' type not known: '${layerscfg.layers[lyk]["type"]}'`);
						continue;
					}

					const scaneables = [currentLayer[0]];

					currentLayer[0].key = lyk;

					/* Need to previously */

					switch(this.geomtype) {
						case "poly":
						case "line":
							if (currentLayer[0].default_stroke_symbol !== undefined) {
								scaneables.push(currentLayer[0].default_stroke_symbol);
							}
							break;
					}

					try {
						for (let si=0; si < scaneables.length; si++) {

							items = Object.keys(scaneables[si]);
							for (let ii=0; ii < items.length; ii++) {

								// class fields starting with '_' are the ones being public but not related to configurable items
								if (items[ii].startsWith('_')) { 
									continue;
								}
								
								if (layerscfg.layers[lyk][items[ii]] !== undefined) {
									scaneables[si][items[ii]] = layerscfg.layers[lyk][items[ii]];
								} else {

									// item is missing if has no default value
									if (scaneables[si][items[ii]] == null) {
										currentLayer[0].missing_mandatory_configs.push(items[ii]);
									}
							
								}
							}	
							
							// missing items such as layernames must be handled in other place
							if (currentLayer[0].missing_mandatory_configs.length > 0) {
								let cnt = 0;
								for (const mc of currentLayer[0].missing_mandatory_configs) {
									if (missing_configs_to_letgo.indexOf(mc) < 0) {
										cnt++;
									}
								}
								if (cnt>0) {
									throw new Error(`TOCManager, layer '${lyk}' config is missing mandatory items: '${currentLayer[0].missing_mandatory_configs}'`);
								} else {
									console.log(`missing mand.config on layer '${lyk}'` + currentLayer[0].missing_mandatory_configs);
								}
							}
	
						}
					} catch(e) {
						console.error(e);
					}
					
					try {
						if (currentLayer[0].initLayer !== undefined) {
							currentLayer[0].initLayer(this.mapctx, i);
						}
					} catch(e) {
						console.error(e);
					}

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

		console.info(`[INFO] attemting to draw ${this.layers.length} layers at scale 1:${p_scaleval}`);
		
		let gfctx;
		const ckeys = new Set();
		const canvas_dims = [];

		this.mapctx.canvasmgr.getCanvasDims(canvas_dims);

		for (let li=0; li < this.layers.length; li++) {
			ckeys.add(this.layers[li].canvasKey);
		}

		for (const ck of ckeys) {
			/* if (ck == 'base') {
				continue;
			} */
			gfctx = this.mapctx.canvasmgr.getDrwCtx(ck, '2d');
			// console.log("clear ck:", ck);
			gfctx.clearRect(0, 0, ...canvas_dims); 
		}

		for (let li=0; li < this.layers.length; li++) {

			try {
				this.layers[li].draw2D(this.mapctx, li);
			} catch(e) {
				console.error(e);
			}
		}

	}

}