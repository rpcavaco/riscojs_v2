
import {GlobalConst} from './constants.js';
import {WKID_List} from './esri_wkids.js';
import {uuidv4} from './utils.mjs';

import { VectorLayer, RemoteVectorLayer } from './layers.mjs';



export class GraticuleLayer extends VectorLayer {

	fixedseparation = 100;
	_geomtype = "line";
	_name = "GraticuleLayer";

	constructor() {
		super();
		this._servmetadata_docollect = false;		
	}

	* itemchunks(p_mapctxt, p_prep_data) {
		yield [];
	}	

	refresh(p_mapctxt, p_prep_data) {

		const bounds = [];
		p_mapctxt.getMapBounds(bounds);

		let x, endlimit, crdlist = [], id=0;
		for (const mode of ['horiz', 'vert']) {

			if (mode == 'vert') {
				x = this.fixedseparation * Math.floor(bounds[0] / this.fixedseparation);
				endlimit = bounds[2];
			} else {
				x = this.fixedseparation * Math.floor(bounds[1] / this.fixedseparation);
				endlimit = bounds[3];
			}

			while (x <= endlimit) {

				x = x + this.fixedseparation;
				if (mode == 'vert') {
					crdlist = [[x, bounds[1]], [x, bounds[3]]];
				} else {
					crdlist = [[bounds[0], x], [bounds[2], x]];
				}
				
				id++;
				this._currFeatures.addfeature(this.key, crdlist, {}, this.geomtype, 1, id);

			}

		}

		p_mapctxt.tocmgr.signalVectorLoadFinished(this.key);

	}

}

export class PointGridLayer extends VectorLayer {

	fixedseparation = 100;
	scaledep_separation_1k = -1;
	_geomtype = "point";
	marker;
	// mrksize = 2;
	_name = "PointGridLayer";

	constructor() {
		super();
		this._servmetadata_docollect = false;
	}

	* itemchunks(p_mapctxt, p_prep_data) {
		yield [];
	}	

	separation(opt_scaleval) {

		let ret = this.fixedseparation;
		if (opt_scaleval != null && this.scaledep_separation_1k > 1 ) {
			ret = this.scaledep_separation_1k * (opt_scaleval / 1000.0);
		}

		return ret;
	}

	refresh(p_mapctxt, p_prep_data) {

		const bounds = [];
		p_mapctxt.getMapBounds(bounds);

		let sclval = p_mapctxt.getScale();
		let sep = this.separation(sclval);

		let x, xorig = sep * Math.floor(bounds[0] / sep);
		let x_lim = bounds[2];

		let y = sep * Math.floor(bounds[1] / sep);
		let y_lim = bounds[3];

		let id = 0;

		while (y <= y_lim) {

			y = y + sep;
			x = xorig;

			while (x <= x_lim) {

				x = x + sep;
				// using terrain coords
				id++;

				this._currFeatures.addfeature(this.key, [[x, y]], {}, this.geomtype, 1, id);


			}
		}

		p_mapctxt.tocmgr.signalVectorLoadFinished(this.key);		
	}

}

export class AreaGridLayer extends VectorLayer {

	fixedseparation = 100;
	scaledep_separation_1k = -1;
	_geomtype = "poly";
	areatype = "square";
	is_internal = true;
	hiddengraphics = false;
	_columns = 0;
	_name = "AreaGridLayer";

	// TODO - check this layera acting as spatial index is unique
	spindex = false;    // acting as a spatial index ? (defautl is false, should only be ONE acting as spatialindex at a time)
	// mrksize = 2;

	constructor() {
		super();
		this._servmetadata_docollect = false;
	}

	separation(opt_scaleval) {

		let ret = this.fixedseparation;
		if (opt_scaleval != null && this.scaledep_separation_1k > 1 ) {
			ret = this.scaledep_separation_1k * (opt_scaleval / 1000.0);
		}

		ret = Math.floor(ret/10.0) * 10;

		if (ret < 20) {
			ret = 20;
		}

		return ret;
	}

