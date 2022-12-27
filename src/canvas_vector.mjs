
import {GlobalConst} from './constants.js';
import {GraticuleLayer, PointGridLayer, AreaGridLayer, AGSQryLayer} from './vectorlayers.mjs';
import { RiscoFeatsLayer } from './risco_ownlayers.mjs';
import {evalTextAlongPathViability, pathLength, findPolygonCentroid, dist2D, segmentMeasureToPoint, loopPathParts, distanceToLine, deg2Rad} from './geom.mjs';


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

				if (dx != 0 && dx != 0) {
					dlt = dy / Math.abs(dx);
					ang = Math.atan(dlt);
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

const canvasVectorMethodsMixin = (Base) => class extends Base {
	
	canvasKey = 'normal';
	canvasKeyLabels = 'labels';
	default_symbol;	
	fillflag = false;
	strokeflag = false;
	_gfctx;  // current graphics context to be always updated at each refreshing / drawing
	_currentsymb;

	_grabGf2DCtx(p_mapctx, b_forlabel, opt_alt_canvaskeys, opt_symbs) {

		let canvaskey;
		let canvaskeyLabels;

		if (opt_alt_canvaskeys) {
			canvaskey = opt_alt_canvaskeys["base"];
			canvaskeyLabels = opt_alt_canvaskeys["labels"];
		} else {
			canvaskey = this.canvasKey;
			canvaskeyLabels = this.canvasKeyLabels;
		}

		this._gfctx = p_mapctx.renderingsmgr.getDrwCtx(canvaskey, '2d');
		this._gfctx.save();

		this._gfctxlbl = p_mapctx.renderingsmgr.getDrwCtx(canvaskeyLabels, '2d');
		this._gfctxlbl.save();

		if (opt_symbs) {
			this._currentsymb = opt_symbs;
		} else {
			this._currentsymb = this.default_symbol;
		}	

		if (b_forlabel) {

			this.strokeflag = false;
	
			if (this._currentsymb.labelFillStyle !== undefined && this._currentsymb.labelFillStyle.toLowerCase() !== "none") {
				this._gfctxlbl.fillStyle = this._currentsymb.labelFillStyle;
				this.fillflag = true;
			}	

			let fontface='Helvetica', fntsz = 14;
			if (this._currentsymb.labelFontSizePX !== undefined) {
				fntsz = this._currentsymb.labelFontSizePX;
			}

			if (this._currentsymb.labelFontFace !== undefined) {
				fontface = this._currentsymb.labelFontFace;
			}			

			this._gfctxlbl.font = `${fntsz}px ${fontface}`;	
	
		} else {

			if (this._currentsymb.strokeStyle !== undefined && this._currentsymb.strokeStyle.toLowerCase() !== "none") {
				this._gfctx.strokeStyle = this._currentsymb.strokeStyle;
				this.strokeflag = true;
			}
	
			if (this._currentsymb.lineWidth !== undefined) {
				this._gfctx.lineWidth = this._currentsymb.lineWidth;
			}	
	
			if (this._currentsymb.fillStyle !== undefined && this._currentsymb.fillStyle.toLowerCase() !== "none") {
				this._gfctx.fillStyle = this._currentsymb.fillStyle;
				this.fillflag = true;
			}
		}
	
		//console.log(">>", strokeflag, fillflag);
		return true;
	}

	grabGf2DCtx(p_mapctx, opt_alt_canvaskey, opt_symbs) {
		return this._grabGf2DCtx(p_mapctx, false, opt_alt_canvaskey, opt_symbs);
	}

	grabLabelGf2DCtx(p_mapctx, opt_alt_canvaskey, opt_symbs) {
		return this._grabGf2DCtx(p_mapctx, true, opt_alt_canvaskey, opt_symbs);
	}	

	// must this.grabGf2DCtx first !	
	releaseGf2DCtx() {

		if (this._gfctx == null) {
			throw new Error(`graphics context was not previously grabbed for layer '${this.key}'`);
		}
		this._gfctx.restore();
		this._gfctx = null;
	
	}	

	// must this.grabGf2DCtx first !
	drawPath(p_mapctxt, p_coords, p_path_levels, opt_feat_id) {

		// console.log("pl:", p_path_levels);

		if (this._gfctx == null) {
			throw new Error(`graphics context was not previously grabbed for layer '${this.key}'`);
		}

		function innerCycle(pp_this, pp_root, pp_call_level, pp_path_level, pp_feat_id, pp_started) {
	
			let ptini=null, ptfim=null, ret = false, started=pp_started;
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

				if (this.strokeflag) {
					this._gfctx.stroke();
				}

				if (["poly", "point"].indexOf(this.geomtype) >= 0) {
					if (this.fillflag) {
						this._gfctx.fill();
					}
				}
			}

		}

		return true;		
	}

	drawLabel(p_mapctxt, p_coords, p_path_levels, p_labeltxt, opt_terrain_env) {

		if (this._gfctxlbl == null) {
			throw new Error(`label graphics context was not previously grabbed for layer '${this.key}'`);
		}

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
				this._gfctxlbl.fillStyle = this._currentsymb.labelMaskFillStyle;
				let count= 0;
				for (const [pt, ang, char, w, h] of textDrawData) {

					this._gfctxlbl.save();
					this._gfctxlbl.translate(pt[0], pt[1]);
					this._gfctxlbl.rotate(ang);
					this._gfctxlbl.translate(-pt[0], -pt[1]);

					// console.log(pt, w, h);

					if (count == 0) {
						this._gfctxlbl.fillRect(pt[0]-(w/2)-3, pt[1]-(h/2)-1, w+4, h+2);
					} else if (count == textDrawData.length - 1) {
						this._gfctxlbl.fillRect(pt[0]-(w/2)-1, pt[1]-(h/2)-1, w+2, h+2);
					} else {
						this._gfctxlbl.fillRect(pt[0]-(w/2)-1, pt[1]-(h/2)-1, w+4, h+2);
					}
					//console.log("..", char, pt)
					this._gfctxlbl.restore();

					count++;
				}
				this._gfctxlbl.restore();
			}

			this._gfctxlbl.save();
			for (const [pt, ang, char, w, h] of textDrawData) {

				this._gfctxlbl.save();
				this._gfctxlbl.translate(pt[0], pt[1]);
				this._gfctxlbl.rotate(ang);
				this._gfctxlbl.translate(-pt[0], -pt[1]);

				this._gfctxlbl.fillText(char, ...pt)
				//console.log("..", char, pt)
				this._gfctxlbl.restore();

			}
			this._gfctxlbl.restore();
				
		} else if (placement == "centroid") {

			let lpt=[], cpt = [], pt=[], finalpt=[], rot=null;
			let minarea = p_mapctxt.getScale() / 100.0;
	
			if (this._currentsymb.labelRotation.toString().toLowerCase() != "none") {
				if (isNaN(this._currentsymb.labelRotation)) {
					throw new Error("invalid label rotation:", this._currentsymb.labelRotation);
				}

				rot = deg2Rad(this._currentsymb.labelRotation);
			}

			if (this.geomtype == "point") {

				if (p_path_levels == 1) 
					lpt = [...p_coords];
				else if (p_path_levels == 2)
					lpt = [...p_coords[0]];

			} else {

				cpt.length = 2;
				loopPathParts(p_coords, p_path_levels, function(p_pathpart, o_cpt) {
					for (let pi=0; pi<p_pathpart.length; pi++) {
						if (pi==0) {
							o_cpt[0] = p_pathpart[pi][0];  
							o_cpt[1] = p_pathpart[pi][1];  
						} else {
							o_cpt[0] = (pi * o_cpt[0] + p_pathpart[pi][0] ) / (pi + 1);
							o_cpt[1] = (pi * o_cpt[1] + p_pathpart[pi][1] ) / (pi + 1);
						}
					}
				}, cpt);

				if (this.geomtype == "line") {

					// distanceToLine to obtain projection point in line
					distanceToLine(p_coords, p_path_levels, cpt, minarea, false, lpt); 

				} else if (this.geomtype == "poly") {

					lpt = findPolygonCentroid(p_coords, p_path_levels, cpt, GlobalConst.LBL_QUANTIZE_SIZE);

				}

			}

			if (lpt.length < 1) {
				throw new Error("empty label anchor point");
			}			
			p_mapctxt.transformmgr.getRenderingCoordsPt(lpt, pt);

			if (this._currentsymb.labelLeaderLength != "none") {

				let leadrot = 0;
				if (this._currentsymb.labelLeaderRotation != "none") {
					leadrot = deg2Rad(this._currentsymb.labelLeaderRotation);
				}

				this._gfctxlbl.save();
				
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

				this._gfctxlbl.restore();

			} else {
				finalpt = pt;
			}

			this._gfctxlbl.save();
			if (rot != null) {
				this._gfctxlbl.translate(finalpt[0], finalpt[1]);
				this._gfctxlbl.rotate(rot);
				this._gfctxlbl.translate(-finalpt[0], -finalpt[1]);	
			}
			this._gfctxlbl.fillText(p_labeltxt, ...finalpt);
			this._gfctxlbl.restore();

		}

		return true;	
	}

	refreshitem(p_mapctxt, p_coords, p_attrs, p_path_levels, opt_feat_id, opt_alt_canvaskeys, opt_symbs, opt_terrain_env) {

		let ret = true;
		let pathoptsymbs = null;
		let lbloptsymbs = null;
		let lblcontent = null;
		let labelfield = null;

		if (this['labelfield'] !== undefined && this['labelfield'] != "none") {
			labelfield = this['labelfield'];
		}

		if (opt_symbs) {
			if (opt_symbs['path'] !== undefined)
				pathoptsymbs = opt_symbs['path'];
			if (opt_symbs['label'] !== undefined)
				lbloptsymbs = opt_symbs['label'];
		}

		if (this.grabGf2DCtx(p_mapctxt, opt_alt_canvaskeys, pathoptsymbs)) {
			try {
				ret = this.drawPath(p_mapctxt, p_coords, p_path_levels, opt_feat_id);
			} catch(e) {
				console.log(p_coords, p_path_levels);
				throw e;
			} finally {
				this.releaseGf2DCtx();
			}				
		}

		if (ret && labelfield != null) {
		
			lblcontent = null;
			if (p_attrs[labelfield] !== undefined) {
				lblcontent = p_attrs[labelfield];
			} else if (opt_feat_id != null && GlobalConst.TYPICAL_OIDFLDNAMES.indexOf(labelfield.toLowerCase()) >= 0) {
				lblcontent = opt_feat_id.toString();
			}

			if (lblcontent !== null) {

				/* if (p_attrs["cod_topo"] != "JMOLI0") {
					return;
				}*/

				if (this.grabLabelGf2DCtx(p_mapctxt, opt_alt_canvaskeys, lbloptsymbs)) {
					try {
						ret = this.drawLabel(p_mapctxt, p_coords, p_path_levels, lblcontent, opt_terrain_env);
					} catch(e) {
						console.log(p_coords, labelfield, lblcontent);
						throw e;
					} finally {
						this.releaseGf2DCtx();
					}				
				}
			}

		}

		return ret;

	}	
}

