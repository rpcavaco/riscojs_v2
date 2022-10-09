
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
 * 
 */
 export class HTML5CanvasMgr {

	constructor(p_paneldiv) {

		if (p_paneldiv == null) {
			throw "Class HTML5CanvasMgr, null p_paneldiv";
		}
		
		// Cleanup DIV contents
		while (p_paneldiv.firstChild) {
			p_paneldiv.removeChild(p_paneldiv.firstChild);
		}

		let bounds = p_paneldiv.getBoundingClientRect();
		this.canvases = {};

		let keys = ['base', 'normal', 'temporary', 'transient'];
		for (let i=0; i<keys.length; i++) {

			this.canvases[keys[i]] = document.createElement('canvas');
			this.canvases[keys[i]].height = parseInt(bounds.height);
			this.canvases[keys[i]].width = parseInt(bounds.width);

		}

		console.log("canvases created");

		


	}
}