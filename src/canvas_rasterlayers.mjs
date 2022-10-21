import {WKID_List} from './esri_wkids.js';
import {GlobalConst} from './constants.js';
import {uuidv4} from './utils.mjs';
// import {processHDREffect} from './canvas_utils.mjs';

import {RasterLayer} from './layers.mjs';


function toGrayScaleImgFilter(p_gfctx, p_imgobj, p_x, p_y, p_ctxw, p_ctxh, null_filteradicdata) {
		
	try {
		var imageData = p_gfctx.getImageData(p_x, p_y, p_ctxw, p_ctxh);
		var data = imageData.data;

		for(var i = 0; i < data.length; i += 4) {
		  var brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
		  // red
		  data[i] = brightness;
		  // green
		  data[i + 1] = brightness;
		  // blue
		  data[i + 2] = brightness;
		}

		// overwrite original image
		p_gfctx.putImageData(imageData, p_x, p_y);    			
		
	} catch(e) {
		var accepted = false
		if (e.name !== undefined) {
			if (["NS_ERROR_NOT_AVAILABLE"].indexOf(e.name) >= 0) {
				accepted = true;
			}
		}
		if (!accepted) {
			console.log("... drawImage ERROR ...");
			console.log(p_imgobj);
			console.log(e);
		}
			
	}
};

function imageEvtsHandling(pp_mapctxt, p_lyr, p_img, pp_scr_env, pp_dims, pp_envkey, p_raster_id) {
	
	p_img.onload = function() {

		const gfctx = pp_mapctxt.canvasmgr.getDrwCtx(p_lyr.canvasKey, '2d');

		gfctx.save();
		try {

			//p_gfctx.clearRect(pp_scr_env[0], pp_scr_env[3], ...pp_dims);

			gfctx.drawImage(p_img, pp_scr_env[0], pp_scr_env[3]);

			if (p_lyr.filter == 'grayscale') {
				toGrayScaleImgFilter(gfctx, p_img, pp_scr_env[0], pp_scr_env[3], ...pp_dims);
			}

			//processHDREffect(gfctx, [0,0], pp_dims)
		} catch(e) {
			throw e;
		} finally {
			gfctx.restore();

			if (p_lyr.rastersloading[p_raster_id] !== undefined) {

				if (GlobalConst.getDebug("IMGLOAD")) {
					console.log(`[DBG:IMGLOAD] timing for '${p_raster_id}': ${new Date().getTime() - p_lyr.rastersloading[p_raster_id]["ts"]}, reloaded: ${p_lyr.rastersloading[p_raster_id]["reloaded"]}`);
				}

				delete p_lyr.rastersloading[p_raster_id];

			}
			// console.log(`(rstrs still loading at t1 x ${p_envkey}):`, Object.keys(p_lyr.rastersloading[p_envkey]));
		}

	}

	p_img.onerror = function() {
		if (GlobalConst.getDebug("IMGLOAD")) {
			if (p_lyr.rastersloading[p_raster_id] !== undefined) {
				console.log(`[DBG:IMGLOAD] Error for '${p_raster_id}', time: ${new Date().getTime() - p_lyr.rastersloading[p_raster_id]["ts"]}`);
			}
		}
		if (p_lyr.rastersloading[p_raster_id] !== undefined) {
			delete p_lyr.rastersloading[p_raster_id];		
		}		
	}

}

function timeOutOnRasterLoading(p_rastersloading, p_raster_id) {

	setTimeout(
		function() {

			if (p_rastersloading[p_raster_id] !== undefined) {

				if (p_rastersloading[p_raster_id].reloaded) {
					if (GlobalConst.getDebug("IMGLOAD")) {
						console.log(`[DBG:IMGLOAD] Re-re-loading request rejected '${p_raster_id}'`);
					}
					return;
				}

				p_rastersloading[p_raster_id].img.src = "";

				if (GlobalConst.getDebug("IMGLOAD")) {
					console.log(`[DBG:IMGLOAD] Re-loading '${p_raster_id}'`);
				}
		
				p_rastersloading[p_raster_id].img.src = p_rastersloading[p_raster_id].url;
				p_rastersloading[p_raster_id].reloaded = true;

			}
		},
		GlobalConst.IMGRELOAD_TIMEOUT_MSEC
	);

}

