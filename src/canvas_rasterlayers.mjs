
import {GlobalConst} from './constants.js';
// import {processHDREffect} from './canvas_utils.mjs';

import {RasterLayer} from './layers.mjs';


class CanvasRasterLayer extends RasterLayer {

	canvasKey = 'base';
	image_filter = "none";
	constructor(p_mapctxt) {
		super(p_mapctxt);
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
	constructor(p_mapctxt) { 
		super(p_mapctxt);
		console.log("CanvasWMSLayer_", p_mapctxt);
		this.inited = false;
	}

	initLayer() {

		console.log("######## INIT LAYER #########", this.mapctx);

		if (this.url == null || this.url.length < 1) {
			throw new Error("Class CanvasWMSLayer, null or empty p_metadata_or_root_url");
		}

		this.#servmetadata = {};
		this.#metadata_or_root_url = new URL(this.url);

		const bounds = [], dims=[];
		this.mapctx.getMapBounds(bounds);
		const cfg = this.mapctx.cfgvar["basic"]; 
		this.mapctx.getCanvasDims(dims);

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

					console.log("RESPONSE ARRIVED !!!!!!")

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

					console.log("that.#servmetadata['getmapurl']:", that.#servmetadata["getmapurl"]);

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

					that.reporting(this.mapctx, cfg["crs"], bounds, dims);

				}
			)


		console.log("######## finsish INIT LAYER #########");

		this.draw2D();

	}

	reporting (p_mapctxt, p_crs, p_bounds, p_dims) {
		// service capabilities validation step
		
		//console.log(this.#servmetadata);
		//console.log(Object.keys(this.#servmetadata));
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
		
		this.draw2D(p_mapctxt);
	
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
		let ret = false;

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

			res = this.reportResult(this.layernames);
			if (res != null) {
				throw new Error(`WMS service inner layer '${this.layernames}' not usable due to: ${res}`);				
			}

			if (GlobalConst.getDebug("WMS")) {
				console.log(`[DBG:WMS] before drawing '${this.key}'`);
			}
			ret = true;

		} else {
			if (GlobalConst.getDebug("WMS")) {
				console.log(`[DBG:WMS] waiting on metadata for '${this.key}'`);
			}
		}

		return ret;
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
	
	/*
	* envs(p_mapctxt) {

		const terrain_bounds = [], out_pt=[], scr_bounds = null; //scr_bounds=[];
		p_mapctxt.getMapBounds(terrain_bounds);

		scr_bounds.length = 4;
		for (let i=0; i<2; i++) {
			p_mapctxt.transformmgr.getCanvasPt([terrain_bounds[2*i], terrain_bounds[2*i+1]], out_pt)
			scr_bounds[2*i] = out_pt[0];
			scr_bounds[2*i+1] = out_pt[1];
		}

		yield [terrain_bounds, scr_bounds];
	} */

	* items(p_mapctxt, p_terrain_env, p_scr_env, p_dims) {

		p_mapctxt.getCanvasDims(p_dims);
		return this.buildGetMapURL(p_mapctxt, p_terrain_env, p_dims);
	
	}

	drawitem2D(p_mapctxt, p_gfctx, p_terrain_env, p_scr_env, p_dims, p_raster_url) {

		const img = new Image();
		img.crossOrigin = "anonymous";
		(function(pp_mapctxt, p_this, p_img, p_dims) {
			p_img.onload = function() {

				const gfctx = pp_mapctxt.canvasmgr.getDrwCtx(p_this.canvasKey);
				gfctx.save();
				try {
					gfctx.clearRect(0, 0, ...p_dims);
					gfctx.drawImage(p_img, 0, 0);

					//processHDREffect(gfctx, [0,0], p_dims)
				} catch(e) {
					throw e;
				} finally {
					gfctx.restore();
				}
	
			}
		})(p_mapctxt, this, img, p_dims);

		img.src = p_raster_url;

		return true;

	}	
	


/*	
	draw2D(p_mapctxt) {

		if (!this.defaultvisible) {
			return;
		}
		if (!this.checkScaleVisibility(p_mapctxt.getScale())) {
			return;
		}

		if (!this.checkGetMapRequestViability()) {
			return;
		}

		const dims = [];
		p_mapctxt.getCanvasDims(dims);
		const getmapurl = this.buildGetMapURL(p_mapctxt, dims);

		const img = new Image();
		img.crossOrigin = "anonymous";
		(function(pp_mapctxt, p_this, p_img, p_dims) {
			p_img.onload = function() {

				const gfctx = pp_mapctxt.canvasmgr.getDrwCtx(p_this.canvasKey);
				gfctx.save();
				try {
					gfctx.clearRect(0, 0, ...p_dims);
					gfctx.drawImage(p_img, 0, 0);

					//processHDREffect(gfctx, [0,0], p_dims)
				} catch(e) {
					throw e;
				} finally {
					gfctx.restore();
				}
	
			}
		})(p_mapctxt, this, img, dims)

		img.src = getmapurl;


	}
*/

}

