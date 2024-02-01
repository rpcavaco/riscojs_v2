import {GlobalConst} from './constants.js';
import { ctrToolTip, ControlsBox } from './customization_canvas_baseclasses.mjs';

export class EditCtrlBox extends ControlsBox {

	prev_ctrl_key = null;
	had_prev_interaction; 
	editmgr;

	constructor(p_mapctx, p_orientation, p_anchoring_twoletter, p_other_widgets, p_editmgr) {
		super(p_mapctx, p_orientation, p_anchoring_twoletter, p_other_widgets, p_mapctx.cfgvar["basic"]["editcontrols"]);

		this.editmgr = p_editmgr;

 		this.controls_keys = [
			"delete"
		];

		this.controls_state["delete"] = { "togglable": false, "togglestatus": false, "disabled": true, "hidden": true };
		const that = this;

		this.controls_funcs = {
			"delete": {
				"drawface": function(p_ctrlsbox, p_ctx, p_left, p_top, p_width, p_height, p_basic_config, p_global_constants, p_control_state) {

					let imgsrc, iconwidth, ctrlsize, offset, tmp_color;
					const imgh = new Image();
					imgh.decoding = "sync";

					if (p_control_state.disabled) {
						tmp_color = p_ctrlsbox.strokeStyleFrontOff;
					} else {
						tmp_color = p_ctrlsbox.strokeStyleFront;
					}

					imgsrc = p_basic_config["editcontrols"]["delsymb"].replace(/%23000000/g, `${encodeURIComponent(tmp_color)}`);
					iconwidth = p_basic_config["editcontrols"]["iconwidth"];
					ctrlsize = p_mapctx.cfgvar["basic"]["editcontrols"]["controlssize"];
					offset = (ctrlsize - iconwidth) / 2;

					imgh.src = imgsrc;
					imgh.decode()
					.then(() => {
						p_ctx.drawImage(imgh, p_left + offset, p_top + offset, iconwidth, iconwidth);
					}).catch((e) => {
						console.error(e);
					});
				},
				"endevent": function(p_mapctx, p_evt, p_basic_config, p_global_constants, p_control_state) {
					
					that.editmgr.deleteCurrentEditFeat(p_mapctx);

					p_control_state.disabled = true;

					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "default";

					return true; // not togglable
				},
				"mmoveevent": function(p_mapctx, p_evt, p_basic_config, p_global_constants) {
					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "pointer";

					ctrToolTip(p_mapctx, p_evt, p_mapctx.i18n.msg('DEL', true));
				}
			}	
		}

		this.had_prev_interaction = false;
	}

	_initParameters(p_config_namespaceroot) {

		this.fillStyleBack = p_config_namespaceroot.bckgrd; 
		this.strokeStyleFront = p_config_namespaceroot.color;
		this.fillStyleBackOn = p_config_namespaceroot.bckgrdon; 
		this.strokeStyleFrontOff = p_config_namespaceroot.coloroff;

		this.strokeWidth = p_config_namespaceroot.STROKEWIDTH;
		this.sz = p_config_namespaceroot.controlssize;
		this.margin_offset = p_config_namespaceroot.margin_offset;

	}

	initialDrawingActions(p_ctx, p_control_key, p_control_state) {

		const [left, top, boxw, boxh] = this.controls_boxes[p_control_key];
		const offset = 2;

		p_ctx.clearRect(left-offset, top-offset, boxw+(2*offset), boxh+(2*offset)); 

		if (this.controls_state[p_control_key].hidden) {
			return;
		}
		
		p_ctx.strokeStyle = this.strokeStyleFront; // box outer stroke only affected by disabled status
		if (p_control_state.togglestatus) {
			p_ctx.fillStyle = this.fillStyleBackOn;
		} else {
			p_ctx.fillStyle = this.fillStyleBack;
		}

		if (this.controls_rounded_face.includes(p_control_key)) {

			p_ctx.beginPath();
			p_ctx.arc(left+(boxw/2), top+(boxh/2), boxw/2, 0, Math.PI * 2, true);

			p_ctx.fill();
			p_ctx.stroke();


		} else {
			p_ctx.fillRect(left, top, boxw, boxh);		
			p_ctx.strokeRect(left, top, boxw, boxh);
		}

	}