class CanvasRasterLayer extends RasterLayer {

	canvasKey = 'base';
	image_filter = "none";

	constructor() {
		super();
	}	

	drawitem2D(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_envkey, p_raster_url, p_lyrorder) {

		const img = new Image();
		img.crossOrigin = "anonymous";

		const raster_id = uuidv4();

		imageEvtsHandling(p_mapctxt, this, img, p_scr_env.slice(0), p_dims.slice(0), p_envkey, raster_id);		
		img.src = p_raster_url;

		// console.log(`(rstrs on loading at t0 x ${p_envkey}):`, Object.keys(this.rastersloading[p_envkey]));

		if (GlobalConst.getDebug("IMGLOAD")) {
			const ks = Object.keys(this.rastersloading);
			console.log(`[DBG:IMGLOAD] Loading '${raster_id}', pending: ${ks.length} ${Object.keys(this.rastersloading)}`);
		}

		this.rastersloading[raster_id] = {
			"raster_id": raster_id,
			"img": img,
			"ts": new Date().getTime(),
			"url": p_raster_url,
			"reloaded": false
		}

		timeOutOnRasterLoading(this.rastersloading, raster_id);

		return true;

	}	
	
}

export class CanvasWMSLayer extends CanvasRasterLayer {

	url; // get capabilities or URL missing getcapabilities command
	layernames;
	imageformat = "image/jpeg";
	reuseurl = false;

	constructor() { 
		super();
		this._servmetadata_docollect = false;
	}

	isInited() {
		return !this._servmetadata_docollect || this._servmetadata_report_completed;
	}

