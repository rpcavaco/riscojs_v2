import {HTML5CanvasMgr} from './html5canvas.mjs';
import {Transform2DMgr} from './transformations.mjs';
import {ToolManager} from './interactions.mjs';
import {TOCManager} from './toc.mjs';

/**
 * Class RiscoMapOverlay
 * 
 * Overlaying or stacking of more than one RiscoMap context
 * 
 * @param {string} p_paneldiv_id 	- Id of HTML DIV element to act as RiscoJS map panel
 * 
 */
export class RiscoMapOverlay {

	constructor(p_paneldiv_id) {

		if (p_paneldiv_id == null) {
			throw new Error("Class RiscoMapOverlay, null paneldiv_id");
		}		

		this.panelwidget = document.getElementById(p_paneldiv_id);
		if (this.panelwidget == null) {
			throw new Error(`Class RiscoMapOverlay, panel widget search, no div found with for id ${p_paneldiv_id}`);
		}		
		if (this.panelwidget.tagName.toLowerCase() != 'div') {
			throw new Error(`Class RiscoMapOverlay, panel widget must be DIV, not ${this.panelwidget.tagName}`);
		}	

		this.mapcontexts = {};
		// Attach resizing method to window resize event
		(function(p_mapovrly) {
			addEventListener("resize", function(e) { 
				let mapctx;
				for (let key in p_mapovrly.mapcontexts) { 
					if (p_mapovrly.mapcontexts.hasOwnProperty(key)) {
						mapctx = p_mapovrly.mapcontexts[key];
						mapctx.resize();
					}
				}
			 }); 
		})(this);			
	}


	/**
	 * Method newMapCtx
	 * Create new map context attached to this overlay
	 * @param {object} p_config_var - Variable object containing configuration JSON dictionary
	 * @param {string} p_ctx_id - Identification of this context
	 * @returns - the context just created
	 */
	newMapCtx(p_config_var, p_ctx_id, b_wait_for_customization_avail) {

		if (p_config_var == null) {
			throw new Error("Class RiscoMapOverlay, newMapCtx, null config_var");
		}
		if (p_ctx_id == null) {
			throw new Error("Class RiscoMapOverlay, newMapCtx, null context id");
		}	

		this.mapcontexts[p_ctx_id] = new RiscoMapCtx(p_config_var, this.panelwidget, b_wait_for_customization_avail);

		return this.mapcontexts[p_ctx_id];
	}

	/**
	 * Method getMapCtx
	 * Return exisitng map context attached to this overlay
	 * @param {string} p_ctx_id - Identification of this context
	 * @returns - The context for the given id
	 */
	 getMapCtx(p_ctx_id) {
		if (p_ctx_id == null) {
			throw new Error("Class RiscoMapOverlay, getMapCtx, null context id");
		}	
		let ret = null;
		if (this.mapcontexts[p_ctx_id] !== undefined) {
			ret = this.mapcontexts[p_ctx_id];
		} else {
			console.error(`context with id '${p_ctx_id}' not in this map overlay mgr (widget id:'${this.panelwidget.id}'`);
		}
		return ret;
	}	
	
}

/**
 * Class RiscoMapCtx
 * 
 * Risco Map Context controller, main class to use in case of a simple one map web client
 * 
 * @param {object} p_config_var - Variable object containing configuration JSON dictionary
 * @param {object} p_paneldiv 	- String Id or object reference to HTML DIV element to act as RiscoJS map panel
 * 
 */
export class RiscoMapCtx {

	#customization_instance;

