
import {GlobalConst} from './constants.js';
import {GraticuleLayer, PointGridLayer, AreaGridLayer, AGSQryLayer} from './vectorlayers.mjs';
import { RiscoFeatsLayer } from './risco_ownlayers.mjs';
import {evalTextAlongPathViability, pathLength, dist2D, segmentMeasureToPoint, deg2Rad, lineMeasureToPoint, lineExtremePoints, getFeatureCenterPoint } from './geom.mjs';
import { diffDays } from './utils.mjs';  // Can be called in 'varstyles' on 'iconsrcfunc' functions


function textDrawParamsAlongStraightSegmentsPath(p_mapctxt, p_gfctx, p_path_coords, p_labeltxt, p_label_len, out_data) {

	const ubRendCoordsFunc = p_mapctxt.transformmgr.getRenderingCoordsPt;
	const pl = pathLength(p_path_coords, 1, ubRendCoordsFunc.bind(p_mapctxt.transformmgr));

	let cursor_position;
	let poppable_string = (' ' + p_labeltxt).slice(1);

	out_data.length = 0;

	function partLoop(pp_root, pp_path_level, p_prevstops, p_cursor_position, p_char, p_charw, out_txtparams) {

		let d, ar, meas, seccount = 50;
		let pt1, acclength = 0, ring;
		const pt=[], xpt=[];

		let done, ri;
		for (let pti=0; pti<pp_root.length; pti++) {

			if (typeof pp_root[pti][0] != 'number') {

				partLoop(pp_root[pti], pp_path_level-1, p_prevstops, p_cursor_position, p_char, p_charw, out_txtparams);

			} else {

				pt1 = null;
				done = false;

				if (p_prevstops[pp_path_level] !== undefined && p_prevstops[pp_path_level][pti] !== undefined) {
					ri = p_prevstops[pp_path_level][pti]["ri"];
					acclength = p_prevstops[pp_path_level][pti]["al"];
					pt1 = p_prevstops[pp_path_level][pti]["pt1"];
				} else {
					ri = 0;
				}

				while (ri<pp_root.length && !done && seccount >= 0) {

					seccount--;
					
					// passar ponto a coordenadas do ecrã
					p_mapctxt.transformmgr.getRenderingCoordsPt(pp_root[ri], pt);

					if (pt1 == null) {

						pt1 = [...pt];

					} else {

						d = dist2D(pt1, pt);
						acclength += d;

						if (acclength > p_cursor_position) {

							meas = (p_cursor_position - acclength + d) / d;
							segmentMeasureToPoint(pt1, pt, meas, xpt)

							out_txtparams.push([[...xpt], p_charw, p_char]);

							if (p_prevstops[pp_path_level] === undefined) {
								p_prevstops[pp_path_level] = {};
							}							
							p_prevstops[pp_path_level][pti] = {
								"ri": ri,
								"al": p_cursor_position,
								"pt1": xpt
							}							
							done = true;
						}
						pt1 = [...pt];
					}
					ri++;
				}

				break;
			}
		}
	}

	let char=null, prevstops = {}, seccount = 200, prev_out_data=[];
	let prevang=null, ang, dx, dy, charw = 0;
	if (p_path_coords.length > 0) {
		cursor_position = (pl - p_label_len) / 2.0;
		while(cursor_position < pl && seccount > 0) {

			seccount--;
			partLoop(p_path_coords, 1, prevstops, cursor_position, char, charw, prev_out_data);

			if (poppable_string.length < 1) {
				break;
			}

			char = poppable_string.charAt(0);
			poppable_string = poppable_string.slice(1);
			charw = p_gfctx.measureText(char).width;
			cursor_position += charw;
		}
	}
	if (prev_out_data.length > 0) {
		let tm, dlt, prevpt = null, desc=0, asc=0, h;
		for (const [pt, w, char] of prev_out_data) {
			tm = p_gfctx.measureText(char);
			asc = Math.max(asc, tm.actualBoundingBoxAscent);
			desc = Math.max(desc, tm.actualBoundingBoxDescent);
		}
		h = asc + desc;
		for (const [pt, w, char] of prev_out_data) {
			if (prevpt != null) {

				dy = pt[1] - prevpt[1];
				dx = pt[0] - prevpt[0];

				if (dx != 0) {
					dlt = dy / Math.abs(dx);
					ang = Math.atan(dlt);
				} else {
					if (dx * dy < 0) {
						ang = Math.PI / 2.0;
					} else {
						ang = - Math.PI / 2.0;
					}
				}

				if (prevang != null && Math.abs(ang - prevang) > (3 * Math.PI / 7)) {
					ang = ang / 2;
				}

				out_data.push([[prevpt[0]+(dx/2), prevpt[1]+(dy/2)], ang, char, w, h]);
				prevang = ang;
			}
			prevpt = [...pt];
		}
	}

}

