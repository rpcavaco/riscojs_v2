
class Layer {

	minscale = 0;
	maxscale = Number.MAX_SAFE_INTEGER;
	defaultvisible = true;
	checkScaleVisibility(p_scaleval) {
		return (p_scaleval >= this.minscale && p_scaleval <= this.maxscale);
	}
	* items(p_mapctxt) {
		// to be extended
	}	

	draw2D(p_mapctxt, p_scaleval) {

		// to be extended
	}		
}

class VectorLayer extends Layer {

	canvasKey = 'normal';
	constructor() {
		super();
	}	

		
}

class GraticuleLayer extends VectorLayer {

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
			gfctx.strokeStyle = 'white';
			gfctx.lineWidth = 1;
			for (let elem_coords of this.items(p_mapctxt)) {
				console.log(elem_coords);
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
class RasterLayer extends Layer {

	//super(false);
}
*/

export class TOCManager {
	
	layers = [];
	constructor(p_mapctx, p_layers_config) {
		this.mapctx = p_mapctx;
		this.initLayersFromConfig(p_layers_config);
	}
	static readLayerConfigItem(p_lyrob, p_configvar, p_layerkey, p_itemname) {
		if (p_configvar.lorder[p_layerkey][p_itemname] !== undefined) {	
			p_lyrob[p_itemname]	= p_configvar.lorder[p_layerkey][p_itemname];
		}
	}

	initLayersFromConfig(p_configvar) {

		let currentLayer = [];
		let items;

		this.layers.length = 0;

		for (let lyk, i=0; i < p_configvar.lorder.length; i++) {


			lyk = p_configvar.lorder[i];
			if (p_configvar.layers[lyk] !== undefined) {

					
				if (p_configvar.layers[lyk]["type"] !== undefined) {

					switch (p_configvar.layers[lyk]["type"]) {
					
						case "graticule":

							currentLayer.push(new GraticuleLayer());
							
					}

					if (currentLayer.length == 0) {
						throw new Error(`TOCManager, layer '${lyk}' type not known: '${p_configvar.lorder[lyk]["type"]}'`);
					}

					items = Object.keys(currentLayer[0]);
					for (let ii=0; ii < items.length; ii++) {
						
						if (p_configvar.layers[lyk][items[ii]] !== undefined) {
							currentLayer[0][items[ii]] = p_configvar.layers[lyk][items[ii]];
						} else {
							// item has no default value
							if (currentLayer[0][items[ii]] == null) {
								throw new Error(`TOCManager, layer '${lyk}' config is missing mandatory item '${items[ii]}'`);
							}
						}

						// console.log("item:", items[ii], currentLayer[items[ii]], currentLayer[items[ii]] === undefined, currentLayer[items[ii]] == null);
					}

					this.layers.push(currentLayer[0]);
					currentLayer.length = 0;

					console.log(`TOCManager, layer '${lyk}' (${currentLayer.constructor.name}) prepared`);

				} else {
					console.warn(`TOCManager, layer with key '${lyk}' has no type, cannot be read.`);
				}

			} else {
				console.warn(`TOCManager, no layer with key '${lyk}' found in config.`);
			}
		}

		console.log("TOCManager, layers init finished");
	}

	draw(p_scaleval) {
		console.log("TOCManager draw, layers: ", this.layers.length);
		for (let li=0; li < this.layers.length; li++) {

			this.layers[li].draw2D(this.mapctx, p_scaleval);
		}
	}

}