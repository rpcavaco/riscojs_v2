import {I18n} from './i18n.mjs';
import {GlobalConst} from './constants.js';
import {FeatureCollection} from './feature_collection.mjs';
import {ctrToolTip, MapPrintInRect} from './customization_canvas_baseclasses.mjs';

class featureHolder {

	#isset;
	#edited;
	#id;
	#gisid;
	#curr_partidx;
	#curr_vertxid;

	constructor() {

		this.#id = null;
		this.#isset = false;
		this.#edited = false;
		this.#gisid = null;
		this.#curr_partidx = null;
		this.#curr_vertxid = null;
	
	}

	reset() {

		this.#id = null;
		this.#isset = false;
		this.#edited = false;
		this.#gisid = null;

	}	

	get Id() {
		return this.#id;
	}

	checkCurrentId(p_otherid) {
		return (this.#id == p_otherid);
	}	

	/*set(p_id, opt_partidx, opt_vertidx) {

		this.#id = p_id;
		this.#isset = true;
		this.#edited = false;
		this.#gisid = null;

		if (opt_partidx) {
			this.#curr_partidx = opt_partidx;
		}else {
			this.#curr_partidx = null;
		}

		if (opt_vertidx) {
			this.#curr_vertxid = opt_vertidx;
		}else {
			this.#curr_vertxid = 0;
		}		
	} */

	setCurrentVertex(p_partidx, p_vertidx) {

		console.assert(this.#id != null);

		this.#curr_partidx = p_partidx;
		this.#curr_vertxid = p_vertidx;	
	}	

	fhFromDict(p_dict, b_edited, b_has_parts) {

		this.#id = p_dict.id;
		this.#isset = true;
		this.#edited = b_edited;

		if (b_edited) {
			if (b_has_parts) {
				this.#curr_partidx = 0;
			} else {
				this.#curr_partidx = null;
			}
			this.#curr_vertxid = 0;
		} else {
			this.#curr_partidx = null;
			this.#curr_vertxid = null;	
		}

		if (p_dict['gisid'] !== undefined) {
			this.#gisid = p_dict['gisid'];
		}else {
			this.#gisid = null;
		}		

	}

	toDict() {
		return {
			id: this.#id,
			gisid: this.#gisid
		}
	}

	get isSet() {
		return this.#isset = true;
	}

	get getCurrentVertexIsSet() {
		return this.#curr_vertxid !== null;
	}

	get GISId() {
		return this.#gisid;
	}

	set GISId(p_value) {
		return this.#gisid = p_value;
	}	

	get Edited() {
		return this.#edited;
	}

	set Edited(b_flag) {
		this.#edited = b_flag;
	}	

	get PartIdx() {
		return this.#curr_partidx;
	}

	get VertexIdx() {
		return this.#curr_vertxid;
	}
}

class lockableFeatureHolder extends featureHolder {

	#locked;

	constructor() {
		super();
		this.#locked = false;
	}

	/*setFHolder(p_id, opt_partidx, opt_vertidx, b_do_lock) {
		super.setFHolder(p_id, opt_partidx, opt_vertidx);
		this.#locked = b_do_lock;
	}*/

	lfhFromDict(p_dict, b_edited, b_has_parts, b_do_lock) {
		super.fhFromDict(p_dict, b_edited, b_has_parts);
		this.#locked = b_do_lock;
	}

	get locked() {
		return this.#locked;
	}

	reset() {
		super.reset();
		this.#locked = false;
	}
}

export class EditingMgr extends MapPrintInRect {

	#current_sessionid;
	#current_user;
	#current_user_canedit;
	#editing_is_enabled;
	#saveendpoint_authenticated;
	#editing_layer_key;
	#editing_layer_url;
	editable_layers;

	left;
	boxh;
	boxw;
	top;

	activeStyleFront;
	enabledFillStyleFront;
	inactiveStyleFront;
	margin_offset;
	normalszPX;
	fontfamily;

	print_attempts;
	had_prev_interaction;
	// collapsedstate;
	prevboxenv;
	bottom;
	other_widgets;
	std_boxdims;
	// active_mode;

	#current_edit_feature_holder;
	#edit_feature_holders;
	#current_tool_name;
	#pending_changes_to_save;
	#layeredit_cfg_attribs;
	#single_feat_editing;
	#hidden;

	constructor(p_mapctx, p_editable_layers, p_other_widgets, b_single_feat_editing) {

		super();

		this.other_widgets = p_other_widgets;

		this.editable_layers = p_editable_layers;
		this.#current_sessionid = null;
		this.#current_user = null;
		this.#current_user_canedit = false;
		this.#saveendpoint_authenticated = false;
		this.#editing_is_enabled = false;
		this.#editing_layer_key = null;
		this.#editing_layer_url = null;
		this.#current_tool_name = null;
		this.#edit_feature_holders = [];
		this.#single_feat_editing = b_single_feat_editing;
		this.#pending_changes_to_save = "none";
		this.#layeredit_cfg_attribs = {};

		this.fillStyleBack = GlobalConst.CONTROLS_STYLES.EM_BCKGRD;  // **
		this.activeStyleFront = GlobalConst.CONTROLS_STYLES.EM_ACTIVECOLOR;
		this.enabledFillStyleFront = GlobalConst.CONTROLS_STYLES.EM_INACTIVECOLOR;
		this.inactiveStyleFront = GlobalConst.CONTROLS_STYLES.EM_INACTIVECOLOR;
		this.margin_offset = GlobalConst.CONTROLS_STYLES.OFFSET;
		this.normalszPX = GlobalConst.CONTROLS_STYLES.EM_NORMALSZ_PX;	
		this.strokeWidth = GlobalConst.CONTROLS_STYLES.STROKEWIDTH;

		if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["fontfamily"] !== undefined) {		
			this.fontfamily = p_mapctx.cfgvar["basic"]["style_override"]["fontfamily"];
		} else {
			this.fontfamily = GlobalConst.CONTROLS_STYLES.FONTFAMILY;
		}

		this.canvaslayer = 'service_canvas'; 

		let mapdims = [];
		p_mapctx.renderingsmgr.getCanvasDims(mapdims);

		this.left = null;
		this.top = null;
		this.featcounter_width = 10;

		this.expandenv = 1;
		this.prevboxenv = null;

		this.print_attempts = 0;
		this.had_prev_interaction = false;

		const icondims = GlobalConst.CONTROLS_STYLES.EM_ICONDIMS;

		this.boxh = icondims[1] + 2 * this.margin_offset;
		this.boxw = icondims[0] + 3 * this.margin_offset + this.featcounter_width;

		this.#current_edit_feature_holder = new lockableFeatureHolder();
		// this.#current_edit_feature_holder_lock = false;

		this.#hidden = false;

		p_mapctx.toolmgr.setEditingManager(this);
	}

	hide(p_mapctx, p_dohide) {	
		this.#hidden = p_dohide;
		this.print(p_mapctx);
	}

	_print(p_mapctx) {

		if (!this.checkCanEditStatus(true, true)) {
			return;
		}

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		let edited_featcount, mapdims = [];
		p_mapctx.renderingsmgr.getCanvasDims(mapdims);

		const icondims = GlobalConst.CONTROLS_STYLES.EM_ICONDIMS;


		try {

			const dee = 2 * this.expandenv;

			if (this.left) {
				ctx.clearRect(this.left-this.expandenv, this.top-this.expandenv, this.boxw+dee, this.boxh+dee); 
			}


			if (!this.#hidden) {

				let otherboxesheight = 0;
				for (let ow of this.other_widgets) {
					if (ow['setdims'] !== undefined) {
						ow.setdims(p_mapctx, mapdims);
					}		
					otherboxesheight += ow.getHeight();
					// console.warn("AM boxesheight:", otherboxesheight, this.other_widgets.length);
				}

				this.left = mapdims[0] - (this.boxw + this.margin_offset);
				this.bottom = otherboxesheight + 2 * this.margin_offset + this.boxh;
				this.top = this.bottom - this.boxh;
		
				// background
				
				// BASIC_CONFIG_DEFAULTS_OVERRRIDE ctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
				if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["em_bckgrd"] !== undefined) {
					ctx.fillStyle = p_mapctx.cfgvar["basic"]["style_override"]["em_bckgrd"];
				} else {
					ctx.fillStyle = this.fillStyleBack;
				}

				ctx.fillRect(this.left, this.top, this.boxw, this.boxh);
				
				ctx.strokeStyle = this.activeStyleFront;
				ctx.lineWidth = this.strokeWidth;
				ctx.strokeRect(this.left, this.top, this.boxw, this.boxh);

				let iconname = "edit_off";
				if (this.isEditingEnabled()) {
					iconname = "edit_on";
				}

				const img = new Image();
				img.decoding = "sync";

				let imgsrc = p_mapctx.cfgvar["basic"][iconname]; //.replace(/stroke:%23fff;/g, `stroke:${encodeURIComponent(vstyle)};`);

				img.src = imgsrc;
				img.decode()
				.then(() => {
					ctx.drawImage(img, this.left+2*this.margin_offset+this.featcounter_width, this.top+this.margin_offset, icondims[0], icondims[1]);
				});

				edited_featcount = 0;
				for (const f of this.editFeatureHolderIter()) {
					//if (f.edited) {
						edited_featcount++;
					//}
				}

				//if (this.#edit_feature_holders.length > 0) {
				ctx.textAlign = "center";
				ctx.fillStyle = "white";
				ctx.textBaseline = "middle";
				ctx.font = `${(this.normalszPX - 4)}px ${this.fontfamily}`;
				ctx.fillText(edited_featcount.toString(), this.left+this.margin_offset+0.5*this.featcounter_width, this.top+this.margin_offset+0.5*icondims[1]);	
				//}

			}

		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}
	}	