	// Why passing Map context to this method if this layer has it as a field ?
	// The reason is: it is not still available at this stage; it will be availabe later to subsequent drawing ops
	initLayer(p_mapctx, p_lyr_order) {

		// 18-10-2022: Unable to understand nested Layer elements - metadata analysis is BROKEN

		//console.log("init layer", p_lyr_order);


		if (GlobalConst.getDebug("WMS")) {
			console.log(`[DBG:WMS] Layer '${this.key}' is in INIT`);
		}
		
		if (this.url == null || this.url.length < 1) {
			throw new Error("Class CanvasWMSLayer, null or empty p_metadata_or_root_url");
		}

		this._servmetadata = {};
		if (this._servmetadata_docollect) {

			this._metadata_or_root_url = new URL(this.url);

			const bounds = [], dims=[];
			p_mapctx.getMapBounds(bounds);
			const cfg = p_mapctx.cfgvar["basic"]; 
			p_mapctx.getCanvasDims(dims);

			if (this._metadata_or_root_url) {
				const sp = this._metadata_or_root_url.searchParams;
				const checkitems = {
					"service_wms": false,
					"req_getcapabilities": false
				}

				for (const [key, value] of sp.entries()) {
					if (key.toLowerCase() == 'service' && value.toLowerCase() == 'wms') {
						checkitems["service_wms"] = true;
						sp.set(key, 'WMS'); // Force upper case
					}
					if (key.toLowerCase() == 'request' && value.toLowerCase() == 'getcapabilities') {
						checkitems["req_getcapabilities"] = true;
					}
				}

				if (!checkitems["service_wms"]) {
					sp.append('service', 'WMS');
				}
				if (!checkitems["req_getcapabilities"]) {
					sp.append('request', 'getcapabilities');
				}
			} 
			
			const that = this;

			fetch(this._metadata_or_root_url.toString())
				.then(response => response.text())
				.then(
					function(responsetext) {

						if (GlobalConst.getDebug("WMS")) {
							console.log(`[DBG:WMS] Layer '${that.key}' metadata arrived, viability check starting`);
						}

						const parser = new DOMParser();
						//const ret = response.json();
						const xmlDoc = parser.parseFromString(responsetext, "text/xml");

						let tmp1, tmp2, velem2, velem = xmlDoc.activeElement.getAttribute("version");
						that._servmetadata["version"] = velem;

						const srvc = xmlDoc.getElementsByTagName("Service")[0];
						const capab = xmlDoc.getElementsByTagName("Capability")[0];
						const req = xmlDoc.getElementsByTagName("Request")[0];

						that._servmetadata["maxw"] = -1;
						that._servmetadata["maxh"] = -1;

						tmp1 = srvc.getElementsByTagName("MaxWidth");
						if (tmp1.length > 0) {
							tmp2 = srvc.getElementsByTagName("MaxHeight");
							if (tmp1.length > 0) {
								that._servmetadata["maxw"] = tmp1[0];
								that._servmetadata["maxh"] = tmp2[0];
							}
						}
						that._servmetadata["formats"] = [];

						const getmap = xmlDoc.querySelector("Capability Request GetMap");
						velem = getmap.getElementsByTagName("Format");
						for (let fi=0; fi<velem.length; fi++) {
							that._servmetadata["formats"].push(velem[fi].textContent);
						}

						velem = getmap.querySelector("DCPType HTTP Get OnlineResource");

						if (that.reuseurl) {
							that._servmetadata["getmapurl"] = that.url;
						} else {
							that._servmetadata["getmapurl"] = velem.getAttributeNS("http://www.w3.org/1999/xlink", 'href');
						}

						// console.log("that._servmetadata['getmapurl']:", that._servmetadata["getmapurl"]);

						let lyrs = xmlDoc.querySelectorAll("Capability>Layer");

						if (lyrs.length < 1) {
							console.log("#### SÓ Layer num:", lyrs.length);
							lyrs = xmlDoc.querySelectorAll("Capability>Layer");
						} else {
							console.log("#### Layer Layer num:", lyrs.length);
						}


						that._servmetadata["layers"] = {}

						let lname, ly, k;
						for (let li=0; li<lyrs.length; li++) {

							ly = lyrs[li];
							lname = ly.querySelector("Name").textContent;

							that._servmetadata["layers"][lname] = {}
							velem = ly.querySelector("Abstract")
							if (velem) {
								that._servmetadata["layers"][lname]["abstract"] = velem.textContent;
							}
							
							velem = ly.querySelectorAll("CRS");
							if (velem.length>0) {
								that._servmetadata["layers"][lname]["crs"] = [];
								for (let crsi=0; crsi<velem.length; crsi++) {
									that._servmetadata["layers"][lname]["crs"].push(velem[crsi].textContent);
								}							
							}

							velem = ly.querySelectorAll("BoundingBox");
							if (velem.length>0) {
								that._servmetadata["layers"][lname]["bbox"] = {};
								for (let crsi=0; crsi<velem.length; crsi++) {
									console.log(lname, velem[crsi]);
									k = velem[crsi].getAttribute('CRS').replace("EPSG:", "");
									that._servmetadata["layers"][lname]["bbox"][k] = [velem[crsi].getAttribute('minx'), velem[crsi].getAttribute('miny'), velem[crsi].getAttribute('maxx'), velem[crsi].getAttribute('maxy')];
								}							
							}

							console.log(lname, that._servmetadata["layers"][lname]["bbox"]);
						}

						if (that.reporting(p_mapctx, cfg["crs"], bounds, dims, p_lyr_order)) {
							this.draw2D(p_mapctx, p_mapctx);
						}			

					}
				)

		}

	}

