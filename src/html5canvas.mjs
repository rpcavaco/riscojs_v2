
/**
 * Class HTML5CanvasMgr
 * 
 * Manager class for Canvas(es) drawing.
 * An instance of this class manages four overlay canvases, for: 
 * 	a) 'base': raster drawing background 
 *  b) 'normal' vector drawing
 *  c) 'temporary' vector, like highlights
 *  d) 'transient' vectors, e.g.: mouse interaction or viewport manipulation artifacts
 *  e) 'data_viz' dataviz, charting, segmenting
 *  f) 'interactive_viz' popups 
 *  g) 'service_canvas' for servicing warnings, messages, toolwdigets
 * 
 * @param {object} p_paneldiv - Non-null reference to panel's DIV DOM object
 * @param {integer} opt_base_zindex - Optional z-index for bottom canvas
 * 
 */
 export class HTML5CanvasMgr {

	max_zindex;
	canvases;
	canvaskeys;
	featdraw_canvaskeys;

	constructor(p_mapctx, opt_base_zindex) {

		if (p_mapctx == null) {
			throw new Error("Class HTML5CanvasMgr, null p_paneldiv");
		}
		this.paneldiv = p_mapctx.panelwidget;

		let base_zindex = 1;
		if (opt_base_zindex != null && !isNaN(opt_base_zindex)) {
			base_zindex = parseInt(opt_base_zindex);
		}

		// Cleanup DIV contents
		while (this.paneldiv.firstChild) {
			this.paneldiv.removeChild(this.paneldiv.firstChild);
		}

		this.canvases = {};
		this.max_zindex = 0;

		this.canvaskeys = ['base', 'normal', 'label', 'temporary', 'transientmap', 'data_viz', 'interactive_viz',  'service_canvas', 'transientviz', 'overlay_canvas'];
		this.featdraw_canvaskeys = ['normal', 'label'];
		for (let i=0; i<this.canvaskeys.length; i++) {

			this.canvases[this.canvaskeys[i]] = document.createElement('canvas');
			this.canvases[this.canvaskeys[i]].style.position = "absolute";
			this.canvases[this.canvaskeys[i]].style.top = 0;
			this.canvases[this.canvaskeys[i]].style.left = 0;

			this.canvases[this.canvaskeys[i]].style.zIndex = base_zindex+i;
			this.max_zindex = Math.max(this.max_zindex, base_zindex+i);

			// this.canvases[keys[i]].setAttribute('id', keys[i]);
			this.paneldiv.appendChild(this.canvases[this.canvaskeys[i]]);
		}

		const readfreq_canvaskeys = ['base', 'normal', 'label', 'temporary'];
		for (let ctx, i=0; i<readfreq_canvaskeys.length; i++) {
			ctx = this.canvases[readfreq_canvaskeys[i]].getContext('2d', { willReadFrequently: true });
		}

		this.init();

		console.info("[init RISCO] canvases created");
	}

	getTopCanvas() {
		return this.canvases[this.canvaskeys[this.canvaskeys.length-1]]
	}

	getMaxZIndex() {
		return this.max_zindex;
	}

	/**
	 * Method init
	 * Initialization of  Canvas(es) manager or reset
	 */
	init() {

		const bounds = this.paneldiv.getBoundingClientRect();

		const w = parseInt(bounds.width);
		const h = parseInt(bounds.height);

		//const dpr = 1.0;

		for (let i=0; i<this.canvaskeys.length; i++) {

			this.canvases[this.canvaskeys[i]].setAttribute('width', w);
			this.canvases[this.canvaskeys[i]].setAttribute('height', h);
			this.canvases[this.canvaskeys[i]].width = w;
			this.canvases[this.canvaskeys[i]].height = h;

		}

	}
	
	clearAll(p_ckeys) {

		//console.log("   CLEAR ALL", p_ckeys);

		let keys;
		if (p_ckeys) {
			keys = p_ckeys;
		} else {
			keys = this.canvaskeys;
		}

		for (const ck of keys) {

			if (ck == null) {
				continue;
			}
			/* if (ck == 'base') {
				continue;
			} */
			let dims = [];
			this.getCanvasDims(dims);

			const gfctx = this.getDrwCtx(ck, '2d');
			// console.log("clear ck:", ck);
			gfctx.clearRect(0, 0, ...dims); 
		}		
	}

	/**
	 * Method getCanvasDims
	 * @param {float} out_pt - Out parameter: array of width x height 
	 */
	getCanvasDims(out_dims) {
		let bounds = this.paneldiv.getBoundingClientRect();	
		out_dims.length = 2;
		out_dims[0] = parseInt(bounds.width);
		out_dims[1] = parseInt(bounds.height);
	}
	/**
	 * Method getCanvasCenter
	 * @param {float} out_pt - Out parameter: array of coordinates for a canvas point 
	 */
	getCanvasCenter(out_pt) {
		let bounds = this.paneldiv.getBoundingClientRect();	

		out_pt.length = 2;
		out_pt[0] = Math.round(bounds.width/2.0);
		out_pt[1] = Math.round(bounds.height/2.0);
	}	
	/**
	 * Method getDrwCtx
	 * @param {string} p_canvaskey - Canvas key
	 * @param {string} opt_dims - Optional '2d' (default) or else for WebGL 
	 * @returns {object} drawing context
	 */
	getDrwCtx(p_canvaskey, opt_dims, opt_readfrequently) {
		if (this.canvases[p_canvaskey] === undefined) {
			throw new Error(`Class HTML5CanvasMgr, getDrawingContext, found no canvas for ${p_canvaskey}`);
		}
		let dims = '2d';
		if (opt_dims) {
			dims = opt_dims;
		}
		if (opt_readfrequently) {
			return this.canvases[p_canvaskey].getContext(dims, { willReadFrequently: true });
		} else {
			return this.canvases[p_canvaskey].getContext(dims);
		}
	}	

	getRenderedBitmaps(out_dict) {
		const canvaskeys = ['base', 'normal', 'label', 'temporary'], dims=[];
		this.getCanvasDims(dims);
		for (let ctx, i=0; i<canvaskeys.length; i++) {
			ctx = this.canvases[canvaskeys[i]].getContext('2d');
			try {
				out_dict[canvaskeys[i]] = ctx.getImageData(0, 0, ...dims);
			} catch(e) {
				console.error(` ... affected canvas key: ${canvaskeys[i]}`);
				console.error(e);
			}
		}
	}


	/**
	 * 
	 * @param {*} p_imgdata_dict 
	 * @param {*} pt_ins_scrcoords 
	 * @param {*} opt_img_dims se null, todo o canvas será limpo
	 */
	putImages(p_imgdata_dict, p_pt_ins_scrcoords, opt_img_dims) {
		let ctx;
		const dims=[];
		for (const key in p_imgdata_dict) {
			ctx = this.canvases[key].getContext('2d');
			if (opt_img_dims) {
				ctx.clearRect(...p_pt_ins_scrcoords, ...opt_img_dims); 
			} else {
				this.getCanvasDims(dims);
				ctx.clearRect(0, 0, ...dims); 
			}
			ctx.putImageData(p_imgdata_dict[key], ...p_pt_ins_scrcoords);
		}
	}

	/**
	 * 
	 * @param {*} p_imgdata_dict 
	 * @param {*} pt_ins_scrcoords 
	 * @param {*} opt_img_dims se null, todo o canvas será limpo
	 */
	putTransientImages(p_imgdata_dict, p_scale, p_mouseevt) {
		let ctx, x, y;
		const dims=[];
		for (const key in p_imgdata_dict) {
			ctx = this.canvases[key].getContext('2d');
			this.getCanvasDims(dims);
			ctx.clearRect(0, 0, ...dims); 
			if (p_scale != null) {
				const f = (function(pp_scale) {
					return function(bmp) {

						ctx.save();

						if (p_mouseevt.offsetX == 0) {
							x = p_mouseevt.clientX;
							y = p_mouseevt.clientY;
						} else {
							x = p_mouseevt.offsetX;
							y = p_mouseevt.offsetY;
						}

						const divw =  x / p_imgdata_dict[key].width;
						const divh =  y / p_imgdata_dict[key].height;
						const ox = (x - (p_imgdata_dict[key].width * pp_scale * divw)) / pp_scale;
						const oy = (y - (p_imgdata_dict[key].height * pp_scale * divh)) / pp_scale;

						ctx.scale(pp_scale, pp_scale);
						ctx.drawImage(bmp, ox, oy);

						ctx.restore();	
					}
				})(p_scale);

				createImageBitmap(p_imgdata_dict[key]).then(f);
			}
		}
	}	
}	