export const canvasVectorMethodsMixin = (Base) => class extends Base {
	
	canvasKey = 'normal';
	canvasKeyLabels = 'label';
	default_symbol = "none";	
	default_sel_symbol = "none";	
	varstyles_symbols = [];
	msgsdict = {};
	maptipfields = {}; // 'add' and 'remove'
	infocfg = {};
	editcfg = {};
	// _gfctx, _gfctxlbl, _currentsymb has underscore to protect from automatic attribute collection from config files
	_gfctx = null;  // current graphics context to be always updated at each refreshing / drawing
	_gfctxlbl = null;
	_currentsymb = null;

	utils_for_varstyles = {"diffDays": diffDays};

	// b_protect_from_async_use - during async use, this._gfctx should be permanent and not constantly saved and restored.
	// To be only used for applying drawImage symbols, context state shouldn't be altered
	_grabGf2DCtx(p_mapctx, b_forlabel, opt_attrs, opt_alt_canvaskeys, opt_symbs) {

		let canvaskey;
		let canvaskeyLabels;

		if (opt_alt_canvaskeys) {
			canvaskey = opt_alt_canvaskeys["normal"];
			canvaskeyLabels = opt_alt_canvaskeys["label"];
		} else {
			canvaskey = this.canvasKey;
			canvaskeyLabels = this.canvasKeyLabels;
		}

		// _gfctx has underscore to protect from automatic attribute collection from config files
		if (b_forlabel) {
			try {
				this._gfctxlbl = p_mapctx.renderingsmgr.getDrwCtx(canvaskeyLabels, '2d');
				// Requires definition of global var _GLOBAL_SAVE_RESTORE_CTRLbl
				// _GLOBAL_SAVE_RESTORE_CTRLbl++;
				this._gfctxlbl.save();
			} catch(e) {
				console.error("_grabGf2DCtx, canvaskeyLabels:", canvaskeyLabels, opt_alt_canvaskeys, this.canvasKeyLabels);
				throw e;
			}	
		} else {
			try {
				this._gfctx = p_mapctx.renderingsmgr.getDrwCtx(canvaskey, '2d');
				// _GLOBAL_SAVE_RESTORE_CTR++;
				this._gfctx.save();
			} catch(e) {
				console.error("canvaskey:", canvaskey, opt_alt_canvaskeys, this.canvasKey);
				throw e;
			}
	
		}

		if (opt_symbs) {
			this._currentsymb = opt_symbs;
		} else {
			this._currentsymb = this.default_symbol;
			if (this["varstyles_symbols"]!==undefined && opt_attrs) {

				let chgresult;
				for (let vi=0; vi<this.varstyles_symbols.length; vi++) {

					if (this.varstyles_symbols[vi]["func"] !== undefined && this.varstyles_symbols[vi].func(this.utils_for_varstyles, p_mapctx.getScale(), opt_attrs)) {
						
						this._currentsymb = this.varstyles_symbols[vi];
						if (this.varstyles_symbols[vi]["change"] !== undefined && this.varstyles_symbols[vi]["change"] != "none") {
							chgresult = this.varstyles_symbols[vi].change(p_mapctx.getScale(), p_mapctx.getPixSize(), opt_attrs)
						} else {
							chgresult = null;
						}

						if (chgresult) {
							for (let k in chgresult) {
								if (chgresult.hasOwnProperty(k)) {
									this._currentsymb[k] = chgresult[k];
								}
							}
						}

						break;
					}
				}
			}	
		}	

		if (b_forlabel) {

			this._currentsymb.setLabelStyle(this._gfctxlbl);
	
			if (this._currentsymb.labelFillStyle !== undefined && this._currentsymb.labelFillStyle.toLowerCase() !== "none") {
				this._gfctxlbl.fillStyle = this._currentsymb.labelFillStyle;
				//this.fillflag = true;
			}	

			let fontface='sans-serif', fntsz = 14;
			if (this._currentsymb.labelFontSizePX !== undefined) {
				fntsz = this._currentsymb.labelFontSizePX;
			}

			if (this._currentsymb.labelFontFace !== undefined) {
				fontface = this._currentsymb.labelFontFace;
			}			

			this._gfctxlbl.font = `${fntsz}px ${fontface}`;	
	
		} else {

			try {
				this._currentsymb.setStyle(this._gfctx);
			} catch(e) {
				console.error(e);
				console.log(this._currentsymb.constructor.name);
			}

		}
	
		return true;
	}

	grabGf2DCtx(p_mapctx, opt_attrs, opt_alt_canvaskey, opt_symbs, b_protect_from_async_use) {
		return this._grabGf2DCtx(p_mapctx, false, opt_attrs, opt_alt_canvaskey, opt_symbs, b_protect_from_async_use);
	}

	grabLabelGf2DCtx(p_mapctx, opt_attrs, opt_alt_canvaskey, opt_symbs, b_protect_from_async_use) {
		return this._grabGf2DCtx(p_mapctx, true, opt_attrs, opt_alt_canvaskey, opt_symbs, b_protect_from_async_use);
	}	

	// must this.grabGf2DCtx first !	
	releaseGf2DCtx() {

		if (this._gfctx == null) {
			console.error(`releaseGf2DCtx, graphics context was not previously grabbed for layer '${this.key}'`);
			return;
		}
/* 		_GLOBAL_SAVE_RESTORE_CTR--;
		if (_GLOBAL_SAVE_RESTORE_CTR < 0) {
			console.log("Neg _GLOBAL_SAVE_RESTORE_CTR, canvas_vector releaseGf2DCtx:", _GLOBAL_SAVE_RESTORE_CTR);
		} */
		this._gfctx.restore();
		this._gfctx = null;
	
	}	

	releaseLabelGf2DCtx() {

		if (this._gfctxlbl == null) {
			throw new Error(`label graphics context was not previously grabbed for layer '${this.key}'`);
		}
/* 		_GLOBAL_SAVE_RESTORE_CTRLbl--;
		if (_GLOBAL_SAVE_RESTORE_CTRLbl < 0) {
			throw new Error(`Neg _GLOBAL_SAVE_RESTORE_CTRLbl, releaseLabelGf2DCtx: ${_GLOBAL_SAVE_RESTORE_CTRLbl}`);
		}	 */	
		this._gfctxlbl.restore();
		this._gfctxlbl = null;
	
	}		

	drawMarker(p_mapctxt, p_coords, opt_feat_args, opt_feat_id, opt_symb) {

		if (this._gfctx == null) {
			return Promise.reject(new Error(`graphics context was not previously grabbed for layer '${this.key}'`));
		}

		if (!Array.isArray(p_coords) ||  p_coords.length != 2 || typeof p_coords[0] != 'number') {
			console.error("pc:", p_coords);
			return Promise.reject(new Error(`p_coords doesn't contain point, for layer '${this.key}'`));
		}

		const pt = [];
		let ret_promise = null, the_url="";
		p_mapctxt.transformmgr.getRenderingCoordsPt(p_coords, pt);

		try {
			if (opt_symb) {

				this._gfctx.save();
				// _GLOBAL_SAVE_RESTORE_CTR++;
				try {
					opt_symb.setStyle(this._gfctx);
					opt_symb.drawsymb(p_mapctxt, this, pt);
					ret_promise = Promise.resolve();
				} finally {
/* 					_GLOBAL_SAVE_RESTORE_CTR--;
					if (_GLOBAL_SAVE_RESTORE_CTR < 0) {
						console.log("Neg _GLOBAL_SAVE_RESTORE_CTR, canvas_vector drawMarker drawsymb:", _GLOBAL_SAVE_RESTORE_CTR);
					} */
					this._gfctx.restore();
				}	

			} else {

				if (this["iconsrcfunc"] !== undefined && this["iconsrcfunc"] !== 'none') {

					if (this.iconmarkervalue !== undefined && this.iconmarkervalue != 'none') {
						the_url = this.iconsrcfunc(this.iconmarkervalue);
					} else {
						the_url = this.iconsrcfunc(opt_feat_args);
					}
				}

				if (this._currentsymb['drawsymbAsync'] !== undefined) {

					ret_promise = new Promise((resolve, reject) => {
						this._currentsymb.drawsymbAsync(p_mapctxt, this, pt, opt_feat_args, (the_url.slice(0,5) == "data:"), opt_feat_id).then(
							() => {
								resolve();
							}
						).catch((e) => {
							reject(e);
						});
					});

				} else {

					this._currentsymb.drawsymb(p_mapctxt, this, pt);
					ret_promise = Promise.resolve();
				}
			}
		} catch(e) {
			console.error(this,  pt, opt_feat_id);
			console.error(this._currentsymb);
			console.log("error:", e)
			throw e;
		}

		if (ret_promise) {
			return ret_promise;
		} else {
			return Promise.reject(new Error(`internal error, drawMarker, no promise received for layer:${this.key} id:${opt_feat_id}`));
		}
			
	}

	// must this.grabGf2DCtx first !
	drawPath(p_mapctxt, p_coords, p_path_levels, opt_feat_id) {

		if (this._gfctx == null) {
			throw new Error(`graphics context was not previously grabbed for layer '${this.key}'`);
		}

		function innerCycle(pp_this, pp_root, pp_call_level, pp_path_level, pp_feat_id, pp_started) {
	
			let ptini=null, ptfim=null, ret = false, started = pp_started;
			let retobj;
			const pt=[];

			for (let pti=0; pti<pp_root.length; pti++) {

				if (typeof pp_root[pti][0] != 'number' && ptini == null) {

					retobj = innerCycle(pp_this, pp_root[pti], pp_call_level+1, pp_path_level-1, pp_feat_id, started);
					ret = retobj[0];
					started = retobj[1];

				} else {

					if (ptini==null) {

						if (pp_path_level != 1) {
							console.error(`[WARN] non-zero bottom path level on layer '${pp_this.key}', feat.id:${pp_feat_id}`);
						}

						ptini = pp_root[pti].slice(0);

						if (!started) {

							started = true;
							if (GlobalConst.DEBUG_CANVASVECTOR_PATHCLOSING == pp_this.key && GlobalConst.DEBUG_CANVASVECTOR_PATHCLOSING_FEATID == pp_feat_id) {
								console.log(`[DEBUG_FEAT] begin path on ${pp_feat_id}`)
							}
		
							pp_this._gfctx.beginPath();
						}
								
					}

					ptfim = pp_root[pti].slice(0);
					p_mapctxt.transformmgr.getRenderingCoordsPt(pp_root[pti], pt);

					if (pti == 0){
						pp_this._gfctx.moveTo(...pt);
					} else {
						pp_this._gfctx.lineTo(...pt);
					}

				}
			}

			if (ptini != null) {

				if (GlobalConst.TOLERANCEDIST_RINGCLOSED >= dist2D(ptini, ptfim)) {

					if (GlobalConst.DEBUG_CANVASVECTOR_PATHCLOSING == pp_this.key && GlobalConst.DEBUG_CANVASVECTOR_PATHCLOSING_FEATID == pp_feat_id) {
						console.log(`[DEBUG_FEAT] closing path on ${pp_feat_id}`)
					}

					pp_this._gfctx.closePath();
				}

				ret = true;

			}

			return [ret, started];
		}

		if (p_coords.length > 0) {

			let retobj = innerCycle(this, p_coords, 0, p_path_levels, opt_feat_id, false);
			let ret = retobj[0];

			if (ret) {

				if (["poly", "point"].indexOf(this.geomtype) >= 0) {
					if (this._currentsymb.toFill) {
						this._gfctx.fill();
					}
				}

				if (this._currentsymb.toStroke) {
					this._gfctx.stroke();
				}

				// to reset ...
				this._gfctx.beginPath();
			}

		}
	}

	drawLabel(p_mapctxt, p_coords, p_path_levels, p_labeltxt, opt_terrain_env) {

		if (this._gfctxlbl == null) {
			throw new Error(`label graphics context was not previously grabbed for layer '${this.key}'`);
		}

		/* if (p_labeltxt != "Avenida dos Aliados") {
			return true;
		} */

		const tl = this._gfctxlbl.measureText(p_labeltxt).width;

		this._gfctxlbl.textAlign = this._currentsymb.labelTextAlign;
		this._gfctxlbl.textBaseline = this._currentsymb.labelTextBaseline;
		
		// if geometry is point, 'centroid' placement is default and only allowed
		let placement, tmpp;
		if ([2,3].indexOf(p_coords.length) >= 0 && typeof p_coords[0] == 'number') {
			placement = "centroid";
		} else {

			tmpp = this._currentsymb.labelplacement.toLowerCase();
			if (tmpp == "along" && this.geomtype !== "line") {
				throw new Error("Label placement 'along' on non-line geometry type.");
			}
			placement = tmpp;
		}

		if (placement == "along") {

			const path = evalTextAlongPathViability(p_mapctxt, p_coords, p_path_levels, tl, opt_terrain_env);
			if (path == null) {
				return;
			}
	
			const textDrawData=[];
			textDrawParamsAlongStraightSegmentsPath(p_mapctxt, this._gfctxlbl, path, p_labeltxt, tl, textDrawData);

			// Draw a rectangular mask behind each letter
			if (this._currentsymb.labelMaskFillStyle.toLowerCase() != "none") {
				
				this._gfctxlbl.save();
				// _GLOBAL_SAVE_RESTORE_CTRLbl++;
				this._gfctxlbl.fillStyle = this._currentsymb.labelMaskFillStyle;
				let count= 0;
				for (const [pt, ang, char, w, h] of textDrawData) {

					this._gfctxlbl.save();
					// _GLOBAL_SAVE_RESTORE_CTRLbl++;
					this._gfctxlbl.translate(pt[0], pt[1]);
					this._gfctxlbl.rotate(ang);
					this._gfctxlbl.translate(-pt[0], -pt[1]);

					if (count == 0) {
						this._gfctxlbl.fillRect(pt[0]-(w/2)-3, pt[1]-(h/2)-1, w+4, h+2);
					} else if (count == textDrawData.length - 1) {
						this._gfctxlbl.fillRect(pt[0]-(w/2)-1, pt[1]-(h/2)-1, w+2, h+2);
					} else {
						this._gfctxlbl.fillRect(pt[0]-(w/2)-1, pt[1]-(h/2)-1, w+4, h+2);
					}

/* 					_GLOBAL_SAVE_RESTORE_CTRLbl--;
					if (_GLOBAL_SAVE_RESTORE_CTRLbl < 0) {
						console.log("Neg _GLOBAL_SAVE_RESTORE_CTRLbl, canvas_vector drawLabel labelMaskFillStyle cycle:", _GLOBAL_SAVE_RESTORE_CTRLbl);
					} */

					this._gfctxlbl.restore();

					count++;
				}
/* 				_GLOBAL_SAVE_RESTORE_CTRLbl--;
				if (_GLOBAL_SAVE_RESTORE_CTRLbl < 0) {
					console.log("Neg _GLOBAL_SAVE_RESTORE_CTRLbl, canvas_vector drawLabel out of labelMaskFillStyle cycle:", _GLOBAL_SAVE_RESTORE_CTRLbl);
				} */
				this._gfctxlbl.restore();
			}

			this._gfctxlbl.save();
			for (const [pt, ang, char, w, h] of textDrawData) {

				this._gfctxlbl.save();
				// _GLOBAL_SAVE_RESTORE_CTRLbl++;
				this._gfctxlbl.translate(pt[0], pt[1]);
				this._gfctxlbl.rotate(ang);
				this._gfctxlbl.translate(-pt[0], -pt[1]);

				this._gfctxlbl.fillText(char, ...pt)

/* 				_GLOBAL_SAVE_RESTORE_CTRLbl--;
				if (_GLOBAL_SAVE_RESTORE_CTRLbl < 0) {
					console.log("Neg _GLOBAL_SAVE_RESTORE_CTRLbl, canvas_vector drawLabel labelMaskFillStyle cycle:", _GLOBAL_SAVE_RESTORE_CTRLbl);
				} */

				this._gfctxlbl.restore();

			}
			/*_GLOBAL_SAVE_RESTORE_CTRLbl--;
			if (_GLOBAL_SAVE_RESTORE_CTRLbl < 0) {
				console.log("Neg _GLOBAL_SAVE_RESTORE_CTRLbl, canvas_vector drawLabel out of cycle:", _GLOBAL_SAVE_RESTORE_CTRLbl);
			}
			this._gfctxlbl.restore();*/
				
		} else if (placement == "centroid") {

			let minarea = p_mapctxt.getScale() / 100.0;
			const lpt = getFeatureCenterPoint(this.geomtype, p_path_levels, p_coords, minarea);

			let pt=[], finalpt=[], rot=null;

			if (lpt.length < 1) {
				throw new Error("empty label anchor point");
			}
			if (lpt.length == 1) {		
				p_mapctxt.transformmgr.getRenderingCoordsPt(lpt[0], pt);
			} else if (lpt.length == 2) {
				p_mapctxt.transformmgr.getRenderingCoordsPt(lpt, pt);
			} else {
				throw new Error(`drawLabel, feature center point`);
			}

			if (this._currentsymb.labelLeaderLength != "none") {

				let leadrot = 0;
				if (this._currentsymb.labelLeaderRotation != "none") {
					leadrot = deg2Rad(this._currentsymb.labelLeaderRotation);
				}

				this._gfctxlbl.save();
				// _GLOBAL_SAVE_RESTORE_CTRLbl++;
				
				if (this._currentsymb.labelLeaderStroke != "none") {
					this._gfctxlbl.strokeStyle = this._currentsymb.labelLeaderStroke;
				}
				if (this._currentsymb.labelLeaderLinewidth != "none") {
					this._gfctxlbl.lineWidth = this._currentsymb.labelLeaderLinewidth;
				}

				this._gfctxlbl.beginPath();
				this._gfctxlbl.moveTo(...pt);

				finalpt.length = 2;
				finalpt[0] = pt[0] + this._currentsymb.labelLeaderLength * Math.cos(leadrot);
				finalpt[1] = pt[1] + this._currentsymb.labelLeaderLength * Math.sin(leadrot);
				this._gfctxlbl.lineTo(...finalpt);
				this._gfctxlbl.stroke();

/* 				_GLOBAL_SAVE_RESTORE_CTRLbl--;
				if (_GLOBAL_SAVE_RESTORE_CTRLbl < 0) {
					console.log("Neg _GLOBAL_SAVE_RESTORE_CTRLbl, canvas_vector drawLabel label leader:", _GLOBAL_SAVE_RESTORE_CTRLbl);
				} */	
				this._gfctxlbl.restore();

			} else {
				finalpt = pt;
			}

			let cx, cy;
			if (this._currentsymb['labelPositionShift'] !== undefined && this._currentsymb.labelPositionShift.length >= 2) {
				cx = this._currentsymb.labelPositionShift[0] + finalpt[0];
				cy = this._currentsymb.labelPositionShift[1] + finalpt[1];
			} else {
				cx = finalpt[0];
				cy = finalpt[1];
			}

			this._gfctxlbl.save();
			// _GLOBAL_SAVE_RESTORE_CTRLbl++;
			if (rot != null) {
				this._gfctxlbl.translate(cx, cy);
				this._gfctxlbl.rotate(rot);
				this._gfctxlbl.translate(-cx, -cy);	
			}

			if (this._currentsymb['labelShadowColor'] !== undefined && this._currentsymb.labelShadowColor != "none") {
				this._gfctxlbl.shadowColor = this._currentsymb['labelShadowColor'];
			}

			if (this._currentsymb['labelShadowBlur'] !== undefined && this._currentsymb.labelShadowBlur != "none") {
				this._gfctxlbl.shadowBlur = this._currentsymb['labelShadowBlur'];
			}

			if (this._currentsymb['labelShadowOffsetX'] !== undefined && this._currentsymb.labelShadowOffsetX != "none") {
				this._gfctxlbl.shadowOffsetX = this._currentsymb['labelShadowOffsetX'];
			}

			if (this._currentsymb['labelShadowOffsetY'] !== undefined && this._currentsymb.labelShadowOffsetY != "none") {
				this._gfctxlbl.shadowOffsetY = this._currentsymb['labelShadowOffsetY'];
			}

			this._gfctxlbl.fillText(p_labeltxt, cx, cy);
/* 			_GLOBAL_SAVE_RESTORE_CTRLbl--;
			if (_GLOBAL_SAVE_RESTORE_CTRLbl < 0) {
				console.log("Neg _GLOBAL_SAVE_RESTORE_CTRLbl, canvas_vector drawLabel label centroid:", _GLOBAL_SAVE_RESTORE_CTRLbl);
			} */	
			this._gfctxlbl.restore();

		} else if (placement == "extend") {
		
			if (this._currentsymb.labelextend.toLowerCase() == "none") {
				throw new Error("Empty 'labelextend' config, needs filling");
			}

			// "meas-inner-offset:length-outer-offset:symbol-name-or-none"
			const [innermeas_str, outer_len_str, symb_name] = this._currentsymb.labelextend.split(':');
			const innermeas = parseFloat(innermeas_str);
			const outer_len = parseFloat(outer_len_str);

			const pt = [], extpts=[], ep=[];
			let ang, dy, dx, dy2, dx2, anchpt;
			lineMeasureToPoint(p_coords, p_path_levels, innermeas, p_mapctxt.transformmgr.getRenderingCoordsPt.bind(p_mapctxt.transformmgr), pt);			
			lineExtremePoints(p_coords, p_path_levels, extpts);

			if (innermeas < 0.5) {
				p_mapctxt.transformmgr.getRenderingCoordsPt(extpts[0], ep);
				dx = ep[0] - pt[0];
				dy = ep[1] - pt[1];
			} else {
				p_mapctxt.transformmgr.getRenderingCoordsPt(extpts[1], ep);
				dx = pt[0] - ep[0];
				dy = pt[1] - ep[1];				
			}

			ang = Math.atan(dy/dx);
			dx2 = outer_len * Math.cos(ang);
			dy2 = outer_len * Math.sin(ang);

			if (dx < 0) {
				this._gfctxlbl.textAlign = "right";
				anchpt = [ep[0]-dx2, ep[1]-dy2];
			} else {
				this._gfctxlbl.textAlign = "left";
				anchpt = [ep[0]+dx2, ep[1]+dy2];
			}

			this._gfctxlbl.save();
			//_GLOBAL_SAVE_RESTORE_CTRLbl++;
			if (ang != 0) {
				this._gfctxlbl.translate(...anchpt);
				this._gfctxlbl.rotate(ang);
				this._gfctxlbl.translate(-anchpt[0], -anchpt[1]);	
			}

			p_mapctxt.transformmgr.getRenderingCoordsPt(anchpt, pt);
			this._gfctxlbl.fillText(p_labeltxt, ...anchpt);

			let a, a1;

			switch (symb_name) {

				case "invarrow":
					this._gfctxlbl.beginPath();
					a = outer_len / 5;
					a1 = outer_len / 4;
					if (dx < 0) {
						this._gfctxlbl.moveTo(anchpt[0]+a, anchpt[1]);
						this._gfctxlbl.lineTo(anchpt[0]+outer_len-2, anchpt[1]+a1);
						this._gfctxlbl.lineTo(anchpt[0]+outer_len-2, anchpt[1]-a1);
					} else {
						this._gfctxlbl.moveTo(anchpt[0]-a, anchpt[1]);
						this._gfctxlbl.lineTo(anchpt[0]-outer_len+2, anchpt[1]+a1);
						this._gfctxlbl.lineTo(anchpt[0]-outer_len+2, anchpt[1]-a1);
					}
					this._gfctxlbl.fill();
		
					break;

				case "arrow":
					this._gfctxlbl.beginPath();
					a = outer_len / 5;
					a1 = outer_len / 4;
					if (dx < 0) {
						this._gfctxlbl.moveTo(anchpt[0]+outer_len-2, anchpt[1]);
						this._gfctxlbl.lineTo(anchpt[0]+a, anchpt[1]+a1);
						this._gfctxlbl.lineTo(anchpt[0]+a, anchpt[1]-a1);
					} else {
						this._gfctxlbl.moveTo(anchpt[0]-outer_len+2, anchpt[1]);
						this._gfctxlbl.lineTo(anchpt[0]-a, anchpt[1]+a1);
						this._gfctxlbl.lineTo(anchpt[0]-a, anchpt[1]-a1);
					}
					this._gfctxlbl.fill();
		
					break;
	
			}

/* 			_GLOBAL_SAVE_RESTORE_CTRLbl--;
			if (_GLOBAL_SAVE_RESTORE_CTRLbl < 0) {
				console.log("Neg _GLOBAL_SAVE_RESTORE_CTRLbl, canvas_vector drawLabel label extend:", _GLOBAL_SAVE_RESTORE_CTRLbl);
			} */	
			this._gfctxlbl.restore();

		}

		return true;	
	}

	_refreshitem_feature(p_mapctxt, p_coords, p_attrs, p_path_levels, opt_feat_id, opt_alt_canvaskeys, opt_symbs) {

		let ret_promise = null;
		let groptsymbs = null;
		let doit = false;
		let return_error = null;

		if (opt_symbs) {

			if (opt_symbs['graphic'] !== undefined) {
				groptsymbs = opt_symbs['graphic'];
			}
		}

		if (this.grabGf2DCtx(p_mapctxt, p_attrs, opt_alt_canvaskeys, groptsymbs)) {
			try {

				doit = true;
				if (this["varstyles_symbols"]!==undefined) {
					for (let vi=0; vi<this.varstyles_symbols.length; vi++) {										
						if (this.varstyles_symbols[vi]["func"] !== undefined && this.varstyles_symbols[vi].func(this.utils_for_varstyles, p_mapctxt.getScale(), p_attrs)) {							
							if (this.varstyles_symbols[vi]["hide"] !== undefined && this.varstyles_symbols[vi]["hide"]) {
								doit = false;
							}
							break;
						}
					}
				}

				if (doit) {

					if (this.geomtype == "point") {

						ret_promise = new Promise((resolve, reject) => {

							this.drawMarker( p_mapctxt, p_coords[0], p_attrs, opt_feat_id, (groptsymbs!=null && groptsymbs['drawsymb']!==undefined ? groptsymbs : null)).then(
								() => {
									this.releaseGf2DCtx();		
									resolve();		
								}
							).catch((e) => {
								reject(e);								
							});	
						})

					} else {

						this.drawPath(p_mapctxt, p_coords, p_path_levels, opt_feat_id);
						this.releaseGf2DCtx();
						ret_promise = Promise.resolve();
					}

				} else {	
					ret_promise = Promise.resolve();
				}

			} catch(e) {
				console.error(p_coords, p_path_levels, this.geomtype);
				return_error = e;
			}				
		}

		if (return_error) {
			return Promise.reject(return_error);
		} else {
			if (ret_promise) {
				return ret_promise;
			} else {
				return Promise.reject(new Error(`internal error, _refreshitem_feature, no promise received for layer:${this.key} id:${opt_feat_id}`));
			}
		}

	}

	_refreshitem_label(p_mapctxt, p_coords, p_attrs, p_path_levels, opt_feat_id, opt_alt_canvaskeys, opt_symbs, opt_terrain_env) {

		let lbloptsymbs = null;
		let lblcontent = null;
		let labelfield = null;
		let labelscaleinterval = null;
		let labelfunc = null;

		if (this['labelfield'] !== undefined && this['labelfield'] != "none") {
			labelfield = this['labelfield'];
		}

		if (this['labelscaleinterval'] !== undefined && this['labelscaleinterval'] != "none") {
			labelscaleinterval = this['labelscaleinterval'];
		}
		else {
			labelscaleinterval = [-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
		}
		if (this['labelfunc'] !== undefined && this['labelfunc'] != "none") {
			labelfunc = this['labelfunc'];
		}

		if (opt_symbs) {
			if (opt_symbs['label'] !== undefined) {
				lbloptsymbs = opt_symbs['label'];
			}
		}

		const sv = p_mapctxt.transformmgr.getReadableCartoScale();
		if (labelfield != null && sv >= labelscaleinterval[0] && sv <= labelscaleinterval[1]) {

			lblcontent = null;
			if (p_attrs[labelfield] !== undefined) {
				lblcontent = p_attrs[labelfield];
			} else if (opt_feat_id != null && GlobalConst.TYPICAL_OIDFLDNAMES.indexOf(labelfield.toLowerCase()) >= 0) {
				lblcontent = opt_feat_id.toString();
			}

			if (labelfunc) {
				lblcontent = labelfunc(lblcontent);
			}			

			if (lblcontent !== null) {

				if (this.grabLabelGf2DCtx(p_mapctxt, p_attrs, opt_alt_canvaskeys, lbloptsymbs)) {
					try {
						this.drawLabel(p_mapctxt, p_coords, p_path_levels, lblcontent, opt_terrain_env);
					} catch(e) {
						console.error(p_coords, labelfield, lblcontent);
						console.error(e);
					} finally {
						this.releaseLabelGf2DCtx();
					}				
				}
			}

		}

	}

	refreshitem(p_mapctxt, p_coords, p_attrs, p_path_levels, opt_feat_id, opt_alt_canvaskeys, opt_symbs, opt_terrain_env) {

		const that = this;
		return new Promise((resolve, reject) => {
			that._refreshitem_feature(p_mapctxt, p_coords, p_attrs, p_path_levels, opt_feat_id, opt_alt_canvaskeys, opt_symbs).then(
				() => {
					that._refreshitem_label(p_mapctxt, p_coords, p_attrs, p_path_levels, opt_feat_id, opt_alt_canvaskeys, opt_symbs, opt_terrain_env);
					resolve();
				}
			).catch((e) => {
				reject(e);
			});
		});

	}

}

export class CanvasGraticuleLayer extends canvasVectorMethodsMixin(GraticuleLayer) {

}

export class CanvasPointGridLayer extends canvasVectorMethodsMixin(PointGridLayer) {

}

export class CanvasAreaGridLayer extends canvasVectorMethodsMixin(AreaGridLayer) {

}

export class CanvasAGSQryLayer extends canvasVectorMethodsMixin(AGSQryLayer) {

}

export class CanvasRiscoFeatsLayer extends canvasVectorMethodsMixin(RiscoFeatsLayer) {

}