	reporting (p_mapctxt, p_crs, p_bounds, p_dims, p_lyr_order) {
		// service capabilities validation step

		let result = false;
		
		this._servmetadata_report = {};

		if (parseInt(this._servmetadata["maxw"]) < 0) {
			this._servmetadata_report["imagewidth"] = "ok";
		} else {
			this._servmetadata_report["imagewidth"] = ( parseInt(this._servmetadata["maxw"]) >= p_dims[0] ? "ok" : "notok");
		}

		if (parseInt(this._servmetadata["maxh"]) < 0) {
			this._servmetadata_report["imageheight"] = "ok";
		} else {
			this._servmetadata_report["imageheight"] = ( parseInt(this._servmetadata["maxh"]) >= p_dims[0] ? "ok" : "notok");
		}

		this._servmetadata_report["layers"] = {}

		let lname, ly, ret, bb;
		for (lname in this._servmetadata["layers"]) {

			ly = this._servmetadata["layers"][lname];
			this._servmetadata_report["layers"][lname] = {};
			
			this._servmetadata_report["layers"][lname]["crs"] = ( ly["crs"].indexOf(p_crs) < 0 ? "ok" : "notok");

			if (this._servmetadata["layers"][lname]["abstract"] !== undefined) {
				this._servmetadata_report["layers"][lname]["abstract"] = this._servmetadata["layers"][lname]["abstract"];
			}

			if (this._servmetadata["layers"][lname]["bbox"][p_crs] !== undefined) {
				bb = this._servmetadata["layers"][lname]["bbox"][p_crs];


				console.log(lname, p_bounds[0], ">=", bb[0], p_bounds[1], ">=",  bb[1], p_bounds[2], "<=", bb[2], p_bounds[3], "<=", bb[3]);


				this._servmetadata_report["layers"][lname]["bbox"] = (p_bounds[0] >= bb[0] && p_bounds[1] >= bb[1] && p_bounds[2] <= bb[2] && p_bounds[3] <= bb[3] ? "ok" : "notok");
			}
		}
		this._servmetadata_report_completed = true;

		const [viable, errormsg] = this.checkGetMapRequestViability();

		if (GlobalConst.getDebug("WMS")) {
			if (viable) {
				console.log(`[DBG:WMS] Layer '${this.key}' viability checked OK, before drawing`);
			} else {
				console.log(`[DBG:WMS] Layer '${this.key}' metadata did not check OK, drawing skipped`);
			}
		}

		if (!viable) {
			return result;
		}

		result = true;

		return result;

	
	}

	reportResult(p_wms_innerlyrnames_str) {

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
		
		if (res == null && p_wms_innerlyrnames_str != null && p_wms_innerlyrnames_str.length > 0) {

			splits = p_wms_innerlyrnames_str.split(/[,\s]+/);
			for (let k of splits) {
				for (let m in this._servmetadata_report["layers"][k]) {
					if (this._servmetadata_report["layers"][k][m] == "notok") {
						res = `layer '${k}', item '${m}'`;
						break;
					}	
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
				throw new Error(`WMS service not usable due to: ${res}`);				
			}

			let othermandatory = [], missinglayername  = false;
			if (this.missing_mandatory_configs.length > 0) {
				for (let i=0; i<this.missing_mandatory_configs.length; i++) {		
					if (this.missing_mandatory_configs[i] != "layernames") {
						othermandatory.push(this.missing_mandatory_configs[i]);
					} else {
						missinglayername = true;
					}
				}		
				if (othermandatory.length > 0) {
					throw new Error(`WMS layer, unable to draw due to missing mandatory configs for toc entry '${this.key}': ${othermandatory}`);
				}					

				if (missinglayername) {
					let lylist = [];
					for (const k in this._servmetadata_report.layers) {
						lylist.push(`'${k}' (crs:${this._servmetadata_report.layers[k]['crs']}, bbox:${this._servmetadata_report.layers[k]['bbox']})`);
					}
					throw new Error(`WMS 'layernames' not configured, available: ${lylist}`);
				}				
			}

			ret = true;
			res = this.reportResult(this.layernames);
			if (res != null) {
				ret = false;
				console.error(`WMS service inner layer '${this.layernames}' not usable due to: ${res}`);				
			}

			if (GlobalConst.getDebug("WMS")) {
				console.log(`[DBG:WMS] before drawing '${this.key}'`);
			}

		} else {
			if (GlobalConst.getDebug("WMS")) {
				console.log(`[DBG:WMS] waiting on metadata for '${this.key}'`);
			}
		}

		return [ret, res];
	}
	
	static #wmsVersionNumeric(p_versionstr) {
		let ret;
		const clean = parseInt(p_versionstr.replace('.',''));
		if (clean < 100) {
			ret = clean * 10;
		} else {
			ret = clean;
		}
		return ret;
	}

