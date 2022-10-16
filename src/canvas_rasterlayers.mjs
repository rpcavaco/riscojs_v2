
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

class CanvasRasterLayer extends RasterLayer {

	canvasKey = 'base';
	image_filter = "none";
	constructor() {
		super();
	}	

	drawitem2D(p_mapctxt, p_gfctx, p_terrain_env, p_scr_env, p_dims, p_envkey, p_raster_url, p_lyrorder) {

		const img = new Image();
		img.crossOrigin = "anonymous";

		if (this.rastersloading[p_envkey] === undefined) {
			this.rastersloading[p_envkey] = {};
		}

		const raster_id = uuidv4();

		(function(pp_mapctxt, p_this, p_img, pp_scr_env, pp_dims, pp_envkey, p_raster_id) {
			p_img.onload = function() {

				p_gfctx.save();
				try {
					//console.log(">>   ", p_img.width, p_img.height, pp_envkey);
					//console.log(">>2>>", pp_scr_env[0], pp_scr_env[3], pp_dims);
					//p_gfctx.clearRect(pp_scr_env[0], pp_scr_env[3], ...pp_dims);

					//console.log("######", p_lyrorder, "<<<<< lyr ord <<<<<<");

					let img_pre, img_pre_data, img_pos, img_pos_data, pixels;
					
					if (p_lyrorder > 0 && this.blend) {
						console.log("blending!!");
						img_pre = p_gfctx.getImageData(pp_scr_env[0], pp_scr_env[3], ...pp_dims);
						img_pre_data = img_pre.data;						
					}


					p_gfctx.drawImage(p_img, pp_scr_env[0], pp_scr_env[3]);

					if (p_lyrorder > 0 && this.blend) {
						img_pos = p_gfctx.getImageData(pp_scr_env[0], pp_scr_env[3], ...pp_dims);
						img_pos_data = img_pos.data;
						
						while (pixels--) {
							img_pre_data[pixels] = img_pre_data[pixels] * 0.5 + img_pos_data[pixels] * 0.5;
						}
						img_pre.data = img_pre_data;
						p_gfctx.putImageData(img_pre, 0, 0);						
					}

					if (p_this.filter == 'grayscale') {
						toGrayScaleImgFilter(p_gfctx, p_img, pp_scr_env[0], pp_scr_env[3], ...pp_dims);
					}

					//processHDREffect(gfctx, [0,0], pp_dims)
				} catch(e) {
					throw e;
				} finally {
					p_gfctx.restore();

					delete p_this.rastersloading[pp_envkey][p_raster_id];
					// console.log(`(rstrs still loading at t1 x ${p_envkey}):`, Object.keys(p_this.rastersloading[p_envkey]));
				}
	
			}
		})(p_mapctxt, this, img, p_scr_env.slice(0), p_dims.slice(0), p_envkey, raster_id);
		
		img.src = p_raster_url;

		// console.log(`(rstrs on loading at t0 x ${p_envkey}):`, Object.keys(this.rastersloading[p_envkey]));

		for (let rstrid in this.rastersloading[p_envkey]) {
			this.rastersloading[p_envkey][rstrid].src = "";
			delete this.rastersloading[p_envkey][rstrid];
		} 
		this.rastersloading[p_envkey][raster_id] = img;

		return true;

	}	
	
}

export class CanvasWMSLayer extends CanvasRasterLayer {

	url; // get capabilities or URL missing getcapabilities command
	layernames;
	imageformat = "image/jpeg";
	reuseurl = false;

	#servmetadata;
	#servmetadata_report;
	#servmetadata_report_completed = false;
	#metadata_or_root_url;

	constructor() { 
		super();
	}

	isInited() {
		return this.#servmetadata_report_completed;
	}

