
import {GlobalConst} from './constants.js';

export class Layer {

	minscale = GlobalConst.MINSCALE;
	maxscale = Number.MAX_SAFE_INTEGER;
	defaultvisible = true;
	#key;

	checkScaleVisibility(p_scaleval) {
		return (p_scaleval >= this.minscale && p_scaleval <= this.maxscale);
	}

	/* init () {  
		an optional INIT method can perform initialization like get capabilities on OGC services
	} */

	setKey(p_key) {
		this.#key = p_key;
	}
	getKey() {
		return this.#key;
	}

	* items(p_mapctxt) {
		// to be extended
	}	

	draw2D(p_mapctxt, p_scaleval) {

		// to be extended
	}		
}