export class CanvasGraticuleLayer extends canvasVectorMethodsMixin(GraticuleLayer) {

	simplerefreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_path_levels) {

		const ok = this.grabGf2DCtx(p_mapctxt);

		if (ok && !this.strokeflag && !this.fillflag) {
			throw new Error(`Layer ${this.key}, no 'dostroke' and no 'dofill' flags, nothin to draw`);
		}

		if (ok) {
			try {
				this._gfctx.beginPath();
				this._gfctx.moveTo(p_coords[0], p_coords[1]);
				this._gfctx.lineTo(p_coords[2], p_coords[3]);

				if (this.strokeflag) {
					this._gfctx.stroke();
				};
				if (this.fillflag) {
					this._gfctx.fill();
				};


			} catch(e) {
				throw e;
			} finally {
				this.releaseGf2DCtx();
			}
		}

		return true;		
	}
}

export class CanvasPointGridLayer extends canvasVectorMethodsMixin(PointGridLayer) {

	simplerefreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_path_levels) {

		const ok = this.grabGf2DCtx(p_mapctxt);

		if (ok && !this.strokeflag && !this.fillflag) {
			throw new Error(`Layer ${this.key}, no 'stroke' and no 'fill' flags, nothin to draw`);
		}

		if (ok) {
			try {

				this.default_symbol.drawsymb(p_mapctxt, this, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs)

			} catch(e) {
				throw e;
			} finally {
				this.releaseGf2DCtx();
			}
		}

		return true;		
	}	
}

