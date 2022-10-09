
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

	constructor(p_paneldiv, opt_base_zindex) {

		if (p_paneldiv == null) {
			throw "Class HTML5CanvasMgr, null p_paneldiv";
		}
		this.paneldiv = p_paneldiv;

		// Cleanup DIV contents
		while (this.paneldiv.firstChild) {
			this.paneldiv.removeChild(this.paneldiv.firstChild);
		}

		let bounds = this.paneldiv.getBoundingClientRect();
		this.canvases = {};

		let keys = ['base', 'normal', 'temporary', 'transient'];
		for (let i=0; i<keys.length; i++) {

			this.canvases[keys[i]] = document.createElement('canvas');
			this.canvases[keys[i]].height = parseInt(bounds.height);
			this.canvases[keys[i]].width = parseInt(bounds.width);

			if (opt_base_zindex != null && !isNaN(opt_base_zindex)) {
				this.canvases[keys[i]].setAttribute('style', `position:absolute;top:0;left:0;z-index:${parseInt(opt_base_zindex)+i}`);
			}
			// this.canvases[keys[i]].setAttribute('id', keys[i]);
			this.canvases[keys[i]].setAttribute('width', parseInt(bounds.width));
			this.canvases[keys[i]].setAttribute('height', parseInt(bounds.height));

		}

		console.log("canvases created");
	}
	getCanvasDims() {
		let bounds = this.paneldiv.getBoundingClientRect();	
		return [bounds.width, bounds.height];
	}
}	