	* itemchunks(p_mapctxt, p_prep_data) {
		yield [];
	}	

	refresh(p_mapctxt, p_prep_data) {

		const bounds = [];
		p_mapctxt.getMapBounds(bounds);

		let sclval = p_mapctxt.getScale();
		let sep = this.separation(sclval);

		let preid, id, ring, x, xorig = sep * Math.floor(bounds[0] / sep);
		let x_lim = bounds[2];

		let y = sep * Math.floor(bounds[1] / sep);
		let y_lim = bounds[3];

		let cntcols=0, cntrows=0;
		this._columns = 0;

		while (y <= y_lim) {

			x = xorig;
			cntcols = 0;
			while (x <= x_lim) {

				cntcols++;

				ring = [[x, y], [x + sep, y], [x + sep, y + sep], [x, y + sep], [x, y]];
				preid = this._columns * cntrows + cntcols;
				id = this._currFeatures.addfeature(this.key, ring, { "id": preid }, this.geomtype, 1, null, "id");

				x = x + sep;

			}

			if (this._columns == 0) {
				this._columns = cntcols;				
			}

			y = y + sep;
			cntrows++;

		}

		p_mapctxt.tocmgr.signalVectorLoadFinished(this.key);		
	}

}

export class AGSQryLayer extends RemoteVectorLayer {

	url;     // https://servergeo.cm-porto.pt/arcgis/rest/services/BASE/ENQUADRAMENTO_BW_ComFregsPTM06/MapServer
	layerid; // 9
	oidfldname = "objectid"
	precision = 3;
	f = "json";
	_name = "AGSQryLayer";

	constructor() { 
		super();
	}

	buildQueryURL(p_mapctxt, p_terrain_bounds, p_mode, p_firstrecid, p_reccount) {

		const teststr = `/MapServer/${this.layerid}/query`;

		if (this.url.indexOf(teststr) < 0) {
			this.url = this.url.replace("/MapServer", teststr);
		}

		const url = new URL(this.url);		
		const sp = url.searchParams;
		const crs = p_mapctxt.cfgvar["basic"]["crs"];
		const bndstr = p_terrain_bounds.join(',');

		sp.set('geometry', bndstr);
		sp.set('geometryType', "esriGeometryEnvelope");
		sp.set('inSR', crs);
		sp.set('spatialRel', 'esriSpatialRelIntersects');
		sp.set('outFields', this.fields);

		switch(p_mode) {

			case "INITCOUNT":

				sp.set('returnGeometry', 'false');
				sp.set('returnIdsOnly', 'false');
				sp.set('returnCountOnly', 'true');
				sp.set('returnExtentOnly', 'false');
				
				break;

			case "GETCHUNK":

				sp.set('returnGeometry', 'true');
				sp.set('returnIdsOnly', 'false');
				sp.set('returnCountOnly', 'false');
				sp.set('returnExtentOnly', 'false');
				sp.set('geometryPrecision', GlobalConst.GEOMPRECISION_DECIMALS.toString());
				sp.set('outSR', crs);

				sp.set('resultOffset', p_firstrecid.toString());
				sp.set('resultRecordCount', p_reccount.toString());
				 
				break;
					
		}

		sp.set('f', 'json');

		const ret = url.toString();		
		if (GlobalConst.getDebug("AGSQRY")) {
			console.log(`[DBG:AGSQRY] -- '${p_mode}' -- buildGetMapURL: '${ret}'`);
		}	
		
		return ret; 
	}

