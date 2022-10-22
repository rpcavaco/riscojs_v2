
import {GlobalConst} from './constants.js';
import {WKID_List} from './esri_wkids.js';
import {uuidv4} from './utils.mjs';

import { VectorLayer, RemoteVectorLayer } from './layers.mjs';


class CanvasVectorLayer extends VectorLayer {

	canvasKey = 'normal';
	default_canvas_symbol;
	constructor() {
		super();
	}
}

class CanvasRemoteVectorLayer extends RemoteVectorLayer {

	canvasKey = 'normal';
	default_canvas_symbol;
	constructor() {
		super();
	}
}

export class CanvasGraticuleLayer extends CanvasVectorLayer {

	separation;
	_geomtype = "line";

	constructor() {
		super();
	}



	* itemchunks(p_mapctxt, p_terrain_env) {
		yield [-1, -1];
	}	

	* layeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims, firstrecid, reccount) {

		let x, endlimit, crdlist = [], out_pt = [], crdlist_t;
		for (const mode of ['horiz', 'vert']) {

			if (mode == 'vert') {
				x = this.separation * Math.floor(p_terrain_env[0] / this.separation);
				endlimit = p_terrain_env[2];
			} else {
				x = this.separation * Math.floor(p_terrain_env[1] / this.separation);
				endlimit = p_terrain_env[3];
			}

			while (x <= endlimit) {

				x = x + this.separation;
				if (mode == 'vert') {
					crdlist.length = 0;
					crdlist.push(...[x, p_terrain_env[1], x, p_terrain_env[3]]);
				} else {
					crdlist.length = 0;
					crdlist.push(...[p_terrain_env[0], x, p_terrain_env[2], x]);
				}
				crdlist_t = []
				crdlist_t.length = crdlist.length;
				for (let i = 0; i < 2; i++) {
					p_mapctxt.transformmgr.getCanvasPt([crdlist[2 * i], crdlist[2 * i + 1]], out_pt)
					crdlist_t[2 * i] = out_pt[0];
					crdlist_t[2 * i + 1] = out_pt[1];
				}

				yield [crdlist_t, null];
			}

		}

		p_mapctxt.tocmgr.signalVectorLoadFinished(this.key);

	}

	drawitem2D(p_mapctxt, p_gfctx, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_recvd_geomtype, p_lyrorder) {

		p_gfctx.beginPath();
		p_gfctx.moveTo(p_coords[0], p_coords[1]);
		p_gfctx.lineTo(p_coords[2], p_coords[3]);
		p_gfctx.stroke();

		return true;

	}
}

export class CanvasGraticulePtsLayer extends CanvasVectorLayer {

	separation;
	ptdim = 2;
	_geomtype = "line";

	constructor() {
		super();
	}

	* itemchunks(p_mapctxt, p_terrain_env) {
		yield [-1, -1];
	}	

	* layeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims, firstrecid, reccount) {

		let out_pt = [];
		let x, xorig = this.separation * Math.floor(p_terrain_env[0] / this.separation);
		let x_lim = p_terrain_env[2];

		let y = this.separation * Math.floor(p_terrain_env[1] / this.separation);
		let y_lim = p_terrain_env[3];

		while (y <= y_lim) {

			y = y + this.separation;
			x = xorig;

			while (x <= x_lim) {

				x = x + this.separation;
				p_mapctxt.transformmgr.getCanvasPt([x, y], out_pt);
				yield [out_pt.slice(0), null];
			}
		}

		p_mapctxt.tocmgr.signalVectorLoadFinished(this.key);		
	}

	drawitem2D(p_mapctxt, p_gfctx, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_recvd_geomtype, p_lyrorder) {

		const sclval = p_mapctxt.getScale();
		const dim = this.ptdim * (10.0 / Math.log10(sclval));

		p_gfctx.beginPath();

		// horiz
		p_gfctx.moveTo(p_coords[0] - dim, p_coords[1]);
		p_gfctx.lineTo(p_coords[0] + dim, p_coords[1]);
		p_gfctx.stroke();

		p_gfctx.beginPath();

		// vert
		p_gfctx.moveTo(p_coords[0], p_coords[1] - dim);
		p_gfctx.lineTo(p_coords[0], p_coords[1] + dim);
		p_gfctx.stroke();

		return true;

	}
}