	buildGetMapURL(p_mapctxt, p_terrain_bounds, p_dims) {

		let urlstr, verstr;
		if (this._servmetadata_docollect) {
			if (this._servmetadata["getmapurl"] === undefined) {
				throw new Error(`WMS layer '${this.key}', missing getmapurl, taken from metadata`);	
			}
			urlstr = this._servmetadata["getmapurl"];
			verstr = this._servmetadata["version"];
		} else {
			urlstr = this.url;
			verstr = "1.3.0";
		}

		const lyrnames_str = this.layernames.split(/[,\s]+/).join(',');
	
		const url = new URL(urlstr);
		const sp = url.searchParams;
		const crs = p_mapctxt.cfgvar["basic"]["crs"];

		const bndstr = p_terrain_bounds.join(',');

		sp.set('SERVICE', 'WMS');
		sp.set('VERSION', verstr);
		sp.set('REQUEST', 'GetMap');
		sp.set('LAYERS', lyrnames_str);

		const vers = this.constructor.#wmsVersionNumeric((verstr.replace('.', '')));
		if (vers < 130) {
			sp.set('SRS', 'EPSG:'+crs);
		} else {
			sp.set('CRS', 'EPSG:'+crs);
		}
		sp.set('BBOX', bndstr);
		sp.set('WIDTH', p_dims[0]);
		sp.set('HEIGHT', p_dims[1]);
		sp.set('FORMAT', this.imageformat);

		const ret = url.toString();		
		if (GlobalConst.getDebug("WMS")) {
			console.log(`[DBG:WMS] buildGetMapURL: '${ret}'`);
		}	
		
		return ret; 
	}
	
	* layeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims) {

		// p_mapctxt.getCanvasDims(p_dims);
		yield this.buildGetMapURL(p_mapctxt, p_terrain_env, p_dims);
	
	}

}

/*
https://servergeo.cm-porto.pt/arcgis/rest/services/BASE/ENQUADRAMENTO_BW_ComFregsPTM06/MapServer/

export?bbox=-45769.791687218014%2C163884.03511089442%2C-41083.105778479825%2C167393.47546310845&bboxSR=102161&imageSR=102161&size=1051%2C787&dpi=96&format=png32&transparent=true&layers=show%3A11%2C16%2C17&f=image
*/

export class CanvasAGSMapLayer extends CanvasRasterLayer {

	url;
	layers;
	scaledepLayers;
	imageformat = "jpg"; // png | png8 | png24 | jpg | pdf | bmp | gif | svg | svgz | emf | ps | png32

	constructor() { 
		super();
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
				if (key.toLowerCase() == 'f' && value.toLowerCase() == 'json') {
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
						this.draw2D(p_mapctx, p_lyr_order);
					}			
				}
			)

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
			console.log(`[DBG:AGSMAP] found_layers '${found_layers}' for scale 1:${sclval}`);
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
	
	* layeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims) {

		// p_mapctxt.getCanvasDims(p_dims);
		yield this.buildExportMapURL(p_mapctxt, p_terrain_env, p_dims);
	
	}

	
	
}
