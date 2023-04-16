import {HTML5CanvasMgr} from './html5canvas.mjs';
import {Transform2DMgr} from './transformations.mjs';
import {ToolManager} from './interactions.mjs';
import {TOCManager} from './toc.mjs';
import {FeatureCollection} from './feature_collection.mjs';
import {I18n} from './i18n.mjs';
import {GlobalConst} from './constants.js';

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
	 * @param {string} p_ctx_id - Identification of this context eg: 'left', 'right', 'single', 'base', etc.
	 * @param {string} p_mode - Just 'canvas' for now
	 * @returns - the context just created
	 */
	newMapCtx(p_config_var, p_ctx_id, p_mode, b_wait_for_customization_avail) {

		if (p_config_var == null) {
			throw new Error("Class RiscoMapOverlay, newMapCtx, null config_var");
		}
		if (p_ctx_id == null) {
			throw new Error("Class RiscoMapOverlay, newMapCtx, null context id");
		}	

		this.mapcontexts[p_ctx_id] = new RiscoMapCtx(p_config_var, this.panelwidget, p_mode, b_wait_for_customization_avail);

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

	query_box;
	query_results;

	// p_mode -- just 'canvas' for now
	constructor(p_config_var, p_paneldiv, p_mode, b_wait_for_customization_avail) {

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

		this.cfgvar = p_config_var;

		switch(p_mode) {

			case 'canvas':
				this.renderingsmgr = new HTML5CanvasMgr(this);
				break;

		}
		this.featureCollection = new FeatureCollection(this);
		this.transformmgr = new Transform2DMgr(this, p_config_var["basic"]);	
		this.toolmgr = new ToolManager(p_config_var["basic"]);
		this.tocmgr = new TOCManager(this, p_mode);
		this.i18n = new I18n(p_config_var["text"]);

		this.query_box = new I18n(p_config_var["text"]);

		this._refresh_timeout_id = null;

		this.#customization_instance = null;

		// Attach event listeners to this map context panel
		(function(p_mapctx) {
			const evttypes = ["mouseup", "mousedown", "mousemove", "mouseover", "mouseout", "mouseleave", "wheel"];
			for (let i=0; i<evttypes.length; i++) {
				p_mapctx.panelwidget.addEventListener(evttypes[i], function(e) { 
					p_mapctx.mxOnEvent(e);
				}); 
			}
		})(this);	

		if (!this.wait_for_customization_avail) {
			this.maprefresh();
		}

		let f;
		for (let fkey in GlobalConst.FONTS) {
			f = new FontFace(fkey, `url(${GlobalConst.FONTS[fkey]})`);
			f.load().then(() => {
				console.info(`[init RISCO] ${fkey} font loaded`);
			}, (err) => {
				console.error(err);
			});
			document.fonts.add(f);			
		}

		console.info(`[init RISCO] ==  End of map context init for '${this.panelwidget.id}'  ==`);
	}

	setCurrentUser(p_username) {
		this.toolmgr.setCurrentUser(p_username);
	}

	/**
	 * @param {any} p_cclass
	 */
	setCustomizationObj(p_instance) {

		this.#customization_instance = p_instance;

		this.#customization_instance.setMapCtx(this);

		let r, bcb = null,  qryb=null, qryboxheight = 22;

		if (this.#customization_instance.instances["basiccontrolsbox"] !== undefined) {
			bcb = this.#customization_instance.instances["basiccontrolsbox"];
			this.toolmgr.addControlsMgr("basiccontrolsbox", bcb);
		}	
		
		if (this.cfgvar["basic"]["querybox"]["show"] && this.#customization_instance.instances["querying"] !== undefined) {

			qryb = this.#customization_instance.instances["querying"];
			
			this.query_box = document.createElement('input');
			this.query_box.setAttribute("type", "text");
			this.query_box.style.position = "absolute";
			this.query_box.style.zIndex = this.renderingsmgr.getMaxZIndex()+1;

			this.query_results = document.createElement('div');
			this.query_results.id = "query_results";
			//this.query_results.setAttribute("type", "text");
			this.query_results.style.position = "absolute";
			this.query_results.style.zIndex = this.renderingsmgr.getMaxZIndex()+1;
			this.query_results.style.backgroundColor = "white";
			this.query_results.style.padding = "2px";
			this.query_results.style.margin = "0";



			if (bcb) {
				this.query_box.style.top = bcb.top + "px";
				this.query_box.style.left = (2 * bcb.left + bcb.getWidth()) + "px";	

				this.query_results.style.top = bcb.top + qryboxheight + "px";
				this.query_results.style.left = this.query_box.style.left;	
			} else {
				this.query_box.style.top = GlobalConst.CONTROLS_STYLES.OFFSET + "px";
				this.query_box.style.left = GlobalConst.CONTROLS_STYLES.OFFSET + "px";	

				this.query_results.style.top = GlobalConst.CONTROLS_STYLES.OFFSET + qryboxheight + "px";
				this.query_results.style.left = this.query_box.style.left + "px";	
			}

			this.query_box.style.width = this.cfgvar["basic"]["querybox"]["size"] + "px";	
			this.query_results.style.width = this.cfgvar["basic"]["querybox"]["size"] + "px";	
			this.query_results.style.height = "6px";
			this.query_results.style.display = 'none';
			
			this.panelwidget.appendChild(this.query_box);
			this.panelwidget.appendChild(this.query_results);

			this.query_clrbtn = document.createElement('button');

			this.query_clrbtn.innerText = this.i18n.msg('clr', true);
			this.query_clrbtn.style.position = "absolute";

			if (bcb) {
				this.query_clrbtn.style.top = bcb.top + "px";
				this.query_clrbtn.style.left = (3 * bcb.left + bcb.getWidth()) + this.cfgvar["basic"]["querybox"]["size"] + "px";	
			} else {
				this.query_clrbtn.style.top = GlobalConst.CONTROLS_STYLES.OFFSET + "px";
				this.query_clrbtn.style.left = GlobalConst.CONTROLS_STYLES.OFFSET + this.cfgvar["basic"]["querybox"]["size"] + "px";	
			}

			this.query_clrbtn.style.width =  this.cfgvar["basic"]["querybox"]["clrbtn_size"] + "px";
			this.query_clrbtn.style.zIndex = this.renderingsmgr.getMaxZIndex()+1;
			
			this.panelwidget.appendChild(this.query_clrbtn);

			qryb.setFeedbackAreas(this.query_box, this.query_results);

			(function(p_btn, p_query_box, p_qryb_obj) {
				
				let lastinput = "";

				// Query clear button
				p_btn.addEventListener("click", function(e) { 
					p_qryb_obj.clear(true);
				}); 

				// Query box input event
				p_query_box.addEventListener("input", function(e) { 
					let clntxt = p_query_box.value.trim();
					// console.log("::282:: INPUT EVENT", clntxt, p_query_box.value);
					if (clntxt.length > 2) {
						if (clntxt.length != lastinput.length) {
							lastinput = clntxt;
							qryb.query(lastinput);
						}
					}
				}); 

			})(this.query_clrbtn, this.query_box, qryb);	

		}				

		if (this.wait_for_customization_avail) {
			this.maprefresh();
		}		
	}

	getCustomizationInstance() {
		return this.#customization_instance;
	}
	/**
	 * Method resize - to be automatically fired on window resize
	 */	
	resize() {
		this.renderingsmgr.init();
		this.maprefresh();
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
	mxOnEvent(p_evt) {
		if (p_evt.target.tagName.toLowerCase() == "canvas") {
			this.toolmgr.tmOnEvent(this, p_evt);
			p_evt.stopPropagation();
		}
	}	

	getCanvasDims(out_env) {
		this.renderingsmgr.getCanvasDims(out_env);
	}

	getMapBounds(out_env) {
		const canvasDims = [];
		this.renderingsmgr.getCanvasDims(canvasDims);
		this.transformmgr.getMapBounds(canvasDims, out_env)
	}

	getCenter(out_pt) {
		this.transformmgr.getCenter(out_pt);
	}

	getScale() {
		return this.transformmgr.getReadableCartoScale();
	}

	getPixSize() {
		return this.transformmgr.getPixSize();
	}

	drawBasicControls() {
		const ci = this.getCustomizationInstance();
		if (ci && ci.instances["basiccontrolsbox"] !== undefined) {
			const bcb = ci.instances["basiccontrolsbox"];
			if (bcb.print !== undefined) {
				bcb.print(this);
			}
		}		
	}

	maprefresh() {

		if (this.tocmgr.isRefreshing()) {

			// Prevent effective re-refreshing calls while refresh process is still in progress
			// A single refresh call is delayed to happen after previous refresh process is finished
			
			if (this._refresh_timeout_id) {
				clearTimeout(this._refresh_timeout_id);
			}

			(function(p_this, p_delay_msecs) {
				p_this._refresh_timeout_id = setTimeout(function() {
					p_this.maprefresh();
				}, p_delay_msecs);
			})(this, 700);

		} else {

			this.drawBasicControls();

			const sv = this.transformmgr.getReadableCartoScale();
			// print decorated map scale widget 
			this.printScale(sv);

			this.featureCollection.invalidate();
			// maplayers refresh
			this.tocmgr.tocrefresh(sv);


		}
	}

	transformsChanged(b_dodraw) {
		// console.info(">>>>>     transformsChanged     <<<<<");

		// invalidate spatial index - aqui ou em draw
		
		if (b_dodraw) {
			this.maprefresh();
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

	printLoadingMsg(p_layername) {
		const ci = this.getCustomizationInstance();
		if (ci) {
			const mpc = ci.instances["loadingmsgprint"];
			if (mpc.print !== undefined) {
				mpc.print(this, p_layername);
			} else {
				console.error(`loadingmsgprint customization unavailable, cannot print message '${p_layername}'`);

			}	
		} else {
			console.error("printLoadingMsg, no map customizations available");
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

