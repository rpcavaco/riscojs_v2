

import {CanvasGraticuleLayer, CanvasGraticulePtsLayer, CanvasAGSQryLayer} from './canvas_vectorlayers.mjs';
import {RasterLayer, RemoteVectorLayer} from './layers.mjs';
import {CanvasLineSymbol, CanvasPolygonSymbol} from './canvas_symbols.mjs';
import {CanvasRiscoFeatsLayer} from './risco_ownlayers.mjs';
import {CanvasWMSLayer, CanvasAGSMapLayer} from  './canvas_raster.mjs';

const canvas_layer_classes = {
	"canvas": {
		"graticule": CanvasGraticuleLayer,
		"graticulept": CanvasGraticulePtsLayer,	
		"wms": CanvasWMSLayer,
		"ags_map": CanvasAGSMapLayer,
		"ags_qry": CanvasAGSQryLayer,
		"riscofeats": CanvasRiscoFeatsLayer
	}
};

export class DynamicCanvasLayer {
	// p_mode: only 'canvas' for now
    constructor (p_mode, p_classkey, opts) {
		try {
			return new canvas_layer_classes[p_mode][p_classkey](opts);
		} catch (e) {
			console.log("class key:", p_classkey);
			console.error(e);
		}
    }
}

export class TOCManager {
	
	constructor(p_mapctx, p_mode) {
		this.layers = [];
		this.mode = p_mode;  // 'canvas', para já
		this.mapctx = p_mapctx;
		this.initLayersFromConfig();
		this.drawlist = [];
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
						currentLayer.push(new DynamicCanvasLayer('canvas', layerscfg.layers[lyk]["type"]));
						currentLayer[0].setMapctxt(this.mapctx);
					}

					// connects feature collection to this layer, if applicable
					// (if it implements featureLayersMixin)
					if (currentLayer[0].setCurrFeatures !== undefined) {
						currentLayer[0].setCurrFeatures(this.mapctx.currFeatures, lyk);
					}

					if (currentLayer.length == 0) {
						console.error(`TOCManager, layer '${lyk}' type not known: '${layerscfg.layers[lyk]["type"]}'`);
						continue;
					}

					// 'geomtype',  'fields', 'oidfldname' processed separatedly, they are special properties
					
					if (currentLayer[0]._geomtype != null) {
						currentLayer[0].geomtype = currentLayer[0]._geomtype;
						if (layerscfg.layers[lyk]["geomtype"] !== undefined) {
							console.error(`[WARN] layer '${lyk}' 'geomtype' property is not configurable in that layer type`);
						}
					} else {
						if (layerscfg.layers[lyk]["geomtype"] !== undefined) {
							currentLayer[0].geomtype = layerscfg.layers[lyk]["geomtype"];
						}
					}

					if (layerscfg.layers[lyk]["fields"] !== undefined) {
						currentLayer[0].fields = layerscfg.layers[lyk]["fields"];
					}

					if (currentLayer[0].oidfldname == null && layerscfg.layers[lyk]["oidfldname"] !== undefined) {
						currentLayer[0].oidfldname = layerscfg.layers[lyk]["oidfldname"];
					}

					// if exists oidfldname, addit  to 'fields' string, in case the user hasn't already done it
					if (currentLayer[0].oidfldname != null) {
						if (currentLayer[0].fields == null || currentLayer[0].fields.length == 0) {
							currentLayer[0].fields = currentLayer[0].oidfldname;
						} else {
							if (currentLayer[0].fields.indexOf(currentLayer[0].oidfldname) < 0) {
								currentLayer[0].fields = currentLayer[0].oidfldname + "," + currentLayer[0].fields;
							}
						}
					}					
					const scaneables = [currentLayer[0]];
					currentLayer[0].key = lyk;

					// console.log("## geomtype -- >", lyk, layerscfg.layers[lyk]["geomtype"], currentLayer[0].geomtype);

					switch(currentLayer[0].geomtype) {

						case "poly":

							if (currentLayer[0].default_canvas_symbol == null) {
								currentLayer[0].default_canvas_symbol = new CanvasPolygonSymbol();
							}
							break;

						case "line":
							if (currentLayer[0].default_canvas_symbol == null) {
								currentLayer[0].default_canvas_symbol = new CanvasLineSymbol();
							}
							break;
					}

					if (currentLayer[0].default_canvas_symbol !== undefined) {
						scaneables.push(currentLayer[0].default_canvas_symbol);
					}

					// console.log(currentLayer[0].default_stroke_symbol);
					// console.log(scaneables);

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

	refresh(p_scaleval) {

		console.info(`[INFO] attemting to refresh ${this.layers.length} layers at scale 1:${p_scaleval}`);
		
		let gfctx;
		const ckeys = new Set();
		const canvas_dims = [];

		this.mapctx.canvasmgr.getCanvasDims(canvas_dims);

		for (let li=0; li < this.layers.length; li++) {
			console.log("initMixin:", this.layers[li].initMixin);
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

		this.drawlist.length = 0;

		// Find single raster, send it to bottom of list
		//  and discard others
		let the_raster_layer_i = -1;
		for (let li=0; li < this.layers.length; li++) {
			if (this.layers[li] instanceof RasterLayer) {
				if (the_raster_layer_i >= 0) {
					console.error(`[WARN] Only one raster layer is allowed, ignoring '${this.layers[li].key}'`);
				} else {
					the_raster_layer_i = li;
				}
			}
		}

		// Drawing first the single raster, draw in self canvas, can render at anytime
		if (the_raster_layer_i >= 0) {
			this.layers[the_raster_layer_i].refresh(this.mapctx, the_raster_layer_i);
		}

		for (let li=0; li < this.layers.length; li++) {
			if (!(this.layers[li] instanceof RasterLayer)) {
				this.drawlist.push(li);
			}
		}	

		this.nextdraw();
	}

	// getStats and draw2D will launch processes that terminate by calling signalVectorLoadFinished
	nextdraw() {
		const bounds = [];

		if (this.drawlist.length < 1) {
			return;
		}

		const li = this.drawlist[0];
		try {

			if (this.layers[li] instanceof RemoteVectorLayer) {
				if (this.layers[li].preRefresh(this.mapctx)) {
					this.mapctx.getMapBounds(bounds);			
					this.layers[li].getStats(this.mapctx, bounds, li);
				}
			} else {
				this.layers[li].refresh(this.mapctx, li);
			}

		} catch(e) {
			console.error(e);
		}
	}

	signalVectorLoadFinished(p_finished_key) {
		const li = 0;

		if (this.drawlist.length == 0) {
			return;
		}

		try {
			if (this.layers[this.drawlist[li]].key != p_finished_key) {
				throw new Error(`Layer just finished '${p_finished_key}' is not in drawing list drawing position (zero), occupied by '${this.layers[this.drawlist[li]].key}'`)
			}
		} catch(e) {
			console.log("li:", li, ", this.drawlist[li]:", this.drawlist[li], ", this.drawlist.len:", this.drawlist.length);
			throw e;
		}

		this.drawlist.shift();
		this.nextdraw();
	}
}