	print(p_mapctx) {
		const that = this;
		// prevent drawing before configured fonts are available
		while (!document.fonts.check("10px "+this.fontfamily) && this.print_attempts < 10) {
			setTimeout(() => {
				that.print(p_mapctx);
			}, 200);
			that.print_attempts++;
			return;
		}
		this.print_attempts = 0;
		return this._print(p_mapctx)
	}

	interact(p_mapctx, p_evt) {
		let topcnv, ret = false;

		if (p_evt.offsetX >= this.left && 
			p_evt.offsetX <= this.left+this.boxw && 
			p_evt.offsetY >= this.top && 
			p_evt.offsetY <= this.top+this.boxh) {

				switch(p_evt.type) {

					case 'mousemove':
		
						topcnv = p_mapctx.renderingsmgr.getTopCanvas();
						topcnv.style.cursor = "pointer";
						let msg;

						if (this.isEditingEnabled()) {
							msg = p_mapctx.i18n.msg('STOPEDIT', true);
						} else {
							msg = p_mapctx.i18n.msg('STARTEDIT', true);
						}

						ctrToolTip(p_mapctx, p_evt, msg, [250,30]);	
						break;

					case 'mouseup':
					case 'touchend':
		
						if (this.isEditingEnabled()) {
							this.save(p_mapctx);
						} else {
							this.resetCurrentEditFeatureHolder();
							this.setEditingEnabled(p_mapctx, true);
							// this.print(p_mapctx);
						}
	
						break;

					default:
						topcnv = p_mapctx.renderingsmgr.getTopCanvas();
						topcnv.style.cursor = "default";
				}

				//console.log("1296:", p_evt.type);
				ret = true;
		}

		// Clearinteractions, allowing only for wiping tooltip and not maptipped feature selections
		if (ret) {

			if (!this.had_prev_interaction) {
				p_mapctx.clearInteractions('EDITMGR1', false, 'transientviz');
			}
			this.had_prev_interaction = true;

		} else {

			if (this.had_prev_interaction) {

				// emulating mouseout
				topcnv = p_mapctx.renderingsmgr.getTopCanvas();
				topcnv.style.cursor = "default";

				p_mapctx.clearInteractions('EDITMGR2', false, 'transientviz');

				this.had_prev_interaction = false;
			}
		}

		return ret;
	} 