export class CanvasAreaGridLayer extends canvasVectorMethodsMixin(AreaGridLayer) {

	simplerefreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_path_levels) {

		const ok = this.grabGf2DCtx(p_mapctxt);

		if (ok && !this.strokeflag && !this.fillflag) {
			throw new Error(`Layer ${this.key}, no 'stroke' and no 'fill' flags, nothin to draw`);
		}

		if (ok) {
			try {
				this._gfctx.beginPath();
				let cnt = 0, cpt=[];

				for (let pt of p_coords) {

					p_mapctxt.transformmgr.getRenderingCoordsPt(pt, cpt);

					if (cnt < 1) {
						this._gfctx.moveTo(...cpt);
					} else {
						this._gfctx.lineTo(...cpt);
					}
					cnt++;
				}
				if (this.strokeflag) {
					this._gfctx.stroke();
				};
				if (this.fillflag) {
					this._gfctx.fill();
				};
			} catch(e) {
				throw e;
			} finally {
				this.releaseGf2DCtx();
			}
		}

		return true;		
	}
}

export class CanvasAGSQryLayer extends canvasVectorMethodsMixin(AGSQryLayer) {

	/*
	refreshitem(p_mapctxt, p_coords, p_attrs, p_path_levels, opt_feat_id, opt_alt_canvaskey, opt_symbs, opt_terrain_env) {

		let ret = true;

		if (this.grabGf2DCtx(p_mapctxt, opt_alt_canvaskey, opt_symbs)) {

			try {

				ret = this.drawPath(p_mapctxt, p_coords, p_path_levels, opt_feat_id);

			} catch(e) {
				throw e;
			} finally {
				this.releaseGf2DCtx();
			}	
			
		}

		return ret;

	}
	*/
}