	// Why passing Map context to this method if this layer has it as a field ?
	// The reason is: it is not still available at this stage; it will be availabe later to subsequent drawing ops
	initLayer(p_mapctx) {

		if (GlobalConst.getDebug("AGSQRY")) {
			console.log(`[DBG:AGSQRY] Layer '${this.key}' is in INIT`);
		}
		
		if (this.url == null || this.url.length < 1) {
			throw new Error("Class CanvasAGSQryLayer, null or empty p_metadata_or_root_url");
		}

		if (!this.url.endsWith('/MapServer')) {
			throw new Error("Class CanvasAGSQryLayer, 'url' config parameter must terminate with '/MapServer'");
		}		

		this._servmetadata = {};
		this._metadata_or_root_url = new URL(this.url);

		const bounds = [], dims=[];
		p_mapctx.getMapBounds(bounds);
		const cfg = p_mapctx.cfgvar["basic"]; 
		p_mapctx.getCanvasDims(dims);

		if (this._metadata_or_root_url) {
			const sp = this._metadata_or_root_url.searchParams;
			const checkitems = {
				"f": false
			}

			for (const [key, value] of sp.entries()) {
				if (key.toLowerCase() == 'f' && value.toLowerCase() == 'json') {
					checkitems["f"] = true;
				}
			}

			if (!checkitems["f"]) {
				sp.append('f', 'json');
			}
		} 
		
		const that = this;

		fetch(this._metadata_or_root_url.toString())
			.then(response => response.json())
			.then(
				function(responsejson) {

					if (GlobalConst.getDebug("AGSQRY")) {
						console.log(`[DBG:AGSQRY] Layer '${that.key}' metadata arrived, viability check starting`);
					}

					const md_attrnames = [
						"supportsDynamicLayers", 
						{"layers": {
							"type": "list",
//							"fields_to_get": ["id", "name", "defaultVisibility", "minScale", "maxScale", "type", "geometryType"]
							"fields_to_get": ["id", "name", "minScale", "maxScale"],
							"remove": [
								{"subLayerIds": ["diff", null]} // OR - one condition verified is sufficient to remove item
							]
						}},
						"spatialReference/wkid",
						{"fullExtent": {
							"type": "dict",
							"fields_to_get": ["xmin", "ymin", "xmax", "ymax", "spatialReference/wkid"]
						}},						
						"minscale",
						"mapscale",
						"units",
						"capabilities", 
						"supportedQueryFormats", 
						"supportsDatumTransformation",
						"supportsSpatialFilter",
						"maxRecordCount"
					];

					let splts;
					for (let mdentry of md_attrnames) {

						if (typeof mdentry == 'string') {
								splts = mdentry.split('/');
								if (splts.length == 1) {
									if (responsejson[splts[0]] !== undefined ) {
										that._servmetadata[splts[0]] = responsejson[splts[0]];
									}
								}
								for (let colectedobj=null, si=0; si<splts.length; si++) {
									if (si == 0) {
										if (responsejson[splts[0]] !== undefined ) {
											colectedobj = responsejson[splts[si]];
										}
									} else if (si < splts.length-1) {
										if (colectedobj) {
											colectedobj = colectedobj[splts[si]];
										}
									} else {
										if (colectedobj) {
											that._servmetadata[splts[si]] = colectedobj[splts[si]];
										}
									}

								}
						} else if (Array.isArray(mdentry)) {
							// none, for now
						} else if (mdentry.constructor == Object) {
							for (let mdentry_label in mdentry) {
								
								let remove_dobreak;
								switch(mdentry[mdentry_label]["type"]) {

									case "list":

										that._servmetadata[mdentry_label] = [];
										for (let j=0; j<responsejson[mdentry_label].length; j++) {

											remove_dobreak = false;
											if (mdentry[mdentry_label]["remove"] !== undefined) {
												for (const remitem of mdentry[mdentry_label]["remove"]) {
													for (let remkey in remitem) {

														const [rtestop, rtestvar] = remitem[remkey];
														if (rtestop == "diff") {
															if (responsejson[mdentry_label][j][remkey] != rtestvar) {
																remove_dobreak = true;
																break;
															}
														} // oter ops not implemented
													}
													if (remove_dobreak) {
														break;
													}
												}
												if (remove_dobreak) {
													break;
												}
											}

											that._servmetadata[mdentry_label].push({}); 
											for (let fld of mdentry[mdentry_label]["fields_to_get"]) {
												that._servmetadata[mdentry_label][that._servmetadata[mdentry_label].length - 1][fld] = responsejson[mdentry_label][j][fld];
											}
	
										}

										break;
									
									case "dict":
										that._servmetadata[mdentry_label] = {};
										for (let fld of mdentry[mdentry_label]["fields_to_get"]) {
											splts = fld.split('/');
											if (splts.length == 1) {
												that._servmetadata[mdentry_label][fld] = responsejson[mdentry_label][fld];
											}
											for (let colectedobj, si=0; si<splts.length; si++) {
												if (si == 0) {
													colectedobj = responsejson[splts[si]];
												} else if (si < splts.length-1) {
													colectedobj = colectedobj[splts[si]];
												} else {
													that._servmetadata[mdentry_label][splts[si]] = colectedobj[splts[si]];
												}

											}
										}
										break;
								}
							}
						}
					}
					if (that.reporting(p_mapctx, cfg["crs"], bounds, dims)) {
						that.getStats(p_mapctx, bounds);
					}			
				}
			)

	}

