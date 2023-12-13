import {I18n} from './i18n.mjs';
import {GlobalConst} from './constants.js';
import {ctrToolTip, MapPrintInRect} from './customization_canvas_baseclasses.mjs';

export class EditingMgr extends MapPrintInRect {

	#current_sessionid;
	#current_user;
	#current_user_canedit;
	#editing_is_enabled;
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

	#current_edit_feature;
	#current_edit_partidx;
	#current_edit_vertexidx;
	#current_tool;
	#pending_changes_to_save;
	#layeredit_cfg_attribs;

	constructor(p_mapctx, p_editable_layers, p_other_widgets) {

		super();
		this.name = "EditingMgr";

		this.other_widgets = p_other_widgets;

		this.editable_layers = p_editable_layers;
		this.#current_sessionid = null;
		this.#current_user = null;
		this.#current_user_canedit = false;
		this.#editing_is_enabled = false;
		this.#editing_layer_key = null;
		this.#editing_layer_url = null;
		this.#current_tool = null;
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

		this.left = 600;
		this.top = 600;

		this.expandenv = 1;
		this.prevboxenv = null;

		this.print_attempts = 0;
		this.had_prev_interaction = false;

		this.#current_edit_feature = null;

		p_mapctx.toolmgr.setEditingManager(this);
	}

	getHeight() {
		return this.boxh;
	}