	drawControlFace(p_ctx, p_control_key, p_left, p_top, p_width, p_height, p_basic_config, p_global_constants) {

		// console.log("trls funcs:", Object.keys(this.controls_funcs));

		if (this.controls_funcs[p_control_key] !== undefined) {
			if (this.controls_funcs[p_control_key]["drawface"] !== undefined) {
				this.initialDrawingActions(p_ctx, p_control_key, this.controls_state[p_control_key]);
				if (!this.controls_state[p_control_key].hidden) {
					this.controls_funcs[p_control_key]["drawface"](this, p_ctx, p_left, p_top, p_width, p_height, p_basic_config, p_global_constants, this.controls_state[p_control_key]);
				}
			} else {
				console.error(`drawControlFace, missing DRAWFACE control func block for ${p_control_key}`);
			}
		} else {
			console.error(`drawControlFace, missing control funcs block for ${p_control_key}`);
		}

	}

	// interaction -- called from toolmgrOnEvent (tool manager)
	interact(p_mapctx, p_evt) {

		let ret = false;
		// console.trace("XYZZ");
		const ctrl_key = super.interact(p_mapctx, p_evt);

		if (GlobalConst.getDebug("INTERACTION")) {
			console.log("[DBG:INTERACTION] EDITCTRLBX, event, control key:", p_evt, ctrl_key);
		}

		if (ctrl_key) {

			this.prev_ctrl_key = ctrl_key;

			if (this.controls_funcs[ctrl_key] !== undefined) {

				switch(p_evt.type) {

					case 'touchend':
					case 'mouseup':

						if (this.controls_funcs[ctrl_key]["endevent"] !== undefined) {
							const ret = this.controls_funcs[ctrl_key]["endevent"](p_mapctx, p_evt, p_mapctx.cfgvar["basic"], GlobalConst, this.controls_state[ctrl_key]);

							this.print(p_mapctx);
							
							// TODO - maybe to remove as no edit control is expected to be togglable

							if (this.changeToggleFlag(ctrl_key, ret)) {
								
								const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
								ctx.save();
						
								try {
									const [left, top, boxw, boxh] = this.controls_boxes[ctrl_key];
									this.drawControlFace(ctx, ctrl_key, left, top, boxw, boxh, p_mapctx.cfgvar["basic"], GlobalConst);
								} catch(e) {
									throw e;
								} finally {
									ctx.restore();
								}
							}
						} else {
							throw new Error("interact, missing endevent control func block for", ctrl_key);
						}
						break;

					case "mousemove":

						if (this.controls_funcs[ctrl_key]["mmoveevent"] !== undefined) {
							this.controls_funcs[ctrl_key]["mmoveevent"](p_mapctx, p_evt, p_mapctx.cfgvar["basic"], GlobalConst);
						} else {
							throw new Error("interact, missing mmoveevent control func block for", ctrl_key);
						}

				}

			} else {
				throw new Error("interact, missing control funcs block for", ctrl_key);
			}

			ret = true;
			if (!this.had_prev_interaction) {
				p_mapctx.clearInteractions('EDITCTRLBOX');
			}
			this.had_prev_interaction = true;

		} else {

			if (this.prev_ctrl_key) {

				// emulating mouseout

				this.prev_ctrl_key = null;

				const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
				topcnv.style.cursor = "default";

				p_mapctx.clearInteractions('EDITCTRLBOX');
				
			}
			this.had_prev_interaction = false;

		}

		return ret;
	}

	controlsDisabling(p_ctrlkeys_list, b_do_disable) {
		
		let ctrls_keys;
		if (p_ctrlkeys_list == "all") {
			ctrls_keys = this.controls_keys;
		} else {
			ctrls_keys = p_ctrlkeys_list;
		}

		for (const k of ctrls_keys) {
			this.controls_state[k].disabled = !!b_do_disable;
		}	
	}
}