	editControlsDisabling(p_mapctx, p_ctrlkeys_list, b_do_disable) {

		// Enable relevant edit controls
		const ci = p_mapctx.getCustomizationObject();
		if (ci == null) {
			throw new Error("setCurrentEditVertex, map context customization instance is missing")
		}
		const ecb = ci.instances["editcontrolsbox"];
		if (ecb) {
			ecb.controlsDisabling(p_ctrlkeys_list, b_do_disable);
			ecb.print(p_mapctx);
		}
	}

	get currentEditFeatHolder() {
		return this.#current_edit_feature_holder;
	}

	setCurrentEditFeatHolder(p_mapctx, p_feat_holder, b_lock_holder, b_has_parts) {

		// console.trace("setCurrentEditFeatHolder:", p_feat_holder);

		if (b_lock_holder) {

			if (this.currentEditFeatHolder.locked) {
		 		throw new Error("Lock request over already locked current_edit_feature_holder");
		 	}
			//this.#current_edit_feature_holder_lock = true;

		} else {

			if (this.currentEditFeatHolder.locked) {
				return;
			}

		}

		// console.log("p_feat_holder:", p_feat_holder);
		
		this.currentEditFeatHolder.lfhFromDict(p_feat_holder, true, b_has_parts, b_lock_holder);
		this.editControlsDisabling(p_mapctx, ["delete"], false);

		//return this.#current_edit_feature_holder;
	}	