	reporting (p_mapctxt, p_crs, p_bounds, p_dims) {
		// service capabilities validation step
		
		this._servmetadata_report = {};
		let ret = false;

		try {

			if (WKID_List[this._servmetadata["wkid"]] === undefined) {
				throw new Error(`Uknown ${this._servmetadata["wkid"]} WKID in layer '${this._key}'`);
			}

			let crs = WKID_List[this._servmetadata["wkid"]];
			if (crs != p_crs && !this._servmetadata["supportsDatumTransformation"]) {
				this._servmetadata_report["crs"] = "notok";
			} else {
				this._servmetadata_report["crs"] = "ok";
			}

			this._servmetadata_report["querycapability"] = (this._servmetadata["capabilities"].indexOf("Query") >= 0);

			this._servmetadata_report["layers"] = {}

			let ly, mxs, mis, retstatus;
			let bb = this._servmetadata["fullExtent"];      
			if (bb["wkid"] == this._servmetadata["wkid"]) {
				this._servmetadata_report["bbox"] = (p_bounds[0] >= bb["xmin"] && p_bounds[1] >= bb["ymin"] && p_bounds[2] <= bb["xmax"] && p_bounds[3] <= bb["ymax"] ? "ok" : "notok");
			} else {
				this._servmetadata_report["bbox"] = "undefined";
			}

			for (ly of this._servmetadata["layers"]) {

				mxs = parseInt(ly["maxScale"]);
				mis = parseInt(ly["minScale"]);
				if (mis == 0 && mxs == 0) {
					retstatus = "ok";
				} else {
					//console.log(this.minscale, '>', mis, this.maxscale, '<', mxs);
					retstatus = ((this.minscale > mis || this.maxscale < mxs) ?  "notok" : "ok");
				}

				this._servmetadata_report["layers"][ly["id"]] = {
					"name": ly["name"],
					"scaleinterval": [ly["maxScale"], ly["minScale"]],
					"status": retstatus
				};
			}
			this._servmetadata_report_completed = true;

			const [viable, errormsg] = this.checkDrawingViability();

			if (GlobalConst.getDebug("AGSQRY")) {
				if (viable) {
					console.log(`[DBG:AGSQRY] Layer '${this.key}' viability checked OK, before drawing`);
				} else {
					console.log(`[DBG:AGSQRY] Layer '${this.key}' metadata did not check OK, drawing skipped`);
				}
			}

			ret = viable;

		} catch(e) {

			console.error(e);
			console.log(`------ FAILING LAYER '${this.key}' METADATA --------`);
			console.log(this._servmetadata);
			ret = false;
			
		}

		return ret;
	
	}