export class AdvTabletModeEditCtrlBox extends ControlsBox {

	prev_ctrl_key = null;
	had_prev_interaction; 
	editmgr;

	constructor(p_mapctx, p_orientation, p_anchoring_twoletter, p_other_widgets, p_editmgr) {
		super(p_mapctx, p_orientation, p_anchoring_twoletter, p_other_widgets, p_mapctx.cfgvar["basic"]["editcontrols"]);

		this.editmgr = p_editmgr;

 		this.controls_keys = [
			"select",
			"add"
		];

		this.controls_state["select"] = { "togglable": false, "togglestatus": false, "disabled": true, "hidden": true };
		this.controls_state["add"] = { "togglable": false, "togglestatus": false, "disabled": true, "hidden": true };
		const that = this;

		this.controls_funcs = {
			"select": {
				"drawface": function(p_ctrlsbox, p_ctx, p_left, p_top, p_width, p_height, p_basic_config, p_global_constants, p_control_state) {

					let imgsrc, iconwidth, ctrlsize, offset, tmp_color;
					const imgh = new Image();
					imgh.decoding = "sync";

					if (p_control_state.disabled) {
						tmp_color = p_ctrlsbox.strokeStyleFrontOff;
					} else {
						tmp_color = p_ctrlsbox.strokeStyleFront;
					}

					imgsrc = p_basic_config["editcontrols"]["advtablet_selsymb"].replace(/%23000000/g, `${encodeURIComponent(tmp_color)}`);
					iconwidth = p_basic_config["editcontrols"]["iconwidth"];
					ctrlsize = p_mapctx.cfgvar["basic"]["editcontrols"]["controlssize"];
					offset = (ctrlsize - iconwidth) / 2;

					imgh.src = imgsrc;
					imgh.decode()
					.then(() => {
						p_ctx.drawImage(imgh, p_left + offset, p_top + offset, iconwidth, iconwidth);
					}).catch((e) => {
						console.error(e);
					});
				},
				"endevent": function(p_mapctx, p_evt, p_basic_config, p_global_constants, p_control_state) {
					
					that.editmgr.deleteCurrentEditFeat(p_mapctx);

					p_control_state.disabled = true;

					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "default";

					return true; // not togglable
				},
				"mmoveevent": function(p_mapctx, p_evt, p_basic_config, p_global_constants) {
					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "pointer";

					ctrToolTip(p_mapctx, p_evt, p_mapctx.i18n.msg('DEL', true));
				}
			}	
		}

		this.had_prev_interaction = false;
	}

	_initParameters(p_config_namespaceroot) {

		this.fillStyleBack = p_config_namespaceroot.bckgrd; 
		this.strokeStyleFront = p_config_namespaceroot.color;
		this.fillStyleBackOn = p_config_namespaceroot.bckgrdon; 
		this.strokeStyleFrontOff = p_config_namespaceroot.coloroff;

		this.strokeWidth = p_config_namespaceroot.STROKEWIDTH;
		this.sz = p_config_namespaceroot.controlssize;
		this.margin_offset = p_config_namespaceroot.margin_offset;

	}

	initialDrawingActions(p_ctx, p_control_key, p_control_state) {

		const [left, top, boxw, boxh] = this.controls_boxes[p_control_key];
		const offset = 2;

		p_ctx.clearRect(left-offset, top-offset, boxw+(2*offset), boxh+(2*offset)); 

		if (this.controls_state[p_control_key].hidden) {
			return;
		}
		
		p_ctx.strokeStyle = this.strokeStyleFront; // box outer stroke only affected by disabled status
		if (p_control_state.togglestatus) {
			p_ctx.fillStyle = this.fillStyleBackOn;
		} else {
			p_ctx.fillStyle = this.fillStyleBack;
		}

		if (this.controls_rounded_face.includes(p_control_key)) {

			p_ctx.beginPath();
			p_ctx.arc(left+(boxw/2), top+(boxh/2), boxw/2, 0, Math.PI * 2, true);

			p_ctx.fill();
			p_ctx.stroke();


		} else {
			p_ctx.fillRect(left, top, boxw, boxh);		
			p_ctx.strokeRect(left, top, boxw, boxh);
		}

	}

