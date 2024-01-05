import {GlobalConst} from './constants.js';
import { ctrToolTip, ControlsBox } from './customization_canvas_baseclasses.mjs';

export class EditCtrlBox extends ControlsBox {

	prev_ctrl_key = null;
	had_prev_interaction; 

	constructor(p_mapctx, p_orientation, p_anchoring_twoletter, p_other_widgets) {
		super(p_mapctx, p_orientation, p_anchoring_twoletter, p_other_widgets, p_mapctx.cfgvar["basic"]["editcontrols"]);

 		this.controls_keys = [
			"delete"
		];

		this.controls_funcs = {
			"delete": {
				"drawface": function(p_ctrlsbox, p_ctx, p_left, p_top, p_width, p_height, p_basic_config, p_global_constants, p_control_status) {

					let imgsrc, iconwidth, ctrlsize, offset;
					const imgh = new Image();
					imgh.decoding = "sync";

					// imgsrc = p_global_constants.CONTROLS_STYLES.DELSYMB.replace(/#000000/g, `=%22${encodeURIComponent(p_ctrlsbox.strokeStyleFront)}%22`);

					imgsrc = p_basic_config["editcontrols"]["delsymb"].replace(/%23000000/g, `${encodeURIComponent(p_ctrlsbox.strokeStyleFront)}`);
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
				"endevent": function(p_mapctx, p_evt, p_basic_config, p_global_constants) {
					p_mapctx.transformmgr.setScaleCenteredAtPoint(p_basic_config.scale, [p_basic_config.terrain_center[0], p_basic_config.terrain_center[1]], true);
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

		this.controls_status["delete"] = { "togglable": false, "togglestatus": false, "disabled": false };

		this.had_prev_interaction = false;
	}

	_initParameters(p_config_namespaceroot) {

		this.fillStyleBack = p_config_namespaceroot.bckgrd; 
		this.strokeStyleFront = p_config_namespaceroot.color;
		this.fillStyleBackOn = p_config_namespaceroot.bckgrdon; 
		this.strokeStyleFrontOn = p_config_namespaceroot.coloron;

		this.strokeWidth = p_config_namespaceroot.STROKEWIDTH;
		this.sz = p_config_namespaceroot.controlssize;
		this.margin_offset = p_config_namespaceroot.margin_offset;

	}

	initialDrawingActions(p_ctx, p_control_key, p_control_status) {

		const [left, top, boxw, boxh] = this.controls_boxes[p_control_key];

		p_ctx.clearRect(left, top, boxw, boxh); 

		if (this.all_controls_hidden) {
			return;
		}
		
		if (!p_control_status.disabled) {
			p_ctx.strokeStyle = this.strokeStyleFront; // box outer stroke only affected by disabled status
			if (p_control_status.togglestatus) {
				p_ctx.fillStyle = this.fillStyleBackOn;
			} else {
				p_ctx.fillStyle = this.fillStyleBack;
			}
		} else {
			// TODO - disabled control styles
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
				this.initialDrawingActions(p_ctx, p_control_key, this.controls_status[p_control_key]);
				this.controls_funcs[p_control_key]["drawface"](this, p_ctx, p_left, p_top, p_width, p_height, p_basic_config, p_global_constants, this.controls_status[p_control_key]);
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
							const ret = this.controls_funcs[ctrl_key]["endevent"](p_mapctx, p_evt, p_mapctx.cfgvar["basic"], GlobalConst);
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

}