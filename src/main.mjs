import {HTML5CanvasMgr} from './html5canvas.mjs';
import {Transform2DMgr} from './transformations.mjs';


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
			throw "Class RiscoMapOverlay, null paneldiv_id";
		}		

		this.panelwidget = document.getElementById(p_paneldiv_id);
		if (this.panelwidget == null) {
			throw `Class RiscoMapOverlay, panel widget search, no div found with for id ${p_paneldiv_id}`;
		}		
		if (this.panelwidget.tagName.toLowerCase() != 'div') {
			throw `Class RiscoMapOverlay, panel widget must be DIV, not ${this.panelwidget.tagName}`;
		}	

		this.mapcontexts = {};
	}

	/**
	 * Method newMapCtx
	 * Create new map context attached to this overlay
	 * @param {object} p_config_var - Variable object containing configuration JSON dictionary
	 * @param {string} p_ctx_id - Identification of this context
	 * @returns - the context just created
	 */
	newMapCtx(p_config_var, p_ctx_id) {

		if (p_config_var == null) {
			throw "Class RiscoMapOverlay, newMapCtx, null config_var";
		}
		if (p_ctx_id == null) {
			throw "Class RiscoMapOverlay, newMapCtx, null context id";
		}	

		this.mapcontexts[p_ctx_id] = new RiscoMapCtx(p_config_var, this.panelwidget);

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
			throw "Class RiscoMapOverlay, getMapCtx, null context id";
		}	
		let ret = null;
		if (this.mapcontexts[p_ctx_id] !== undefined) {
			ret = this.mapcontexts[p_ctx_id];
		} else {
			console.warn(`context with id '${p_ctx_id}' not in this map overlay mgr (widget id:'${this.panelwidget.id}'`);
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

	constructor(p_config_var, p_paneldiv) {

		if (p_config_var == null) {
			throw "Class RiscoMapCtx, null config_var";
		}
		if (typeof p_config_var != 'object') {
			throw `Class RiscoMapCtx, config_var must be 'object' not '${typeof p_config_var}'`;
		}		
		if (p_paneldiv == null) {
			throw "Class RiscoMapCtx, null paneldiv";
		}		

		if (typeof p_paneldiv == 'string') {
			this.panelwidget = document.getElementById(p_paneldiv);
		} else if (typeof p_paneldiv == 'object') {
			this.panelwidget = p_paneldiv;
		} else 	{
			throw 'invalid type for paneldiv parameter';
		}

		if (this.panelwidget == null) {
			throw "Class RiscoMapCtx, no panel widget";
		}		
		if (this.panelwidget.tagName.toLowerCase() != 'div') {
			throw `Class RiscoMapCtx, panel widget must be DIV, not ${this.panelwidget.tagName}`;
		}	

		this.canvasmgr = new HTML5CanvasMgr(this);
		this.transformmgr = new Transform2DMgr(p_config_var, this.canvasmgr);

		// Attach resizing method to window resize event
		(function(p_mapctx) {
			addEventListener("resize", function(e) { 
				p_mapctx.resize();
			 }); 
		})(this);		
	}

	/**
	 * Method resize - to be fired on window resize
	 */	
	resize() {
		this.canvasmgr.init();
	}
}

