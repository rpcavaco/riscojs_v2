
import {GlobalConst} from './constants.js';
import { VectorLayer } from './layers.mjs';
import { CanvasStrokeSymbol } from './canvas_symbols.mjs';

class CanvasVectorLayer extends VectorLayer {

	canvasKey = 'normal';
	// constructor(p_mapctxt) {
	//super(p_mapctxt);
	constructor() {
		super();
		this.default_stroke_symbol = new CanvasStrokeSymbol();
		// this.default_fill_symbol = null;
	}
}

export class CanvasGraticuleLayer extends CanvasVectorLayer {

	separation;

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

	}

	drawitem2D(p_mapctxt, p_gfctx, p_terrain_env, p_scr_env, p_dims, p_envkey, p_canvas_coords, p_attrs, p_lyrorder) {

		p_gfctx.beginPath();
		p_gfctx.moveTo(p_canvas_coords[0], p_canvas_coords[1]);
		p_gfctx.lineTo(p_canvas_coords[2], p_canvas_coords[3]);
		p_gfctx.stroke();

		return true;

	}
}

export class CanvasGraticulePtsLayer extends CanvasVectorLayer {

	separation;
	ptdim = 2;

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
				p_mapctxt.transformmgr.getCanvasPt([x, y], out_pt)
				yield [out_pt.slice(0), null];
			}
		}
	}

	drawitem2D(p_mapctxt, p_gfctx, p_terrain_env, p_scr_env, p_dims, p_envkey, p_canvas_coords, p_attrs, p_lyrorder) {

		const sclval = p_mapctxt.getScale();
		const dim = this.ptdim * (10.0 / Math.log10(sclval));

		p_gfctx.beginPath();

		// horiz
		p_gfctx.moveTo(p_canvas_coords[0] - dim, p_canvas_coords[1]);
		p_gfctx.lineTo(p_canvas_coords[0] + dim, p_canvas_coords[1]);
		p_gfctx.stroke();

		p_gfctx.beginPath();

		// vert
		p_gfctx.moveTo(p_canvas_coords[0], p_canvas_coords[1] - dim);
		p_gfctx.lineTo(p_canvas_coords[0], p_canvas_coords[1] + dim);
		p_gfctx.stroke();

		return true;

	}
}


/*
https://servergeo.cm-porto.pt/arcgis/rest/services/BASE/ENQUADRAMENTO_BW_ComFregsPTM06/MapServer/



https://servergeo.cm-porto.pt/arcgis/rest/services/BASE/ENQUADRAMENTO_BW_ComFregsPTM06/MapServer/9/query?where=1%3D1&text=&objectIds=&time=&timeRelation=esriTimeRelationOverlaps&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&distance=&units=esriSRUnit_Foot&relationParam=&outFields=&returnGeometry=true&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&havingClause=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&returnExtentOnly=false&sqlFormat=none&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&featureEncoding=esriDefault&f=html
*/

export class CanvasAGSFeatQueryLayer extends CanvasVectorLayer {

	url;     // https://servergeo.cm-porto.pt/arcgis/rest/services/BASE/ENQUADRAMENTO_BW_ComFregsPTM06/MapServer
	layerid; // 9
	fields = "objectid";
	precision = 3; 
	f = "json";
	
	constructor() { 
		super();
	}

	buildQueryURL(p_mapctxt, p_terrain_bounds, p_mode) {

		const teststr = `MapServer/${this.layerid}/query`;

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
				sp.set('returnGeometry', 'true');
				sp.set('returnIdsOnly', 'false');
				sp.set('returnCountOnly', 'false');
				sp.set('returnExtentOnly', 'false');
				break;
		
		}

		/*
		sp.set('returnGeometry', 'true');
		sp.set('returnIdsOnly', 'false');
		sp.set('returnCountOnly', 'false');
		sp.set('returnExtentOnly', 'false');
		sp.set('geometryPrecision', precision.toString());
		sp.set('outSR', crs);
		*/

		sp.set('f', 'json');

		const ret = url.toString();		
		if (GlobalConst.getDebug("AGSQRY")) {
			console.log(`[DBG:AGSQRY] buildGetMapURL: '${ret}'`);
		}	
		
