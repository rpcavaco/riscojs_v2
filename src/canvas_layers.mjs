
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
	#servmetadata;
	#metadata_or_root_url;
	constructor() { 
		super();
	}

	init() {

		if (this.url == null || this.url.length < 1) {
			throw new Error("Class CanvasOGCRasterLayer, null or empty p_metadata_or_root_url");
		}

		this.#servmetadata = {};
		this.#metadata_or_root_url = new URL(this.url);

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
				function(responsetext, servmetadata) {

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

					let lname, ly;
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

					}
				}
			)
	}

	draw2D () {
		console.log("drawing ...")
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