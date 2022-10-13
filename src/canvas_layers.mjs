
import {GlobalConst} from './constants.js';

import {Layer} from './layers.mjs';
import {CanvasStrokeSymbol} from './canvas_symbols.mjs';

class CanvasVectorLayer extends Layer {

	canvasKey = 'normal';
	constructor() {
		super();
		this.default_stroke_symbol = new CanvasStrokeSymbol();
		// this.default_fill_symbol = null;
	}	
}

class CanvasGraticuleLayer extends CanvasVectorLayer {

	separation;
	constructor() {
		super();
	}
	* items(p_mapctxt) {

		let x, crdlist, crdlist_t, out_pt=[], bounds = [], modes=['horiz', 'vert'];
		let endlimit;
		p_mapctxt.getMapBounds(bounds);

		for (let mi=0; mi < modes.length; mi++) {

			if (modes[mi] == 'vert') {
				x = this.separation * Math.floor(bounds[0] / this.separation);
				endlimit = bounds[2];
			} else {
				x = this.separation * Math.floor(bounds[1] / this.separation);
				endlimit = bounds[3];
			}

			while (x <= endlimit) {
				x = x + this.separation;
				if (modes[mi] == 'vert') {
					crdlist = [x, bounds[1], x, bounds[3]];
				} else {
					crdlist = [bounds[0], x, bounds[2], x];
				}
				crdlist_t = []
				crdlist_t.length = crdlist.length;
				for (let i=0; i<2; i++) {
					p_mapctxt.transformmgr.getCanvasPt([crdlist[2*i], crdlist[2*i+1]], out_pt)
					crdlist_t[2*i] = out_pt[0];
					crdlist_t[2*i+1] = out_pt[1];
				}

				yield crdlist_t;
			}

		}


	}

	draw2D(p_mapctxt, p_scaleval) {

		if (!this.defaultvisible) {
			return;
		}
		if (!this.checkScaleVisibility(p_scaleval)) {
			return;
		}		

		const gfctx = p_mapctxt.canvasmgr.getDrwCtx(this.canvasKey, '2d');
		gfctx.save();
		try {
			gfctx.strokeStyle = this.default_stroke_symbol.strokeStyle;
			gfctx.lineWidth = this.default_stroke_symbol.lineWidth;
			for (let elem_coords of this.items(p_mapctxt)) {
				gfctx.beginPath();
				gfctx.moveTo(elem_coords[0], elem_coords[1]);
				gfctx.lineTo(elem_coords[2], elem_coords[3]);
				gfctx.stroke();
			}
		} catch(e) {
			throw e;
		} finally {
			gfctx.restore();
		}
	}	
}

/*
class CanvasSplitterLayer extends CanvasVectorLayer {

	divnumh;
	constructor(p_divnum_w, p_divnum_h) {
		super();
	}
	* items(p_mapctxt) {

	}

	draw2D(p_mapctxt, p_scaleval) {


	}	
}
*/

class CanvasRasterLayer extends Layer {

	canvasKey = 'base';
	image_filter = "none";
	constructor() {
		super();
	}	
}

class CanvasOGCRasterLayer extends CanvasRasterLayer {

	url; // get capabilities or URL missing getcapabilities command
	layername;
	#servmetadata;
	#servmetadata_report;
	#servmetadata_report_completed = false;
	#metadata_or_root_url;
	constructor() { 
		super();
	}

	init(p_mapctx) {

		if (this.url == null || this.url.length < 1) {
			throw new Error("Class CanvasOGCRasterLayer, null or empty p_metadata_or_root_url");
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

					const parser = new DOMParser();
					//const ret = response.json();
					const xmlDoc = parser.parseFromString(responsetext, "text/xml");

					const srvc = xmlDoc.getElementsByTagName("Service")[0];
					let velem = srvc.getElementsByTagName("MaxWidth")[0].textContent;

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
					that.#servmetadata["getmapurl"] = new URL(velem.getAttributeNS("http://www.w3.org/1999/xlink", 'href'));

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

					that.reporting(cfg["crs"], bounds, dims);

				}
			)



	}

	reporting (p_crs, p_bounds, p_dims) {
		// service capabilities validation step
		
		//console.log(this.#servmetadata);
		//console.log(Object.keys(this.#servmetadata));
		this.#servmetadata_report = {};

		this.#servmetadata_report["imagewidth"] = ( parseInt(this.#servmetadata["maxw"]) >= p_dims[0] ? "ok" : "notok");
		this.#servmetadata_report["imageheight"] = ( parseInt(this.#servmetadata["maxh"]) >= p_dims[1] ? "ok" : "notok");
		this.#servmetadata_report["imageformat"] = ( this.#servmetadata["formats"].indexOf("image/png") < 0 && this.#servmetadata["formats"].indexOf("image/jpeg") < 0 ? "notok" : "ok");

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
		
		this.draw2D();
	
	}
	reportResult(p_wmsinnerlayername) {
		let res = null;
		for (let k in this.#servmetadata_report) {
			if (k == "layers") {
				continue;
			}
			if (this.#servmetadata_report[k] == "notok") {
				res = k;
				break;
			}			
		}
		if (res == null && p_wmsinnerlayername != null) {
			for (let k in this.#servmetadata_report["layers"][p_wmsinnerlayername]) {
				if (this.#servmetadata_report["layers"][p_wmsinnerlayername][k] == "notok") {
					res = `layer '${p_wmsinnerlayername}', item '${k}'`;
					break;
				}			
			}
		}
		return res;
	}
	draw2D () {
		if (this.#servmetadata_report_completed) {
			let res = this.reportResult();
			if (res != null) {
				throw new Error(`WMS service not usable due to: ${res}`);				
			}

			let othermandatory = [], missinglayername  = false;
			if (this.missing_mandatory_configs.length > 0) {
				for (let i=0; i<this.missing_mandatory_configs.length; i++) {		
					if (this.missing_mandatory_configs[i] != "layername") {
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
					throw new Error(`WMS 'layername' not configured, available: ${lylist}`);
				}				
			}

			res = this.reportResult(this.layername);
			if (res != null) {
				throw new Error(`WMS service inner layer '${this.layername}' not usable due to: ${res}`);				
			}

			if (GlobalConst.getDebug("OGCRaster")) {
				console.log(`[DBG:OGCRaster] drawing '${this.key}'`);
			}

		} else {
			if (GlobalConst.getDebug("OGCRaster")) {
				console.log(`[DBG:OGCRaster] waiting on metadata for '${this.key}'`);
			}
		}
	}
	/*readMetadata() {
		
		fetch(,
			
		);
	}*/

}


class CanvasWMSLayer extends CanvasOGCRasterLayer {

	constructor(p_metadata_url) {
		super(p_metadata_url);
	}

}

const canvas_layer_classes = {
    "graticule": CanvasGraticuleLayer,
    "wms": CanvasWMSLayer
};

export class DynamicCanvasLayer {
    constructor (p_classkey, opts) {
        return new canvas_layer_classes[p_classkey](opts);
    }
}