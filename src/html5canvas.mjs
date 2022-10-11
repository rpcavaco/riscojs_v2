
/**
 * Class HTML5CanvasMgr
 * 
 * Manager class for Canvas(es) drawing.
 * An instance of this class manages four overlay canvases, for: 
 * 	a) 'base': raster drawing background 
 *  b) 'normal' vector drawing
 *  c) 'temporary' vector, like highlights
 *  d) 'transient' vectors, e.g.: mouse interaction or viewport manipulation artifacts
 *  e) 'service' for servicing warnings and messages
 * 
 * @param {object} p_paneldiv - Non-null reference to panel's DIV DOM object
 * @param {integer} opt_base_zindex - Optional z-index for bottom canvas
 * 
 */
 export class HTML5CanvasMgr {

	constructor(p_mapctx, opt_base_zindex) {

		if (p_mapctx == null) {
			throw new Error("Class HTML5CanvasMgr, null p_paneldiv");
		}
		this.paneldiv = p_mapctx.panelwidget;

		// Cleanup DIV contents
		while (this.paneldiv.firstChild) {
			this.paneldiv.removeChild(this.paneldiv.firstChild);
		}

		this.canvases = {};

		this.canvaskeys = ['base', 'normal', 'temporary', 'transient', 'service'];
		for (let i=0; i<this.canvaskeys.length; i++) {

			this.canvases[this.canvaskeys[i]] = document.createElement('canvas');
			this.canvases[this.canvaskeys[i]].style.position = "absolute";
			this.canvases[this.canvaskeys[i]].style.top = 0;
			this.canvases[this.canvaskeys[i]].style.left = 0;

			if (opt_base_zindex != null && !isNaN(opt_base_zindex)) {
				this.canvases[this.canvaskeys[i]].style.zIndex = parseInt(opt_base_zindex)+i;
			}
			// this.canvases[keys[i]].setAttribute('id', keys[i]);
			this.paneldiv.appendChild(this.canvases[this.canvaskeys[i]]);
		}

		this.init();

		console.log("[init RISCO] canvases created");
	}

	/**
	 * Method init
	 * Initialization of  Canvas(es) manager or reset
	 */
	init() {

		let bounds = this.paneldiv.getBoundingClientRect();

		for (let i=0; i<this.canvaskeys.length; i++) {
			this.canvases[this.canvaskeys[i]].setAttribute('width', parseInt(bounds.width));
			this.canvases[this.canvaskeys[i]].setAttribute('height', parseInt(bounds.height));
		}

	}	

	/**
	 * Method getCanvasDims
	 * @param {float} out_pt - Out parameter: array of width x height 
	 */
	getCanvasDims(out_dims) {
		let bounds = this.paneldiv.getBoundingClientRect();	
		out_dims.length = 2;
		out_dims[0] = bounds.width;
		out_dims[1] = bounds.height;
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
	getDrwCtx(p_canvaskey, opt_dims) {
		if (this.canvases[p_canvaskey] === undefined) {
			throw new Error(`Class HTML5CanvasMgr, getDrawingContext, found no canvas for ${p_canvaskey}`);
		}

		return this.canvases[p_canvaskey].getContext(opt_dims);
	}	

}	