	constructor(p_config_var, p_paneldiv, b_wait_for_customization_avail) {

		this.wait_for_customization_avail = b_wait_for_customization_avail;

		if (p_config_var == null) {
			throw new Error("Class RiscoMapCtx, null config_var");
		}
		if (typeof p_config_var != 'object') {
			throw new Error(`Class RiscoMapCtx, config_var must be 'object' not '${typeof p_config_var}'`);
		}		
		if (p_paneldiv == null) {
			throw new Error("Class RiscoMapCtx, null paneldiv");
		}		

		if (typeof p_paneldiv == 'string') {
			this.panelwidget = document.getElementById(p_paneldiv);
		} else if (typeof p_paneldiv == 'object') {
			this.panelwidget = p_paneldiv;
		} else 	{
			throw new Error('invalid type for paneldiv parameter');
		}

		if (this.panelwidget == null) {
			throw new Error("Class RiscoMapCtx, no panel widget");
		}		
		if (this.panelwidget.tagName.toLowerCase() != 'div') {
			throw new Error(`Class RiscoMapCtx, panel widget must be DIV, not ${this.panelwidget.tagName}`);
		}	

		this.canvasmgr = new HTML5CanvasMgr(this);
		this.transformmgr = new Transform2DMgr(this, p_config_var["basic"]);	
		this.toolmgr = new ToolManager(p_config_var["basic"]);
		this.tocmgr = new TOCManager(this, p_config_var["layers"], 'canvas');
		this.#customization_instance = null;

		// Attach event listeners to this map context panel
		(function(p_mapctx) {
			const evttypes = ["mouseup", "mousedown", "mousemove", "mouseover", "mouseout", "mouseleave", "wheel"];
			for (let i=0; i<evttypes.length; i++) {
				p_mapctx.panelwidget.addEventListener(evttypes[i], function(e) { 
					p_mapctx.onEvent(e);
				}); 
			}
		})(this);	

		if (!this.wait_for_customization_avail) {
			this.draw();
		}

		console.info(`=== End of map context init for '${this.panelwidget.id}' ===`);
	}

	/**
	 * @param {any} p_cclass
	 */
	setCustomizationObj(p_instance) {
		this.#customization_instance = p_instance;
		if (this.wait_for_customization_avail) {
			this.draw();
		}		
	}
	getCustomizationInstance() {
		return this.#customization_instance;
	}
	/**
	 * Method resize - to be automatically fired on window resize
	 */	
	resize() {
		this.canvasmgr.init();
		this.customResize(this);
	}

	/**
	 * Method customResize - Abstract, must be implemented to execute customized tasks on fired on window resize
 	 * @param {object} p_this_mapctx - This map context
 	 */	
	customResize(p_this_mapctx) {
		// To be implemented 
	}

	/**
	 * Method onEvent
	 * Fired on every listened event 
	 * @param {object} p_mapctx - Map context for which interactions managing is needed
s 	 * @param {object} p_evt - Event (user event expected)
	 */
	onEvent(p_evt) {

		if (!this.toolmgr.onEvent(this, p_evt)) {
			p_evt.stopPropagation();
		}		
	}	

	getMapBounds(out_env) {
		const canvasDims = [];
		this.canvasmgr.getCanvasDims(canvasDims);
		this.transformmgr.getMapBounds(canvasDims, out_env)
	}

	getCenter(out_pt) {
		this.transformmgr.getCenter(out_pt);
	}

	draw() {
		// console.info(">>>>>           draw            <<<<<");
		const sv = this.transformmgr.getReadableCartoScale();
		this.printScale(sv);
		this.tocmgr.draw(sv);
	}

	transformsChanged(b_dodraw) {
		// console.info(">>>>>     transformsChanged     <<<<<");
		if (b_dodraw) {
			this.draw();
		}
	}

	printMouseCoords(p_x, py) {
		const ci = this.getCustomizationInstance();
		if (ci) {
			const mpc = ci.instances["mousecoordsprint"];
			if (mpc.print !== undefined) {
				mpc.print(this, p_x, py);
			}			
		}
	}

	printScale(p_scaleval) {
		const ci = this.getCustomizationInstance();
		if (ci) {
			const mpc = ci.instances["mapscaleprint"];
			if (mpc.print !== undefined) {
				mpc.print(this, p_scaleval);
			} else {
				console.error(`mapscaleprint customization unavailable, cannot print scale value of ${p_scaleval}`);

			}	
		} else {
			console.error("printScale, no map customizations available");
		}
	}

	removePrint(p_type) {
		const ci = this.getCustomizationInstance();
		if (ci) {
			const mpc = ci.instances[p_type];
			if (mpc.remove !== undefined) {
				mpc.remove(this);
			}			
		}
	}	

}

