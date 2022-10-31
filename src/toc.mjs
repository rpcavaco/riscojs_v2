
import {GlobalConst} from './constants.js';
import {RasterLayer, RemoteVectorLayer} from './layers.mjs';
import {layerClassAdapter, symbClassAdapter} from './layers_and_symbols_adapter.mjs'

class DynamicLayer {
	// p_mode: only 'canvas' for now
    constructor (p_mode, p_classkey, opts) {
		try {
			return new layerClassAdapter[p_mode][p_classkey](opts);
		} catch (e) {
			console.log("class key:", p_classkey);
			console.error(e);
		}
    }
}

class DynamicSymbol {
	// p_mode: only 'canvas' for now
    constructor (p_mode, p_classkey, opts) {
		try {
			return new symbClassAdapter[p_mode][p_classkey](opts);
		} catch (e) {
			console.log(p_mode, "class key:", p_classkey);
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

		const selectable_feat_layer_types = [
			"ptgrid",	
			"areagrid",			
			"ags_qry",
			"riscofeats"
		];

		let currentLayer = [], addedtospidx = [];
		let items;

		const cfgvar = this.mapctx.cfgvar;
		const layerscfg = cfgvar["layers"];
		
		if (layerscfg["relations"] === undefined) {
			layerscfg["relations"] = [];
		}
		let relcfgvar = layerscfg["relations"];

		// mandatory configs whose absence must be provisionally accepted at this stage, and be properly handled further ahead in initialization 
		const missing_configs_to_letgo = ["layernames"]; 

		this.layers.length = 0;

		for (let lyentry, lyk, i=0; i <= layerscfg.lorder.length; i++) {

			if (i == layerscfg.lorder.length) {
				
				// loading spatial grid layer as overlay over all others
				lyk = "SPATIALIDX_GRID";
				lyentry = GlobalConst.SPATIALIDX_GRID;

			} else {

				lyk = layerscfg.lorder[i];
				lyentry = layerscfg.layers[lyk];

				if (!lyentry["notmouseselectable"]) {

					if (selectable_feat_layer_types.indexOf(lyentry["type"]) >= 0) {
						relcfgvar.push({
							"from": "SPATIALIDX_GRID",
							"to": lyk,
							"op": "bbtouch"
						});
						addedtospidx.push(lyk);
					}

				}
			}

			if (lyentry !== undefined) {
					
				if (lyentry["type"] !== undefined) {

					try {

						currentLayer.push(new DynamicLayer(this.mode, lyentry["type"]));

						// connects feature collection to this layer, if applicable
						// (if it implements featureLayersMixin)
						if (currentLayer[0].setCurrFeatures !== undefined) {
							currentLayer[0].setCurrFeatures(this.mapctx.currFeatures, lyk, currentLayer[0]);
						}

						if (currentLayer.length == 0) {
							console.error(`TOCManager, layer '${lyk}' type not known: '${lyentry["type"]}'`);
							continue;
						}

						// 'geomtype',  'fields', 'oidfldname', 'marker' processed separatedly, they are special properties
						
						if (currentLayer[0]._geomtype != null) {
							currentLayer[0].geomtype = currentLayer[0]._geomtype;
							if (lyentry["geomtype"] !== undefined) {
								console.error(`[WARN] layer '${lyk}' 'geomtype' property is not configurable in that layer type`);
							}
						} else {
							if (lyentry["geomtype"] !== undefined) {
								currentLayer[0].geomtype = lyentry["geomtype"];
							}
						}

						if (lyentry["fields"] !== undefined) {
							currentLayer[0].fields = lyentry["fields"];
						}
						if (lyentry["marker"] !== undefined) {
							currentLayer[0].marker = lyentry["marker"];
						}

						if (currentLayer[0].oidfldname == null && lyentry["oidfldname"] !== undefined) {
							currentLayer[0].oidfldname = lyentry["oidfldname"];
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

						if (!(currentLayer[0] instanceof RasterLayer)) {
							if (currentLayer[0].geomtype === undefined) { 
								throw new Error(`Layer ${lyk} has no 'geomtype' defined`);
							} else {
								if (currentLayer[0].marker !== undefined && currentLayer[0].marker != "none") { 
									currentLayer[0].default_symbol = new DynamicSymbol(this.mode, currentLayer[0].marker);
								} else {
									currentLayer[0].default_symbol = new DynamicSymbol(this.mode, currentLayer[0].geomtype);
								}
								scaneables.push(currentLayer[0].default_symbol);		
							}
						}

					// console.log(currentLayer[0].default_symbol);
					// console.log(scaneables);

						for (let si=0; si < scaneables.length; si++) {

							items = Object.keys(scaneables[si]);
							for (let ii=0; ii < items.length; ii++) {

								// class fields starting with '_' are the ones being public but not related to configurable items
								if (items[ii].startsWith('_')) { 
									continue;
								}

								if (lyentry[items[ii]] !== undefined) {
									scaneables[si][items[ii]] = lyentry[items[ii]];
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

							// console.log(currentLayer[0].default_symbol);
	
						}
					} catch(e) {
						console.error(e);
						continue;
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

		if (addedtospidx.length > 0) {
			console.info(`[init RISCO] TOCManager, added these to spatial index (mouse selection): ${addedtospidx}`);
		}

		console.info("[init RISCO] TOCManager, layers init finished");
	}

	refresh(p_scaleval) {

		console.info(`[INFO] attempting to refresh ${this.layers.length} layers at scale 1:${p_scaleval}`);
		
		let gfctx;
		
		const ckeys = new Set();
		for (let li=0; li < this.layers.length; li++) {
			ckeys.add(this.layers[li].canvasKey);
		}
		ckeys.add('transient');
		ckeys.add('temporary');

		this.mapctx.renderingsmgr.clearAll(ckeys);

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
		let canceled;
		if (the_raster_layer_i >= 0) {
			canceled = this.layers[the_raster_layer_i].refresh(this.mapctx, the_raster_layer_i);
		}

		if (canceled) {
			console.error(`[WARN] Drawing canceled after raster base`);
			return;
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

		let canceled;
		const bounds = [];

		if (this.drawlist.length < 1) {

			// apply configured relations between feature layers
			this.mapctx.currFeatures.relateall();
			return;

		}

		const li = this.drawlist[0];
		try {

			if (this.layers[li] instanceof RemoteVectorLayer) {
				if (this.layers[li].preRefresh(this.mapctx)) {
					this.mapctx.getMapBounds(bounds);			
					this.layers[li].getStats(this.mapctx, bounds);
				}
			} else {
				canceled = this.layers[li].refresh(this.mapctx);
				if (canceled) {
					this.drawlist.length = 0;
				}
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