export class CanvasAGSQryLayer extends CanvasRemoteVectorLayer {

	url;     // https://servergeo.cm-porto.pt/arcgis/rest/services/BASE/ENQUADRAMENTO_BW_ComFregsPTM06/MapServer
	layerid; // 9
	oidfldname = "objectid"
	precision = 3;
	f = "json";

	constructor() { 
		super();
	}

	buildQueryURL(p_mapctxt, p_terrain_bounds, p_mode, opt_firstrecid, opt_reccount) {

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

				sp.set('resultOffset', opt_firstrecid.toString());
				sp.set('resultRecordCount', opt_reccount.toString());
				 
				break;
					
		}

		sp.set('f', 'json');

		const ret = url.toString();		
		if (GlobalConst.getDebug("AGSQRY")) {
			console.log(`[DBG:AGSQRY] -- '${p_mode}' -- buildGetMapURL: '${ret}'`);
		}	
		
		return ret; 
	}

	isInited() {
		return !this._servmetadata_docollect || this._servmetadata_report_completed;
	}

	// Why passing Map context to this method if this layer has it as a field ?
	// The reason is: it is not still available at this stage; it will be availabe later to subsequent drawing ops
	initLayer(p_mapctx, p_lyr_order) {

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
					if (that.reporting(p_mapctx, cfg["crs"], bounds, dims, p_lyr_order)) {
						that.getStats(p_mapctx, bounds, p_lyr_order);
					}			
				}
			)

	}

	reporting (p_mapctxt, p_crs, p_bounds, p_dims, p_lyr_order) {
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

	/*
	buildExportMapURL(p_mapctxt, p_terrain_bounds, p_dims) {

		let found_layers = this.layers;
		let sclval  = p_mapctxt.getScale();
		let ordsdlscales = [];
		for (let k in this.scaledepLayers) {
			ordsdlscales.push(parseFloat(k));
		};
		ordsdlscales.sort();

		for (let sdlscale of ordsdlscales) {
			if (sclval <= sdlscale) {
				found_layers = this.scaledepLayers[sdlscale];
			}
		}

		if (GlobalConst.getDebug("AGSQRY")) {
			console.log(`[DBG:AGSQRY] found_layers '${found_layers}' for scale 1:'${sclval}'`);
		}

		if (this.url.indexOf("/MapServer/export") < 0) {
			this.url = this.url.replace("/MapServer", "/MapServer/export");
		}

		const url = new URL(this.url);
		
		const sp = url.searchParams;
		const crs = p_mapctxt.cfgvar["basic"]["crs"];
		const bndstr = p_terrain_bounds.join(',');

		sp.set('bbox', bndstr);
		sp.set('bboxSR', crs);
		sp.set('imageSR', crs);
		sp.set('size', `${p_dims[0]},${p_dims[1]}`);
		sp.set('dpi', '96');		
		sp.set('format', this.imageformat);
		sp.set('layers', `show:${found_layers}`);
		sp.set('f', 'image');

		const ret = url.toString();		
		if (GlobalConst.getDebug("AGSQRY")) {
			console.log(`[DBG:AGSQRY] buildGetMapURL: '${ret}'`);
		}	
		
		return ret; 
	}	*/

	getStats(p_mapctx, p_terrain_env, p_lyr_order) {

		const url = this.buildQueryURL(p_mapctx, p_terrain_env, "INITCOUNT");
		// console.log("## GETSTATS buildQueryURL:", url);
		const that = this;

		fetch(url)
			.then(response => response.json())
			.then(
				function(responsejson) {
					that.draw2D(p_mapctx, responsejson.count, p_lyr_order);					
				}
			);	
	}

	* itemchunks(p_mapctxt, p_feat_count, p_terrain_env) {

		if (p_feat_count == 0) {
			console.log(`[WARN:AGSQRY] Empty feat set in layer '${this.key}', nothing to draw`);
			return;
		}

		if (p_feat_count == 1) {
			console.log(`[WARN:AGSQRY] QUASI Empty feat set in layer '${this.key}', 1 elem to draw`);
			return;
		}		

		let numchunks, remainder, calc_chunksize;

		if (p_feat_count > GlobalConst.MAXFEATCHUNKSIZE) {

			numchunks = Math.floor(p_feat_count / GlobalConst.MAXFEATCHUNKSIZE);
			calc_chunksize = p_feat_count / numchunks;
			remainder = p_feat_count % numchunks;

			while (calc_chunksize + remainder > GlobalConst.MAXFEATCHUNKSIZE) {
				numchunks++;
				calc_chunksize = Math.floor(p_feat_count / numchunks);
				remainder = p_feat_count % numchunks;
			}
		} else {
			numchunks = 1;
			calc_chunksize = p_feat_count;
			remainder = 0;
		}

		if (GlobalConst.getDebug("AGSQRY")) {
			console.log(`[DBG:AGSQRY] Vector layer '${this.key}' , chunks:${numchunks}, size:${calc_chunksize}, rem:${remainder}`);
		}

		for (let i=0; i<numchunks; i++) {

			if (i < numchunks-1) {
				yield [i*calc_chunksize, calc_chunksize];
			} else {
				// last chunk will fetch additional 'remainder' records, if remainder > 0
				yield [i*calc_chunksize, calc_chunksize + remainder];
			}
		}

	}		

	layeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims, firstrecid, reccount, p_lyrorder) {

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

					// chunk has become obsolete and was deleted from featchunksloading
					// by new drawing action
					if (that.featchunksloading[chunk_id] === undefined) {
						return;
					}

					const esriGeomtype = responsejson.geometryType;
					const svcReference = responsejson.spatialReference.wkid;
					const crs = p_mapctxt.cfgvar["basic"]["crs"];

					const gfctx = p_mapctxt.canvasmgr.getDrwCtx(that.canvasKey, '2d');
					gfctx.save();

					try {

						if (WKID_List[svcReference] != crs) {
							throw new Error(`'${that.key}', incoerence in crs - config:${crs}, ret.from service:${WKID_List[svcReference]} (WKID: ${svcReference})`);
						}

						switch (that.geomtype) {

							case "poly":

								gfctx.fillStyle = that.default_canvas_symbol.fillStyle;
								gfctx.strokeStyle = that.default_canvas_symbol.strokeStyle;
								gfctx.lineWidth = that.default_canvas_symbol.lineWidth;
			
								if (esriGeomtype != "esriGeometryPolygon") {
									throw new Error(`'${that.key}', incoerence in feat.types - config:${that.geomtype}, ret.from service:${esriGeomtype}`);
								}
								break;

							case "line":

								gfctx.strokeStyle = that.default_canvas_symbol.strokeStyle;
								gfctx.lineWidth = that.default_canvas_symbol.lineWidth;
			
								if (esriGeomtype != "esriGeometryPolyline") {
									throw new Error(`'${that.key}', incoerence in feat.types - config:${that.geomtype}, ret.from service:${esriGeomtype}`);
								}
								break;								

						}

						// verificar campos ATTRS

						for (const feat of responsejson.features) {
							that.drawitem2D(p_mapctxt, gfctx, p_terrain_env, p_scr_env, p_dims, feat.geometry, feat.attributes, esriGeomtype, p_lyrorder);
						}

					} catch(e) {
						console.error(e);
					} finally {
						gfctx.restore();

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


	};

	drawitem2D(p_mapctxt, p_gfctx, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_recvd_geomtype, p_lyrorder) {

		const pt=[];
		if (p_recvd_geomtype == "esriGeometryPolygon") {

			if (p_coords.rings.length > 0) {

				p_gfctx.beginPath();

				for (const ring of p_coords.rings) {
					for (let pti=0; pti<ring.length; pti++) {

						p_mapctxt.transformmgr.getCanvasPt(ring[pti], pt)

						if (pti == 0){
							p_gfctx.moveTo(...pt);
						} else {
							p_gfctx.lineTo(...pt);
						}
					}
					p_gfctx.closePath();
				}

				// p_gfctx.fillStyle = this.fillStyle;
				// p_gfctx.strokeStyle = this.strokeStyle;
				// p_gfctx.lineWidth = this.lineWidth;
				p_gfctx.fill();
				p_gfctx.stroke();	
				
//				console.log("<<<< fim >>>>>");


			}

		}

	}	

}