	_print(p_mapctx) {

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		let mapdims = [];
		p_mapctx.renderingsmgr.getCanvasDims(mapdims);

		const icondims = GlobalConst.CONTROLS_STYLES.EM_ICONDIMS;

		this.boxh = icondims[1] + 2 * this.margin_offset;
		this.boxw = icondims[0] + 2 * this.margin_offset;

		this.left = mapdims[0] - (this.boxw + this.margin_offset);

		try {

			let otherboxesheight = 0;
			for (let ow of this.other_widgets) {
				if (ow['setdims'] !== undefined) {
					ow.setdims(p_mapctx, mapdims);
				}		
				otherboxesheight += ow.getHeight();
				// console.warn("AM boxesheight:", otherboxesheight, this.other_widgets.length);
			}

			this.top = otherboxesheight + 2 * this.margin_offset;
			this.bottom = this.top + this.boxh;
	
			// background
			
			// BASIC_CONFIG_DEFAULTS_OVERRRIDE ctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
			if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["em_bckgrd"] !== undefined) {
				ctx.fillStyle = p_mapctx.cfgvar["basic"]["style_override"]["em_bckgrd"];
			} else {
				ctx.fillStyle = this.fillStyleBack;
			}

			this.top = this.bottom - this.boxh;

			const dee = 2 * this.expandenv;
			ctx.clearRect(this.left-this.expandenv, this.top-this.expandenv, this.boxw+dee, this.boxh+dee); 	

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
				ctx.drawImage(img, this.left+this.margin_offset, this.top+this.margin_offset, icondims[0], icondims[1]);
			});

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

						const ci = p_mapctx.getCustomizationObject();
						if (ci == null) {
							throw new Error("map context customization instance is missing")
						}

						// Toggle edit mode
						this.setEditingEnabled(p_mapctx, !this.isEditingEnabled());
						this.print(p_mapctx);

						if (!this.isEditingEnabled()) {
							this.save(p_mapctx);
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

	precheckCanEditStatus() {
		let ret = true;
		if (this.#current_user == null) {
			console.error("checkEditionStatus: no current user");
			ret = false;
		};
		if (!this.#current_user_canedit) {
			console.error("checkEditionStatus: current user cannot edit");
			ret = false;
		};		
		
		console.info("[INFO] is PRE edit status OK?:", ret);

		return ret;
	}

	checkCanEditStatus(b_before_enable_editing) {
		let ret = true;

		if (this.#current_sessionid == null) {
			console.error("checkEditionStatus: no current session id");
			ret = false;
		};

		if (this.#current_user == null) {
			console.warn("[WARN] checkEditionStatus: no current user");
		};
		if (!this.#current_user_canedit) {
			console.warn("[WARN] checkEditionStatus: current user cannot edit");
		};		
		if (!b_before_enable_editing && !this.#editing_is_enabled) {
			console.error("checkEditionStatus: editing not enabled");
			ret = false;
		};	
		if (this.#editing_layer_key == null) {
			console.error("checkEditionStatus: no editing layer key defined");
			ret = false;
		};	
		
		console.info("[INFO] is edit status OK?:", ret);

		return ret;
	}
	
	setCurrentUser(p_sessionid, p_username, b_user_canedit) {
		this.#current_sessionid = p_sessionid;
		this.#current_user = p_username;
		this.#current_user_canedit = b_user_canedit;
	}

	set editingLayerKey(p_key) {
		this.#editing_layer_key = p_key;
	}

	get editingLayerKey() {
		return this.#editing_layer_key;
	}
	
	get hasPendingChangesToSave() {
		return this.#pending_changes_to_save;
	}

	clearPendingChangesToSave() {
		this.#pending_changes_to_save = "none";
	}	

	defineEditingLayer(p_mapctx) {

		const work_layerkeys = [], editables= {}, types=[];
		let lyr, constraints = null, tmp;

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

		const lyrks = Object.keys(editables);
		const sz = lyrks.length;

		// temp_layer_key here works as variable passed by reference
		const temp_layer_key = [];
		const layeredit_cfg_attrib_names = ["gisid", "attribs_to_save"];

		if (sz == 0) {

			console.error("defineEditingLayer: no editable layers, check all layer 'layereditable' attribute in layer config");

		} else if (sz > 1) {

			if (this.editingLayerKey) {
				constraints = {
					"selected": this.editingLayerKey
				}
			}

			p_mapctx.getCustomizationObject().messaging_ctrlr.selectInputMessage(
				p_mapctx.i18n.msg('SELEDITLYR', true), 
				editables,
				(evt, p_result, p_value) => { 
					if (p_value) {
						temp_layer_key.push(p_value);
					}
				},
				constraints
			);

		} else {

			// this.editingLayerKey = lyrks[0];
			temp_layer_key.push(lyrks[0]);

		}

		if (temp_layer_key.length > 0) {

			lyr = p_mapctx.tocmgr.getLayer(temp_layer_key[0]);
			if (lyr == null) {
				throw new Error(`defineEditingLayer, layer '${temp_layer_key[0]}' not defined`);
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
					this.#current_tool = 'SimplePointEditTool';
					break;

				default:
					throw new Error(`geom type '${types[temp_layer_key[0]]}', for layer key '${temp_layer_key[0]}', has no edit tool associated for now`);
			}

			for (let k of layeredit_cfg_attrib_names) {
				this.#layeredit_cfg_attribs[k] = lyr.layereditable[k];
			}			

			this.editingLayerKey = temp_layer_key[0];
			temp_layer_key.length = 0;

			this.#editing_layer_url = (lyr.url.endsWith("/") ? lyr.url : lyr.url + "/") + "save";

		}
	}
	
	setEditingEnabled(p_mapctx, p_editing_tobe_enabled) {
		
		if (p_editing_tobe_enabled) {
			if(this.precheckCanEditStatus()) {

				this.defineEditingLayer(p_mapctx);

				// adicionar presel feats
				if (!this.checkCanEditStatus(true)) {
					throw new Error("Cannot enable editing");
				}
				this.#editing_is_enabled = true;

				// ativar tool
				const tool = p_mapctx.toolmgr.enableTool(p_mapctx, this.#current_tool, true);
				tool.init(p_mapctx);
			
			}		
		} else {

			console.assert(this.#current_tool != null, "current_tool not defined");

			// desativar tool
			p_mapctx.toolmgr.enableTool(p_mapctx, this.#current_tool, false);
			this.#current_tool = null;

			this.#editing_is_enabled = false;

			p_mapctx.clearInteractions('EDITMGR3', true);
		}		
	}	

	isEditingEnabled() {
		return this.#editing_is_enabled;
	}
	
	setCurrentEditFeature(p_feat_dict) {

		const fd_keys = Object.keys(p_feat_dict);
		let ret = null;

		if (fd_keys.length == 0) {
			console.warn("[WARN] setCurrentEditFeature, empty feat dict passed");
			return;
		}

		if (p_feat_dict[this.editingLayerKey] === undefined) {
			throw new Error(`editing layer ${this.editingLayerKey} not in edit features ${fd_keys}`);
		}

		if (p_feat_dict[this.editingLayerKey].length == 0) {
			console.warn(`[WARN] setCurrentEditFeature, feat dict with no elements for editing layer '${this.editingLayerKey}'`);
			return;
		} else if (p_feat_dict[this.editingLayerKey].length > 1) {
			throw new Error(`setCurrentEditFeature, feat dict with MORE THAN ONE element for editing layer '${this.editingLayerKey}'`);
		} else {
			this.#current_edit_feature = p_feat_dict[this.editingLayerKey][0];
			ret = this.#current_edit_feature;
		}

		console.log("464 >", this.#current_edit_feature);

		return ret;

	}

	setCurrentEditVertex(p_geompartidx, p_vertorderidx) {

		this.#current_edit_partidx = p_geompartidx;
		this.#current_edit_vertexidx = p_vertorderidx;
	}

	editCurrentVertex(p_mapctx, p_scrx, p_scry) {

		if (this.#current_edit_feature == null) {
			throw new Error("editCurrentVertex, no current editing feature");
		}
		if (this.#current_edit_partidx == null) {
			throw new Error("editCurrentVertex, no current editing feature part index");
		}
		if (this.#current_edit_vertexidx == null) {
			throw new Error("editCurrentVertex, no current editing vertex index");
		}	
	
		const feat = this.#current_edit_feature.feat;
		
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
			
			const terr_pt = [];
			p_mapctx.transformmgr.getTerrainPt([p_scrx, p_scry], terr_pt);
	
			feat.g[0][0] = terr_pt[0];
			feat.g[0][1] = terr_pt[1];

			this.#pending_changes_to_save = "GEO";
				
		}

	}

	getCurrentEditFeature() {
		return this.#current_edit_feature;
	}

	resetCurrentEditFeature() {
		this.#current_edit_feature = null;
	}	

	serialize2JSON(p_crs) {

		if (this.#current_edit_feature == null) {
			throw new Error("serialize2GeoJSONLike, no current_edit_feature defined");
		}

		let ret = {};

		if (this.hasPendingChangesToSave != "none") {

			let cef = this.#current_edit_feature["feat"];
			ret["type"] = "Feature";

			if (this.#layeredit_cfg_attribs["attribs_to_save"].length > 0 && (this.hasPendingChangesToSave == "ALL" || this.hasPendingChangesToSave == "ALPHA")) {
				ret["properties"] = {};
				for (let la of this.#layeredit_cfg_attribs["attribs_to_save"]) {
					if (cef.a[la] != null) {
						ret["properties"][la] = cef.a[la];
					}
				}
			}

			if (this.hasPendingChangesToSave == "ALL" || this.hasPendingChangesToSave == "GEO") {
				
				switch (cef.gt) {

					case "point":
						ret["geometry"] = {
								"type": "Point",
								"coordinates": [...cef.g[0]]
						};
						break;

					default:
						throw new Error(`serialize2GeoJSONLike, geom type '${cef.gt}' still not supported`);

				}

				if (ret["geometry"] !== undefined) {
					ret["geometry"]["crs"] = p_crs;
				}
			}

		}

		return ret;		
	}

	genSavePayload(p_mapctx) {

		if (this.#current_edit_feature == null) {
			throw new Error("genSavePayload, no current_edit_feature defined");
		}

		return {
			lname: this.editingLayerKey,
			gisid: this.#current_edit_feature["feat"].a[this.#layeredit_cfg_attribs["gisid"]],
			featjson: this.serialize2JSON(p_mapctx.cfgvar.basic["crs"]),
			sessionid: this.#current_sessionid,
			mapname: p_mapctx.cfgvar.basic["mapname"]
		};

	}

	save(p_mapctx) {

		if (this.hasPendingChangesToSave == "none") {
			return;
		}

		let that = this;
		// publish confirm save message
		p_mapctx.getCustomizationObject().messaging_ctrlr.confirmMessage(
			p_mapctx.i18n.msg('WANT2SAVE', true), 
			true,
			(p_evt, p_result, p_value) => { 
				if (p_result) {
					console.log("SALVAR!");
					fetch(this.#editing_layer_url,
						{
							method: "POST",
							body: JSON.stringify(that.genSavePayload(p_mapctx))
						}
					).then(
						response => response.json()
					).then(
						(responsejson) => {
							console.log("----- resposta responsejson -----");
							console.log(responsejson);
						}						
					).catch();

				} else {
					that.clearPendingChangesToSave();
					p_mapctx.maprefresh();
				}
			}
		);		
	}	
}