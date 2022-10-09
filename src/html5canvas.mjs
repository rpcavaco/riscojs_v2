
/**
 * Class HTML5CanvasMgr
 * 
 * Manager class for Canvas(es) drawing.
 * An instance of this class manages four overlay canvases, for: 
 * 	a) 'base': raster drawing background 
 *  b) 'normal' vector drawing
 *  c) 'temporary' vector, like highlights
 *  d) 'transient' vectors, e.g.: mouse interaction or viewport manipulation artifacts
 * 
 * @param {object} p_paneldiv - Non-null reference to panel's DIV DOM object
 * @param {integer} opt_base_zindex - Optional z-index for bottom canvas
 * 
 */
 export class HTML5CanvasMgr {

	constructor(p_mapctx, opt_base_zindex) {

		if (p_mapctx == null) {
			throw "Class HTML5CanvasMgr, null p_paneldiv";
		}
		this.paneldiv = p_mapctx.panelwidget;

		// Cleanup DIV contents
		while (this.paneldiv.firstChild) {
			this.paneldiv.removeChild(this.paneldiv.firstChild);
		}

		this.canvases = {};

		let keys = ['base', 'normal', 'temporary', 'transient'];
		for (let i=0; i<keys.length; i++) {

			this.canvases[keys[i]] = document.createElement('canvas');
			this.canvases[keys[i]].style.position = "absolute";
			this.canvases[keys[i]].style.top = 0;
			this.canvases[keys[i]].style.left = 0;

			if (opt_base_zindex != null && !isNaN(opt_base_zindex)) {
				this.canvases[keys[i]].style.zIndex = parseInt(opt_base_zindex)+i;
			}
			// this.canvases[keys[i]].setAttribute('id', keys[i]);
			this.paneldiv.appendChild(this.canvases[keys[i]]);
		}

		this.init();

		// Attech ancestor DIV resize event to init() method
		(function(p_paneldiv, p_this, pp_mapctx) { 
			p_paneldiv.addEventListener("resize", function(e) { console.log("konichiwa!") }); 
			//pp_mapctx.mapPanelWasResized();
		})(this.paneldiv, this, p_mapctx);

		console.log("canvases created");
	}

	/**
	 * Method init
	 * Initialization of  Canvas(es) manager or reset
	 */
	init() {

		let bounds = this.paneldiv.getBoundingClientRect();

		let keys = ['base', 'normal', 'temporary', 'transient'];
		for (let i=0; i<keys.length; i++) {
			this.canvases[keys[i]].setAttribute('width', parseInt(bounds.width));
			this.canvases[keys[i]].setAttribute('height', parseInt(bounds.height));
		}

	}	

	/**
	 * Method setCenter
	 * Define center of map from terrain coordinates
	 * @param {float} p_cx 
	 * @param {float} p_cy 
	 */
	 getCanvasDims() {
		let bounds = this.paneldiv.getBoundingClientRect();	
		return [bounds.width, bounds.height];
	}
}	