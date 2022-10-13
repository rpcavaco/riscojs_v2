
import {GlobalConst} from './constants.js';

export class Layer {

	minscale = GlobalConst.MINSCALE;
	maxscale = Number.MAX_SAFE_INTEGER;
	defaultvisible = true;
	#key;
	constructor() {
		this.missing_mandatory_configs = [];
	}

	checkScaleVisibility(p_scaleval) {
		return (p_scaleval >= this.minscale && p_scaleval <= this.maxscale);
	}

	/* init (p_mapctxt) {  
		an optional INIT method can perform initialization like get capabilities on OGC services
	} */

	set key(p_key) {
		this.#key = p_key;
	}
	get key() {
		return this.#key;
	}

	* items(p_mapctxt) {
		// to be extended
	}	

	draw2D(p_mapctxt, p_scaleval) {

		// to be extended
	}		
}