		return ret; 
	}

	isInited() {
		return !this._servmetadata_docollect || this._servmetadata_report_completed;
	}

	// Why passing Map context to this method if this layer has it as a field ?
	// The reason is: it is not still available at this stage; it will be availabe later to subsequent drawing ops
	initLayer(p_mapctx, p_lyr_order) {

		if (GlobalConst.getDebug("AGSMAP")) {
			console.log(`[DBG:AGSMAP] Layer '${this.key}' is in INIT`);
		}
		
		if (this.url == null || this.url.length < 1) {
			throw new Error("Class CanvasAGSMapLayer, null or empty p_metadata_or_root_url");
		}

		if (!this.url.endsWith('/MapServer')) {
			throw new Error("Class CanvasAGSMapLayer, 'url' config parameter must terminate with '/MapServer'");
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
				if (key.toLowerCase() == 'service' && value.toLowerCase() == 'wms') {
					checkitems["f"] = "true";
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

					if (GlobalConst.getDebug("AGSMAP")) {
						console.log(`[DBG:AGSMAP] Layer '${that.key}' metadata arrived, viability check starting`);
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
						"supportedImageFormatTypes",
						"capabilities", 
						// "supportedQueryFormats", 
						"supportsDatumTransformation",
						"supportsSpatialFilter",
						//"supportsQueryDataElements"
						//"maxRecordCount",			
						"maxImageHeight",			
						"maxImageWidth"			
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
						this.draw2D(p_mapctx, p_mapctx);

					}			
				}
			)

		this.draw2D(p_mapctx, p_lyr_order);

	}

	reporting (p_mapctxt, p_crs, p_bounds, p_dims, p_lyr_order) {
		// service capabilities validation step
		
		this._servmetadata_report = {};

		try {

			this._servmetadata_report["imagewidth"] = ( parseInt(this._servmetadata["maxImageWidth"]) >= p_dims[0] ? "ok" : "notok");
			this._servmetadata_report["imageheight"] = ( parseInt(this._servmetadata["maxImageHeight"]) >= p_dims[1] ? "ok" : "notok");
			this._servmetadata_report["imageformat"] = ( this._servmetadata["supportedImageFormatTypes"].toLowerCase().indexOf(this.imageformat) < 0 ? "notok" : "ok");

			if (WKID_List[this._servmetadata["wkid"]] === undefined) {
				throw new Error(`Uknown ${this._servmetadata["wkid"]} WKID in layer '${this._key}'`);
			}

			let crs = WKID_List[this._servmetadata["wkid"]];
			if (crs != p_crs && !this._servmetadata["supportsDatumTransformation"]) {
				this._servmetadata_report["crs"] = "notok";
			} else {
				this._servmetadata_report["crs"] = "ok";
			}

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

			const [viable, errormsg] = this.checkGetMapRequestViability();

			if (GlobalConst.getDebug("AGSMAP")) {
				if (viable) {
					console.log(`[DBG:AGSMAP] Layer '${this.key}' viability checked OK, before drawing`);
				} else {
					console.log(`[DBG:AGSMAP] Layer '${this.key}' metadata did not check OK, drawing skipped`);
				}
			}

			if (!viable) {
				return;
			}

			this.draw2D(p_mapctxt, p_lyr_order);

		} catch(e) {

			console.error(e);

			console.log(this._servmetadata);
			
		}
	
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

	checkGetMapRequestViability() {
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

			if (GlobalConst.getDebug("AGSMAP")) {
				console.log(`[DBG:AGSMAP] before drawing '${this.key}'`);
			}

		} else {
			if (GlobalConst.getDebug("AGSMAP")) {
				console.log(`[DBG:AGSMAP] waiting on metadata for '${this.key}'`);
			}
		}

		return [ret, res];
	}

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

		if (GlobalConst.getDebug("AGSMAP")) {
			console.log(`[DBG:AGSMAP] found_layers '${found_layers}' for scale 1:'${sclval}'`);
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
		if (GlobalConst.getDebug("AGSMAP")) {
			console.log(`[DBG:AGSMAP] buildGetMapURL: '${ret}'`);
		}	
		
		return ret; 
	}	

	* itemchunks(p_mapctxt, p_terrain_env) {
		// to be extended
		// for each chunk, responde with firstrecid, reccount
	}		

	
}