	drawControlFace(p_ctx, p_control_key, p_left, p_top, p_width, p_height, p_basic_config, p_global_constants) {

		// console.log("trls funcs:", Object.keys(this.controls_funcs));

		if (this.controls_funcs[p_control_key] !== undefined) {
			if (this.controls_funcs[p_control_key]["drawface"] !== undefined) {
				this.initialDrawingActions(p_ctx, p_control_key, this.controls_state[p_control_key]);
				if (!this.controls_state[p_control_key].hidden) {
					this.controls_funcs[p_control_key]["drawface"](this, p_ctx, p_left, p_top, p_width, p_height, p_basic_config, p_global_constants, this.controls_state[p_control_key]);
				}
			} else {
				console.error(`drawControlFace, missing DRAWFACE control func block for ${p_control_key}`);
			}
		} else {
			console.error(`drawControlFace, missing control funcs block for ${p_control_key}`);
		}

	}

	// interaction -- called from toolmgrOnEvent (tool manager)
	interact(p_mapctx, p_evt) {

		let ret = false;
		// console.trace("XYZZ");
		const ctrl_key = super.interact(p_mapctx, p_evt);

		if (GlobalConst.getDebug("INTERACTION")) {
			console.log("[DBG:INTERACTION] ADVTABMODE EDITCTRLBX, event, control key:", p_evt, ctrl_key);
		}

		if (ctrl_key) {

			this.prev_ctrl_key = ctrl_key;

			if (this.controls_funcs[ctrl_key] !== undefined) {

				switch(p_evt.type) {

					case 'touchend':
					case 'mouseup':

						if (this.controls_funcs[ctrl_key]["endevent"] !== undefined) {
							const ret = this.controls_funcs[ctrl_key]["endevent"](p_mapctx, p_evt, p_mapctx.cfgvar["basic"], GlobalConst, this.controls_state[ctrl_key]);

							this.print(p_mapctx);
							
							// TODO - maybe to remove as no edit control is expected to be togglable

							if (this.changeToggleFlag(ctrl_key, ret)) {
								
								const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
								ctx.save();
						
								try {
									const [left, top, boxw, boxh] = this.controls_boxes[ctrl_key];
									this.drawControlFace(ctx, ctrl_key, left, top, boxw, boxh, p_mapctx.cfgvar["basic"], GlobalConst);
								} catch(e) {
									throw e;
								} finally {
									ctx.restore();
								}
							}
						} else {
							throw new Error("interact, missing endevent control func block for", ctrl_key);
						}
						break;

				}

			} else {
				throw new Error("interact, missing control funcs block for", ctrl_key);
			}

			ret = true;
			if (!this.had_prev_interaction) {
				p_mapctx.clearInteractions('ADVTABMODE EDITCTRLBOX');
			}
			this.had_prev_interaction = true;

		} else {

			if (this.prev_ctrl_key) {

				// emulating mouseout

				this.prev_ctrl_key = null;

				const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
				topcnv.style.cursor = "default";

				p_mapctx.clearInteractions('ADVTABMODE EDITCTRLBOX');
				
			}
			this.had_prev_interaction = false;

		}

		return ret;
	}

	controlsDisabling(p_ctrlkeys_list, b_do_disable) {
		
		let ctrls_keys;
		if (p_ctrlkeys_list == "all") {
			ctrls_keys = this.controls_keys;
		} else {
			ctrls_keys = p_ctrlkeys_list;
		}

		for (const k of ctrls_keys) {
			this.controls_state[k].disabled = !!b_do_disable;
		}	
	}
}