export class CanvasRiscoFeatsLayer extends canvasVectorMethodsMixin(RiscoFeatsLayer) {

	/*
	refreshitem(p_mapctxt, p_coords, p_attrs, p_path_levels, opt_feat_id, opt_alt_canvaskey, opt_symbs, opt_terrain_env) {

		let ret = true;
		let pathoptsymbs = null;
		let lbloptsymbs = null;
		let lblcontent = null;
		let labelfield = null;

		if (this['labelfield'] !== undefined && this['labelfield'] != "none") {
			labelfield = this['labelfield'];
		}

		if (opt_symbs) {
			if (opt_symbs['path'] !== undefined)
				pathoptsymbs = opt_symbs['path'];
			if (opt_symbs['label'] !== undefined)
				lbloptsymbs = opt_symbs['label'];
		}

		if (this.grabGf2DCtx(p_mapctxt, opt_alt_canvaskey, pathoptsymbs)) {
			try {
				ret = this.drawPath(p_mapctxt, p_coords, p_path_levels, opt_feat_id);
			} catch(e) {
				console.log(p_coords, p_path_levels);
				throw e;
			} finally {
				this.releaseGf2DCtx();
			}				
		}

		if (ret && labelfield != null) {
		
			lblcontent = null;
			if (p_attrs[labelfield] !== undefined) {
				lblcontent = p_attrs[labelfield];
			} else if (opt_feat_id != null && GlobalConst.TYPICAL_OIDFLDNAMES.indexOf(labelfield.toLowerCase()) >= 0) {
				lblcontent = opt_feat_id.toString();
			}

			if (lblcontent !== null) {

				// if (p_attrs["cod_topo"] != "JMOLI0") {
				//	return;
				//}

				if (this.grabLabelGf2DCtx(p_mapctxt, opt_alt_canvaskey, lbloptsymbs)) {
					try {
						ret = this.drawLabel(p_mapctxt, p_coords, p_path_levels, lblcontent, opt_terrain_env);
					} catch(e) {
						console.log(p_coords, labelfield, lblcontent);
						throw e;
					} finally {
						this.releaseGf2DCtx();
					}				
				}
			}

		}

		return ret;

	}
	*/


}