	resetCurrentEditFeatureHolder() {
		console.assert(this.#current_edit_feature_holder != null, "current_edit_feature_holder is NULL");
		this.#current_edit_feature_holder.reset();
	}	

	precheckCanEditStatus() {

		let ret = true;
		if (this.#current_user == null) {
			console.warn("checkEditionStatus: no current user");
			ret = false;
		} else if (!this.#current_user_canedit) {
			console.warn("checkEditionStatus: current user cannot edit");
			ret = false;
		};		
		
		console.info("[INFO] is PRE CHECK edit status (edit user defned) OK?:", ret);

		return ret;
	}

	checkCanEditStatus(b_before_enable_editing, b_to_avail_paint_edit_mgr) {

		let ret = true;

		if (this.#current_sessionid == null || this.#current_sessionid.toLowerCase() == "none") {
			console.warn("checkEditionStatus: no current session id");
			ret = false;
		};

		/*if (this.#current_user == null) {
			console.warn("[WARN] checkEditionStatus: no current user");
		};
		if (!this.#current_user_canedit) {
			console.warn("[WARN] checkEditionStatus: current user cannot edit");
		};	*/	
		if (ret && !b_before_enable_editing && !this.#editing_is_enabled) {
			console.info("[INFO] checkEditionStatus: editing not enabled");
			ret = false;
		};	
		if (ret && !b_to_avail_paint_edit_mgr && this.#editing_layer_key == null) {
			console.warn("checkEditionStatus: no editing layer key defined");
			ret = false;
		};	
		
		console.info("[INFO] is edit status OK?:", ret);

		return ret;
	}
	
	setCurrentUser(p_sessionid, p_username, b_user_canedit, b_saveendpoint_authenticated) {

		console.info("[INFO] set edit session, id:", p_sessionid, "user:", p_username, "can edit:", b_user_canedit, "auth endpoint:", b_saveendpoint_authenticated);

		this.#current_sessionid = p_sessionid;
		this.#current_user = p_username;
		this.#current_user_canedit = b_user_canedit;
		this.#saveendpoint_authenticated = b_saveendpoint_authenticated;
	}

	set editingLayerKey(p_key) {
		this.#editing_layer_key = p_key;
	}

	get editingLayerKey() {
		return this.#editing_layer_key;
	}

	* editFeatureHolderIter() {
		for (const fh of this.#edit_feature_holders) {
			yield fh;
		}
	}

	addEditFeatureHolder(p_editf_holder) {
		// console.trace("addEditFeatureHolder:", p_editf_holder);
		this.#edit_feature_holders.push(JSON.parse(JSON.stringify(p_editf_holder)));
	}	

	editFeatureHolderLen() {
		return this.#edit_feature_holders.length;
	}	

	editFeatureHolderReset() {
		this.#edit_feature_holders.length = 0;
	}

	set initialEditFeatureHolder(p_list) {
		// console.trace("SET EditFeatureHolder LIST:", p_list);
		this.#edit_feature_holders = [...p_list];
	}

	get pendingChangesToSave() {
		return this.#pending_changes_to_save;
	}

	// acronym - GEO, ALPHA, to reset pending changes flag use 'clearPendingChangesToSave'
	set pendingChangesToSave(p_pend_changes_type_acronym) {
		if (p_pend_changes_type_acronym == "none") {
			return this.clearPendingChangesToSave();
		}
		this.#pending_changes_to_save = p_pend_changes_type_acronym;
	}

	clearPendingChangesToSave() {
		this.#pending_changes_to_save = "none";
	}	

	defineEditingLayer(p_mapctx, opt_previously_sel_lyrkey) {

		const work_layerkeys = [], editables= {}, types={};
		let lyr, constraints = null, ret = false;

		// temp_layer_key here works as variable passed by reference
		const temp_layer_key = [];
		const layeredit_cfg_attrib_names = ["gisid"];

		const that = this;

		p_mapctx.tocmgr.getAllVectorLayerKeys(work_layerkeys);		

		if (work_layerkeys.length > 0) {
			for (const lyrk of work_layerkeys) {
				lyr = p_mapctx.tocmgr.getLayer(lyrk);
				if (lyr.layereditable != "none") {
					editables[lyrk] = (lyr.label == "none" ? lyrk : I18n.capitalize(lyr.label));
					types[lyrk] = lyr.geomtype
				}
			}
		}

		if (!opt_previously_sel_lyrkey) {
		
			const lyrks = Object.keys(editables);
			const sz = lyrks.length;


			if (sz == 0) {

				console.error("defineEditingLayer: no editable layers, check all layer 'layereditable' attribute in layer config");

			} else if (sz > 1) {

				if (this.editingLayerKey) {
					constraints = {
						"selected": this.editingLayerKey
					}
				}

				(function(pp_mapctx, p_editables, p_constraints) {

					pp_mapctx.getCustomizationObject().messaging_ctrlr.selectInputMessage(
						pp_mapctx.i18n.msg('SELEDITLYR', true), 
						p_editables,
						(evt, p_result, p_value) => { 
							if (p_value) {
								const meth = that.defineEditingLayer.bind(that);
								if (meth(pp_mapctx, p_value)) {
									that.enableEditingFinalSteps(p_mapctx);									
								}
							}
						},
						p_constraints
					);
	
				})(p_mapctx, editables, constraints);
				
			} else {

				// this.editingLayerKey = lyrks[0];
				temp_layer_key.push(lyrks[0]);

			}
		
		} else {

			temp_layer_key.push(opt_previously_sel_lyrkey);

		}

		if (temp_layer_key.length > 0) {

			lyr = p_mapctx.tocmgr.getLayer(temp_layer_key[0]);
			if (lyr == null) {
				throw new Error(`defineEditingLayer, layer '${temp_layer_key[0]}' not defined`);
			}

			const sv = p_mapctx.transformmgr.getReadableCartoScale();
			if (!lyr.checkScaleVisibility(sv)) {

				const msgsctrlr = p_mapctx.getCustomizationObject().messaging_ctrlr;
				msgsctrlr.warn(p_mapctx.i18n.msg('EDITLYROUTOFSCALE',true));
				ret = false;

			} else if (!lyr.layervisible) {

				const msgsctrlr = p_mapctx.getCustomizationObject().messaging_ctrlr;
				msgsctrlr.warn(`${p_mapctx.i18n.msg('EDITLYRNOTVISIBLE',true)} '${lyr.getLabel()}'`);
				ret = false;
			
			} else {

				if (lyr._gisid_field == null) {
					throw new Error(`defineEditingLayer, layer '${temp_layer_key[0]}' has no gisid_field defined, cannot edit`);
				}

				const missing_attribs = [];
				for (let k of layeredit_cfg_attrib_names) {
					if (lyr.layereditable[k] === undefined) {
						missing_attribs.push(k);
					}
				}

				if (missing_attribs.length > 0) {
					temp_layer_key.length = 0;
					throw new Error(`defineEditingLayer failed for layer '${temp_layer_key[0]}', missing 'layereditable' attribs (in layer config): ${missing_attribs}`);
				}

				switch (types[temp_layer_key[0]]) {

					case "point":
						this.#current_tool_name = 'PointEditTool';
						break;

					case "line":
						this.#current_tool_name = 'SimplePathEditTool';
						break;

					default:
						throw new Error(`geom type '${types[temp_layer_key[0]]}', for layer key '${temp_layer_key[0]}', has no edit tool associated for now`);
				}

				for (let k of layeredit_cfg_attrib_names) {
					this.#layeredit_cfg_attribs[k] = lyr.layereditable[k];
				}		
				
				this.#layeredit_cfg_attribs["gisid_field"] = lyr._gisid_field;
				this.#layeredit_cfg_attribs["accept_deletion"] = lyr._accept_deletion;

				this.editingLayerKey = temp_layer_key[0];
				temp_layer_key.length = 0;

				if (this.#saveendpoint_authenticated) {
					this.#editing_layer_url = (lyr.url.endsWith("/") ? lyr.url : lyr.url + "/") + "save";
				} else {
					this.#editing_layer_url = (lyr.url.endsWith("/") ? lyr.url : lyr.url + "/") + "usave";
				}

				ret = true;
					
			}

		}

		return ret;
	}

	enableEditingFinalSteps(p_mapctx) {

		// add pre-selected feats
		if (!this.checkCanEditStatus(true)) {
			throw new Error("Cannot enable editing");
		}
		this.#editing_is_enabled = true;

		// activate layer-defined tool
		const tool = p_mapctx.toolmgr.enableTool(p_mapctx, this.#current_tool_name, true);
		tool.init(p_mapctx);

		const ci = p_mapctx.getCustomizationObject();
		if (ci == null) {
			throw new Error("setEditingEnabled, _enableEditingFinalSteps, map context customization instance is missing")
		}

		const controlkeys_exceptions = [];
		if (!this.#layeredit_cfg_attribs.accept_deletion) {
			controlkeys_exceptions.push("delete");
		}

		// Show edit controls
		const ecb = ci.instances["editcontrolsbox"];
		if (ecb) {
			ecb.setManyControlsHidden(false, controlkeys_exceptions);
			ecb.print(p_mapctx);
		}

		// Enable coords display
		const mcp = ci.instances["mousecoordsprint"];		
		mcp.changeVisibility(true);

		const toc = ci.instances["toc"];		
		toc.setEditingLayerKey(this.editingLayerKey);
		toc.print(p_mapctx);

		this.print(p_mapctx);

	}

	setEditingEnabled(p_mapctx, p_editing_tobe_enabled) {

		if (p_editing_tobe_enabled) {

			if(this.precheckCanEditStatus()) {
				if (this.defineEditingLayer(p_mapctx)) {
					this.enableEditingFinalSteps(p_mapctx);
				}
			}		

		} else {

			console.assert(this.#current_tool_name != null, "current_tool not defined");

			// desativar tool
			p_mapctx.toolmgr.enableTool(p_mapctx, this.#current_tool_name, false);
			this.#current_tool_name = null;
			this.#editing_is_enabled = false;

			p_mapctx.clearInteractions('EDITMGR3', true);

			// Disable coords display
			const ci = p_mapctx.getCustomizationObject();
			if (ci == null) {
				throw new Error("map context customization instance is missing")
			}	

			// Hide edit controls
			const ecb = ci.instances["editcontrolsbox"];
			if (ecb) {
				ecb.controlsDisabling("all", true);
				ecb.setManyControlsHidden(true);
				ecb.print(p_mapctx);
			}

			const mcp = ci.instances["mousecoordsprint"];		
			mcp.changeVisibility(false);	
			mcp.print(p_mapctx);	
			
			const toc = ci.instances["toc"];		
			toc.clearEditingLayerKey();
			toc.print(p_mapctx);
	
		}		
	}	

	isEditingEnabled() {
		return this.#editing_is_enabled;
	}
	
	setCurrentEditFeature(p_mapctx, p_feat_dict, b_has_parts) {

		const fd_keys = Object.keys(p_feat_dict);
		let ret = null;

		if (fd_keys.length == 0) {
			console.warn("[WARN] setCurrentEditFeature, empty feat dict passed");
			return;
		}

		if (p_feat_dict[this.editingLayerKey] === undefined) {
			return;
			//throw new Error(`editing layer '${this.editingLayerKey}' not in edit features [${fd_keys}]`);
		}

		if (p_feat_dict[this.editingLayerKey].length == 0) {
			console.warn(`[WARN] setCurrentEditFeature, feat dict with no elements for editing layer '${this.editingLayerKey}'`);
			return;
		} else if (p_feat_dict[this.editingLayerKey].length > 1) {
			throw new Error(`setCurrentEditFeature, feat dict with MORE THAN ONE element for editing layer '${this.editingLayerKey}'`);
		} else {

			this.removePreviousTempFeat(p_mapctx, true);

			// console.log(".....", p_feat_dict[this.editingLayerKey][0]);

			this.setCurrentEditFeatHolder(p_mapctx, p_feat_dict[this.editingLayerKey][0], false, b_has_parts);
			this.currentEditFeatHolder.Edited = false;
			if (this.#single_feat_editing) {
				this.initialEditFeatureHolder = [this.currentEditFeatHolder.toDict()];
			} else {
				this.addEditFeatureHolder(this.currentEditFeatHolder.toDict());
			}

			ret = this.currentEditFeatHolder.toDict();
		}

		// console.log("::: 889 :::", ret);

		return ret;

	}

	setCurrentEditVertex(p_vertorderidx, b_is_edited, opt_geompartidx) {

		// console.trace("setCurrentEditVertex:", p_vertorderidx, b_is_edited, opt_geompartidx);

		if (!this.currentEditFeatHolder.isSet) {
			throw new Error("setCurrentEditVertex, no current editing feature");
		}

		this.currentEditFeatHolder.setCurrentVertex(opt_geompartidx, p_vertorderidx);		
		this.currentEditFeatHolder.Edited = b_is_edited;
	}

	editCurrentVertex(p_mapctx, p_scrx, p_scry) {

		if (!this.currentEditFeatHolder.isSet) {
			throw new Error("editCurrentVertex, no current editing feature");
		}
		if (!this.currentEditFeatHolder.getCurrentVertexIsSet) {
			throw new Error("editCurrentVertex, no current editing vertex set");
		}
		const feat = p_mapctx.featureCollection.get(this.editingLayerKey, this.currentEditFeatHolder.Id);

		if (feat) {
			
			/*
			if (feat.gt == "point") { // }.g.length == 2 && typeof feat.g[0] === 'number') {
				// point
	
				if (feat.g.length != 1 || feat.g[0].length != 2 || typeof feat.g[0][0] !== 'number') {
					throw new Error("editCurrentVertex, current editing feature - invalid point feature");
				}
				if (this.#current_edit_partidx != 0) {
					throw new Error("editCurrentVertex, current editing feature part index non-zero for point feature");
				}
				if (this.#current_edit_vertexidx != 0) {
					throw new Error("editCurrentVertex, current editing vertex index non-zero for point feature");
				}	
	
			}
			*/

			const terr_pt = [];
			p_mapctx.transformmgr.getTerrainPt([p_scrx, p_scry], terr_pt);
			p_mapctx.featureCollection.setVertex(this.editingLayerKey, feat, terr_pt, this.currentEditFeatHolder.VertexIdx, this.currentEditFeatHolder.PartIdx);
	
			this.currentEditFeatHolder.Edited = true;
	
			this.print(p_mapctx);
	
			this.pendingChangesToSave = "GEO";
				
		} else {
			console.error(`editCurrentVertex, feature not found for layer '${this.editingLayerKey}', id:${this.currentEditFeatHolder.Id}`);
		}
		
	}

	deleteCurrentEditFeat(p_mapctx) {

		if (!this.currentEditFeatHolder.IsSet) {
			throw new Error("deleteCurrentEditFeat, no current editing feature set");
		}

		const feat = p_mapctx.featureCollection.get(this.editingLayerKey, this.currentEditFeatHolder.Id);
		const gisid = feat.a[this.#layeredit_cfg_attribs["gisid_field"]];

		this.currentEditFeatHolder.GISId = gisid;

		p_mapctx.featureCollection.remove(this.editingLayerKey, this.currentEditFeatHolder.Id);
		this.currentEditFeatHolder.Edited = true;

		p_mapctx.featureCollection.redrawAllVectorLayers();
		this.print(p_mapctx);

		this.pendingChangesToSave = "ALL";

	}

	removePreviousTempFeat(p_mapctx, b_test_for_singlefeat_editing) {

		let sfem = false;

		if (b_test_for_singlefeat_editing) {
			if (p_mapctx.cfgvar["basic"]["single_feat_editing_mode"] !== undefined) {
				sfem = p_mapctx.cfgvar["basic"]["single_feat_editing_mode"]; 
			}
		}

		if (sfem && this.currentEditFeatHolder.IsSet) {
			if (FeatureCollection.checkIdIsTemp(this.currentEditFeatHolder.Id)) {
				p_mapctx.featureCollection.remove(this.editingLayerKey, this.currentEditFeatHolder.Id);
			}
		}
	}

	// returns feat id
	addTempPointEditFeat(p_mapctx, p_terr_pt) {
		return p_mapctx.featureCollection.addTempFeature(this.editingLayerKey, [[...p_terr_pt]], {}, "point", 1)
	}	

	addNewVertex(p_mapctx, p_feat_geomtype, p_scrx, p_scry) {

		const terr_pt = [];
		let id;
		p_mapctx.transformmgr.getTerrainPt([p_scrx, p_scry], terr_pt);

		let sfem;
		if (p_mapctx.cfgvar["basic"]["single_feat_editing_mode"] === undefined) {
			sfem = false; 
		} else {
			sfem = p_mapctx.cfgvar["basic"]["single_feat_editing_mode"]; 
		}

		switch(p_feat_geomtype.toLowerCase()) {

			case "point":

				this.removePreviousTempFeat(p_mapctx, true);

				id = this.addTempPointEditFeat(p_mapctx, terr_pt);
				this.setCurrentEditFeatHolder(p_mapctx, { "id": id }, true);

				p_mapctx.featureCollection.redrawAllVectorLayers();

				break;

			case "line":

				break;

		}

		if (this.#single_feat_editing) {
			this.initialEditFeatureHolder = [JSON.parse(JSON.stringify(this.currentEditFeatHolder.toDict()))];
		} else {
			this.addEditFeatureHolder(this.currentEditFeatHolder.toDict());
		}

		this.print(p_mapctx);

		this.pendingChangesToSave = "GEO";

	}

	paintCurrentEditFeature(p_mapctx) {
		p_mapctx.featureCollection.featuredraw(this.editingLayerKey, this.currentEditFeatHolder.Id);
	}

	serialize2JSON(p_mapctx) {

		if (!this.currentEditFeatHolder.isSet) {
			throw new Error("serialize2GeoJSONLike, current_edit_feature is not set");
		}

		let ret = [], ats = [];

		const crs = p_mapctx.cfgvar.basic["crs"];

		if (this.editFeatureHolderLen() > 0 && this.pendingChangesToSave != "none") {

			if (this.#layeredit_cfg_attribs["attribs_to_save"] !== undefined) {
				ats = this.#layeredit_cfg_attribs["attribs_to_save"];
			}

			let currfeat, cef_feat;

			for (const cef of this.editFeatureHolderIter()) {

				cef_feat = p_mapctx.featureCollection.get(this.editingLayerKey, cef.id);
				if (cef_feat) {
					currfeat = { "feat": { "type": "Feature"} };
				} else {
					currfeat = { "gisid": cef["gisid"] };
				}

				// console.log("pendingChangesToSave:", this.pendingChangesToSave);

				if (cef_feat && ats.length > 0 && (this.pendingChangesToSave == "ALL" || this.pendingChangesToSave == "ALPHA")) {
					currfeat["feat"]["properties"] = {};
					for (let la of ats) {
						if (cef_feat.a[la] != null) {
							currfeat["feat"]["properties"][la] = cef_feat.a[la];
						}
					}
				}

				if (this.pendingChangesToSave == "ALL" || this.pendingChangesToSave == "GEO") {
					
					if (cef_feat) {

						switch (cef_feat.gt) {

							case "point":
								currfeat["feat"]["geometry"] = {
										"type": "Point",
										"coordinates": [...cef_feat.g[0]]
								};
								break;
	
							default:
								throw new Error(`serialize2GeoJSONLike, geom type '${cef_feat.gt}' still not supported`);
	
						}
	
						if (currfeat["feat"]["geometry"] !== undefined) {
							currfeat["feat"]["geometry"]["crs"] = crs;
						}

						// in case of deletion, gisid must be spared prior to deletion
						if (currfeat["gisid"] === undefined) {
							currfeat["gisid"] = cef_feat.a[this.#layeredit_cfg_attribs["gisid_field"]];
						} else {
							if (currfeat["gisid"] != cef_feat.a[this.#layeredit_cfg_attribs["gisid_field"]]) {
								throw new Error(`different GISID values while saving feature, current GISID: ${currfeat["gisid"]}, save feature:${cef_feat}`);
							}
						}
					}
				}

				ret.push(currfeat)
			}
		}

		return ret;		
	}

	genSavePayload(p_mapctx) {

		if (!this.currentEditFeatHolder.isSet) {
			throw new Error("genSavePayload, no current_edit_feature is set");
		}

		return {
			lname: this.editingLayerKey,
			//gisid: this.currentEditFeatHolder["feat"].a[this.#layeredit_cfg_attribs["gisid_field"]],
			featholders: this.serialize2JSON(p_mapctx),
			sessionid: this.#current_sessionid,
			mapname: p_mapctx.cfgvar.basic["mapname"]
		};

	}

	finishUpEditing(p_mapctx) {

		// Disable edit mode
		this.setEditingEnabled(p_mapctx, false);
		this.resetCurrentEditFeatureHolder();
		this.editFeatureHolderReset();
		this.print(p_mapctx);

		this.clearPendingChangesToSave();

		p_mapctx.maprefresh();		
	}

	save(p_mapctx) {

		if (this.pendingChangesToSave == "none") {

			// Nothing to save
			this.setEditingEnabled(p_mapctx, false);
			this.print(p_mapctx);
	
			return;
		}

		let that = this;
		let msgsctrlr = p_mapctx.getCustomizationObject().messaging_ctrlr;

		// publish confirm save message
		msgsctrlr.confirmMessage(

			p_mapctx.i18n.msg('WANT2SAVE', true), 
			true,
			(p_evt, p_result, p_value) => { 
				if (p_result) {
					fetch(this.#editing_layer_url,
						{
							method: "POST",
							body: JSON.stringify(that.genSavePayload(p_mapctx))
						}
					).then(
						response => response.json()
					).then(
						(responsejson) => {
							if (responsejson['state'] == 'NOTOK') {
								if (responsejson['reason'] !== undefined) {
									// saving process oreoaration failed
									console.error(responsejson['reason']);
								} else {
									// a batch of just one save operation failed
									console.error("error in save operation -- check risco server debug msgs table");
								}
								msgsctrlr.warn(p_mapctx.i18n.msg('EDITSAVEERROR',true));
								that.finishUpEditing(p_mapctx);
							} else if (responsejson['state'] == 'OK') {

								if (GlobalConst.getDebug("SAVERESULT")) {
									console.log(`[DBG:SAVERESULT] after save, response:${JSON.stringify(responsejson)}`);
								}

								that.execAfterSave(p_mapctx, responsejson, function() {
									that.finishUpEditing(p_mapctx);
								});
							} else {
								console.error("Unexpected edit save result:", responsejson);
								that.finishUpEditing(p_mapctx);
							}
						}						
					).catch(
						(error) => {
							console.error(`Error on saving edits: ${error}'`);
							that.finishUpEditing(p_mapctx);
							throw new Error(error);
						}						
					);

				} else {
					if (p_result !== null) {
						that.finishUpEditing(p_mapctx);
					}
				}
			},
			true // Add cancel
		);		
	}

	execAfterSave(p_mapctx, p_responsejson, p_callback_func) {

		if (p_responsejson["state"] !== undefined && p_responsejson["state"] == "OK") {

			if (p_responsejson["results"] !== undefined && p_responsejson["results"].length > 0) {
				for (let rec of p_responsejson["results"]) {
					if (rec["gisid"] === undefined || rec["gisid"] === null || rec["gisid"].length == 0) {
						p_mapctx.getCustomizationObject().messaging_ctrlr.warn(p_mapctx.i18n.msg('EDITLYRHASNOGISID', true));
					}
				}
			}

			console.assert(this.editingLayerKey != null, "editingLayerKey not defined at 'execAfterSave' function");

			const lyr = p_mapctx.tocmgr.getLayer(this.editingLayerKey);
	
			if (Object.keys(lyr.editcfg) < 1) {
				console.warn(`[WARN] edit layer '${this.editingLayerKey}' has no 'editcfg' defined in layer configs`);
			}
	
			if (lyr.editcfg["aftersave_func"] !== undefined) {
				const ic = p_mapctx.getCustomizationObject().interoperability_ctrlr;
				lyr.editcfg.aftersave_func(p_mapctx, FeatureCollection, this, lyr, ic, p_responsejson, p_callback_func);
			} else {
				console.warn(`[WARN] edit layer '${this.editingLayerKey}' has no 'editcfg.aftersave_func' defined in layer configs`);
				p_callback_func();
			}
	
		} else {

			console.error(`execAfterSave, save result in error: ${p_responsejson}`);
		}

	}

}