	// Why passing Map context to this method if this layer has it as a field ?
	// The reason is: it is not still available at this stage; it will be availabe later to subsequent drawing ops
	initLayer(p_mapctx, p_lyr_order) {

		if (GlobalConst.getDebug("WMS")) {
			console.log(`[DBG:WMS] Layer '${this.key}' is in INIT`);
		}
		
		if (this.url == null || this.url.length < 1) {
			throw new Error("Class CanvasWMSLayer, null or empty p_metadata_or_root_url");
		}

		this.#servmetadata = {};
		this.#metadata_or_root_url = new URL(this.url);

		const bounds = [], dims=[];
		p_mapctx.getMapBounds(bounds);
		const cfg = p_mapctx.cfgvar["basic"]; 
		p_mapctx.getCanvasDims(dims);

		if (this.#metadata_or_root_url) {
			const sp = this.#metadata_or_root_url.searchParams;
			const checkitems = {
				"service_wms": false,
				"req_getcapabilities": false
			}

			for (const [key, value] of sp.entries()) {
				if (key.toLowerCase() == 'service' && value.toLowerCase() == 'wms') {
					checkitems["service_wms"] = true;
				}
				if (key.toLowerCase() == 'request' && value.toLowerCase() == 'getcapabilities') {
					checkitems["req_getcapabilities"] = true;
				}
			}

			if (!checkitems["service_wms"]) {
				sp.append('service', 'wms');
			}
			if (!checkitems["req_getcapabilities"]) {
				sp.append('request', 'getcapabilities');
			}
		} 
		
		const that = this;

		fetch(this.#metadata_or_root_url.toString())
			.then(response => response.text())
			.then(
				function(responsetext) {

					if (GlobalConst.getDebug("WMS")) {
						console.log(`[DBG:WMS] Layer '${that.key}' metadata arrived, viability check starting`);
					}

					const parser = new DOMParser();
					//const ret = response.json();
					const xmlDoc = parser.parseFromString(responsetext, "text/xml");

					let velem = xmlDoc.activeElement.getAttribute("version");
					that.#servmetadata["version"] = velem;

					const srvc = xmlDoc.getElementsByTagName("Service")[0];
					velem = srvc.getElementsByTagName("MaxWidth")[0].textContent;

					that.#servmetadata["maxw"] = velem;
					velem = srvc.getElementsByTagName("MaxHeight")[0].textContent;
					that.#servmetadata["maxh"] = velem;

					that.#servmetadata["formats"] = [];

					const getmap = xmlDoc.querySelector("Capability Request GetMap");
					velem = getmap.getElementsByTagName("Format");
					for (let fi=0; fi<velem.length; fi++) {
						that.#servmetadata["formats"].push(velem[fi].textContent);
					}

					velem = getmap.querySelector("DCPType HTTP Get OnlineResource");

					if (that.reuseurl) {
						that.#servmetadata["getmapurl"] = that.url;
					} else {
						that.#servmetadata["getmapurl"] = velem.getAttributeNS("http://www.w3.org/1999/xlink", 'href');
					}

					// console.log("that.#servmetadata['getmapurl']:", that.#servmetadata["getmapurl"]);

					const lyrs = xmlDoc.querySelectorAll("Capability Layer");
					that.#servmetadata["layers"] = {}

					let lname, ly, k;
					for (let li=0; li<lyrs.length; li++) {

						ly = lyrs[li];
						lname = ly.querySelector("Name").textContent;
						that.#servmetadata["layers"][lname] = {}
						velem = ly.querySelector("Abstract")
						if (velem) {
							that.#servmetadata["layers"][lname]["abstract"] = velem.textContent;
						}
						
						velem = ly.querySelectorAll("CRS");
						if (velem.length>0) {
							that.#servmetadata["layers"][lname]["crs"] = [];
							for (let crsi=0; crsi<velem.length; crsi++) {
								that.#servmetadata["layers"][lname]["crs"].push(velem[crsi].textContent);
							}							
						}

						velem = ly.querySelectorAll("BoundingBox");
						if (velem.length>0) {
							that.#servmetadata["layers"][lname]["bbox"] = {};
							for (let crsi=0; crsi<velem.length; crsi++) {
								k = velem[crsi].getAttribute('CRS').replace("EPSG:", "");
								that.#servmetadata["layers"][lname]["bbox"][k] = [velem[crsi].getAttribute('minx'), velem[crsi].getAttribute('miny'), velem[crsi].getAttribute('maxx'), velem[crsi].getAttribute('maxy')];
							}							
						}
					}

					that.reporting(p_mapctx, cfg["crs"], bounds, dims, p_lyr_order);				

				}
			)

		this.draw2D(p_mapctx, p_lyr_order);

	}

	reporting (p_mapctxt, p_crs, p_bounds, p_dims, p_lyr_order) {
		// service capabilities validation step
		
		this.#servmetadata_report = {};

		this.#servmetadata_report["imagewidth"] = ( parseInt(this.#servmetadata["maxw"]) >= p_dims[0] ? "ok" : "notok");
		this.#servmetadata_report["imageheight"] = ( parseInt(this.#servmetadata["maxh"]) >= p_dims[1] ? "ok" : "notok");
		this.#servmetadata_report["imageformat"] = ( this.#servmetadata["formats"].indexOf(this.imageformat) < 0 ? "notok" : "ok");

		this.#servmetadata_report["layers"] = {}

		let lname, ly, ret, bb;
		for (lname in this.#servmetadata["layers"]) {

			ly = this.#servmetadata["layers"][lname];
			this.#servmetadata_report["layers"][lname] = {};
			
			this.#servmetadata_report["layers"][lname]["crs"] = ( ly["crs"].indexOf(p_crs) < 0 ? "ok" : "notok");

			if (this.#servmetadata["layers"][lname]["abstract"] !== undefined) {
				this.#servmetadata_report["layers"][lname]["abstract"] = this.#servmetadata["layers"][lname]["abstract"];
			}

			if (this.#servmetadata["layers"][lname]["bbox"][p_crs] !== undefined) {
				bb = this.#servmetadata["layers"][lname]["bbox"][p_crs];
				this.#servmetadata_report["layers"][lname]["bbox"] = (p_bounds[0] >= bb[0] && p_bounds[1] >= bb[1] && p_bounds[2] <= bb[2] && p_bounds[3] <= bb[3] ? "ok" : "notok");
			}
		}
		this.#servmetadata_report_completed = true;

		const [viable, errormsg] = this.checkGetMapRequestViability();

		if (GlobalConst.getDebug("WMS")) {
			if (viable) {
				console.log(`[DBG:WMS] Layer '${this.key}' viability checked OK, before drawing`);
			} else {
				console.log(`[DBG:WMS] Layer '${this.key}' metadata did not check OK, drawing skipped`);
			}
		}

		if (!viable) {
			return;
		}

		this.draw2D(p_mapctxt, p_lyr_order);
	
	}

	reportResult(p_wms_innerlyrnames_str) {

		let splits=[], res = null;
		for (let k in this.#servmetadata_report) {
			if (k == "layers") {
				continue;
			}
			if (this.#servmetadata_report[k] == "notok") {
				res = k;
				break;
			}			
		}
		
		if (res == null && p_wms_innerlyrnames_str != null && p_wms_innerlyrnames_str.length > 0) {

			splits = p_wms_innerlyrnames_str.split(/[,\s]+/);
			for (let k of splits) {
				if (this.#servmetadata_report["layers"][p_wms_innerlyrnames_str][k] == "notok") {
					res = `layer '${p_wms_innerlyrnames_str}', item '${k}'`;
					break;
				}			
			}
		}
		return res;
	}

	checkGetMapRequestViability() {
		let ret = false, res="";

		if (this.#servmetadata_report_completed) {

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
					for (const k in this.#servmetadata_report.layers) {
						lylist.push(`'${k}' (crs:${this.#servmetadata_report.layers[k]['crs']}, bbox:${this.#servmetadata_report.layers[k]['bbox']})`);
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

		if (this.#servmetadata["getmapurl"] === undefined) {
			throw new Error(`WMS layer '${this.key}', missing getmapurl, taken from metadata`);	
		}

		const lyrnames_str = this.layernames.split(/[,\s]+/).join(',');
	
		const url = new URL(this.#servmetadata["getmapurl"]);
		const sp = url.searchParams;
		const crs = p_mapctxt.cfgvar["basic"]["crs"];

		const bndstr = p_terrain_bounds.join(',');

		sp.set('SERVICE', 'WMS');
		sp.set('VERSION', this.#servmetadata["version"]);
		sp.set('REQUEST', 'GetMap');
		sp.set('LAYERS', lyrnames_str);

		const vers = this.constructor.#wmsVersionNumeric((this.#servmetadata["version"].replace('.', '')));
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
	imageformat = "jpg"; // png | png8 | png24 | jpg | pdf | bmp | gif | svg | svgz | emf | ps | png32

	constructor() { 
		super();
	}

	buildExportMapURL(p_mapctxt, p_terrain_bounds, p_dims) {

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
		sp.set('layers', this.layers);
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