	reportResult(p_innerlyrnames_str) {

		let splits=[], res = null;
		for (let k in this._servmetadata_report) {
			if (k == "layers") {
				continue;
			}
			if (this._servmetadata_report[k] == "notok") {
				res = k;
				break;
			}			
		}
		
		if (res == null && p_innerlyrnames_str != null && p_innerlyrnames_str.length > 0) {

			splits = p_innerlyrnames_str.split(/[,\s]+/);
			for (let k of splits) {

				for (const s in this._servmetadata_report["layers"][k]) {}

				if (this._servmetadata_report["layers"][k]["status"] == "notok") {
					res = `layer '${k}', name '${this._servmetadata_report["layers"][k]["name"]}' scale interval ${this._servmetadata_report["layers"][k]["scaleinterval"]} not ok`;
					break;
				}			
			}
		}
		return res;
	}

	checkDrawingViability() {
		let ret = false, res="";

		if (this._servmetadata_report_completed) {

			// test generic viability
			let res = this.reportResult();
			if (res != null) {
				throw new Error(`AGS service not usable due to: ${res}`);				
			}

			let othermandatory = [], missinglayername  = false;
			if (this.missing_mandatory_configs.length > 0) {
				for (let i=0; i<this.missing_mandatory_configs.length; i++) {		
					if (this.missing_mandatory_configs[i] != "layers") {
						othermandatory.push(this.missing_mandatory_configs[i]);
					} else {
						missinglayername = true;
					}
				}		
				if (othermandatory.length > 0) {
					throw new Error(`AGS layer, unable to draw due to missing mandatory configs for toc entry '${this.key}': ${othermandatory}`);
				}					

				if (missinglayername) {
					let lyr, lylist = [];
					for (const k in this._servmetadata_report.layers) {
						lyr = this._servmetadata_report.layers[k];
						lylist.push(`'${k}' (name:${lyr['name']}, scaleinterval:${lyr['scaleinterval']})`);
					}
					throw new Error(`AGS 'layers' not configured, available: ${lylist}`);
				}				
			}

			ret = true;
			res = this.reportResult(this.layers);
			if (res != null) {
				ret = false;
				console.error(`AGS service inner layers '${this.layers}' not usable due to: ${res}`);				
			}

			if (GlobalConst.getDebug("AGSQRY")) {
				console.log(`[DBG:AGSQRY] before drawing '${this.key}'`);
			}

		} else {
			if (GlobalConst.getDebug("AGSQRY")) {
				console.log(`[DBG:AGSQRY] waiting on metadata for '${this.key}'`);
			}
		}

		return [ret, res];
	}

	getStats(p_mapctx, p_terrain_env) {

		const url = this.buildQueryURL(p_mapctx, p_terrain_env, "INITCOUNT");
		// console.log("## GETSTATS buildQueryURL:", url);
		const that = this;

		fetch(url)
			.then(response => response.json())
			.then(
				function(responsejson) {
					that.refresh(p_mapctx, {
						"count": responsejson.count
					});					
				}
			);	
	}

	* itemchunks(p_mapctxt, p_prep_data) {

		if (p_prep_data == null) {
			throw new Error("null prep_data in itemchunks");
		}

		const feat_count = p_prep_data["count"]

		if (feat_count == 0) {
			console.log(`[WARN:AGSQRY] Empty feat set in layer '${this.key}', nothing to draw`);
			return;
		}

		if (feat_count == 1) {
			console.log(`[WARN:AGSQRY] QUASI Empty feat set in layer '${this.key}', 1 elem to draw`);
			return;
		}		

		let numchunks, remainder, calc_chunksize;

		if (feat_count > GlobalConst.MAXFEATCHUNKSIZE) {

			numchunks = Math.floor(feat_count / GlobalConst.MAXFEATCHUNKSIZE);
			calc_chunksize = feat_count / numchunks;
			remainder = feat_count % numchunks;

			while (calc_chunksize + remainder > GlobalConst.MAXFEATCHUNKSIZE) {
				numchunks++;
				calc_chunksize = Math.floor(feat_count / numchunks);
				remainder = feat_count % numchunks;
			}
		} else {
			numchunks = 1;
			calc_chunksize = feat_count;
			remainder = 0;
		}

		if (GlobalConst.getDebug("AGSQRY")) {
			console.log(`[DBG:AGSQRY] Vector layer '${this.key}' , chunks:${numchunks}, size:${calc_chunksize}, rem:${remainder}`);
		}

		for (let i=0; i<numchunks; i++) {

			if (i < numchunks-1) {
				yield {
					"firstrecid": i*calc_chunksize, 
					"reccount": calc_chunksize
				};
			} else {
				// last chunk will fetch additional 'remainder' records, if remainder > 0
				yield {
					"firstrecid": i*calc_chunksize, 
					"reccount": calc_chunksize + remainder
				};

			}
		}

	}		

	looplayeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_item_chunks_params) {

		const firstrecid = p_item_chunks_params["firstrecid"] 
		const reccount = p_item_chunks_params["reccount"] 
		
		const urlstr = this.buildQueryURL(p_mapctxt, p_terrain_env, "GETCHUNK", firstrecid, reccount);
		const that = this;

		const chunk_id = uuidv4();

		fetch(urlstr)
			.then((response) => {
				if (response.ok) {
					return response.json();
				}
				throw new Error(`Error fetching features chunk for layer '${that.key}'`);
			})
			.then(
				function(responsejson) {

					let tmpchkid;
					if (that.isCanceled()) {

						console.log(`${that.key} was canceled , stop loading ... `);

						if (that.featchunksloading[chunk_id] !== undefined) {
							delete that.featchunksloading[chunk_id];
						}
						for (tmpchkid in that.featchunksloading[chunk_id]) {
							if (this.featchunksloading.hasOwnProperty(tmpchkid)) {
								delete that.featchunksloading[tmpchkid];
							}
						}
						that.resetCanceled();
						return;
					}
										
					// chunk has become obsolete and was deleted from featchunksloading
					// by new drawing action
					if (that.featchunksloading[chunk_id] === undefined) {
						return;
					}

					const esriGeomtype = responsejson.geometryType;
					const svcReference = responsejson.spatialReference.wkid;
					const crs = p_mapctxt.cfgvar["basic"]["crs"];

					try {

						if (WKID_List[svcReference] != crs) {
							throw new Error(`'${that.key}', incoerence in crs - config:${crs}, ret.from service:${WKID_List[svcReference]} (WKID: ${svcReference})`);
						}

						// verificar campos ATTRS

						let id;
						for (const feat of responsejson.features) {

							if (esriGeomtype == "esriGeometryPolygon") {
								if (feat.geometry.rings.length > 0) {

									if (!that.isFeatureInsideFilter(feat.attributes)) {
										continue;
									}
																		
									id = that._currFeatures.addfeature(that.key, feat.geometry.rings, feat.attributes, that.geomtype, 2, null, that.oidfldname);
									// If feature still exists  between cleanups that's because it might not have been properly garbage collected
									// If exists, let's not try to draw it, id is null
									if (id) {
										that._currFeatures.featuredraw(that.key, id, null, null, null, p_terrain_env);
									}
								}
							}							
						}

					} catch(e) {

						console.error(e);
						
					} finally {

						if (that.featchunksloading[chunk_id] !== undefined) {

							if (GlobalConst.getDebug("VECTLOAD")) {
								console.log(`[DBG:VECTLOAD] '${that.key}', timing for '${chunk_id}': ${new Date().getTime() - that.featchunksloading[chunk_id]["ts"]}, reloaded: ${that.featchunksloading[chunk_id]["reloaded"]}`);
							}
			
							delete that.featchunksloading[chunk_id];

							if (Object.keys(that.featchunksloading).length == 0) {
								if (GlobalConst.getDebug("VECTLOAD")) {
									console.log(`[DBG:VECTLOAD] Finished loading'${that.key}'`);
								}

								p_mapctxt.tocmgr.signalVectorLoadFinished(that.key);
							}
			
						}						
					}
								
				}
			).catch((e) => {
				console.error(e);
			});	

		this.featchunksloading[chunk_id] = {
			"chunk_id": chunk_id,
			"ts": new Date().getTime(),
			"url": urlstr,
			"reloaded": false
		}


	}


}

