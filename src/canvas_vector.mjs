
import {GlobalConst} from './constants.js';
import {GraticuleLayer, PointGridLayer, AreaGridLayer, AGSQryLayer} from './vectorlayers.mjs';
import { RiscoFeatsLayer } from './risco_ownlayers.mjs';
import {pathLength, dist2D, segmentMeasureToPoint, area2, loopPathParts} from './geom.mjs';


function evalTextAlongPathViability(p_mapctxt, p_coords, p_path_levels, p_labeltxtlen) {

	function qtize(p_val) {
		return parseInt(p_val / GlobalConst.LBL_QUANTIZE_SIZE);
	}

	function verticalityTest(p_dx, p_dy) {
		if (p_dx == 0) {
			return true;
		} else {
			return qtize(Math.abs(p_dy)) / qtize(Math.abs(p_dx)) > 2;
		}
	}

	if (p_coords.length < 1) {
		return null;
	}

	const ubRendCoordsFunc = p_mapctxt.transformmgr.getRenderingCoordsPt;
	const tl = p_labeltxtlen;
	let retobj = null;
	let globaldx = 0;

	// First, check if there is enough horizontal on near-horizontal continuous path to hold the whole text length.
	// If such path doesn't exist, include run same test including verticallly aligned segments.
	// In either case, delta - x must always be of same sign.

	let collected_paths = [];
	let check_verticality = true;
	let loop_count = 0;

	//console.log(p_coords);

	while(loop_count < 2) {

		loopPathParts(p_coords, p_path_levels, function(p_pathpart, p_collected_paths, p_check_verticality) { 
			
			let dx, dy, pl, prev_positive_dir=null;
			let current_collected_path = [];
			for (let pi=1; pi<p_pathpart.length; pi++) {
				
				dy = p_pathpart[pi][1] - p_pathpart[pi-1][1];
				dx = p_pathpart[pi][0] - p_pathpart[pi-1][0];

				//console.log("dx:", p_check_verticality, verticalityTest(dx, dy), p_pathpart[pi], prev_positive_dir, dx, (dx > 0));

				if ((p_check_verticality && verticalityTest(dx, dy)) || (prev_positive_dir!==null && prev_positive_dir != (dx > 0))) {
					if (current_collected_path.length > 0) {
						pl = pathLength(current_collected_path, 1, ubRendCoordsFunc.bind(p_mapctxt.transformmgr));
						if (tl <= GlobalConst.LBL_MAX_ALONGPATH_OCCUPATION * pl) {
							p_collected_paths.push([...current_collected_path]);
						}
						current_collected_path.length = 0;
					}
				} else {
					if (pi==1) {
						current_collected_path.push([...p_pathpart[pi-1]]);
					}
					current_collected_path.push([...p_pathpart[pi]]);
					//console.log("    --->", p_pathpart[pi]);
				}
				prev_positive_dir = (dx > 0);
			}
			if (current_collected_path.length > 0) {
				pl = pathLength(current_collected_path, 1, ubRendCoordsFunc.bind(p_mapctxt.transformmgr));
				//console.log(tl, pl, 0.98 * pl);
				//console.log(p_collected_paths);
				if (tl <= GlobalConst.LBL_MAX_ALONGPATH_OCCUPATION * pl) {
					p_collected_paths.push([...current_collected_path]);
				}
			}
		}, collected_paths, check_verticality);

		if (loop_count == 0 && collected_paths.length > 0) {
			break;
		}

		check_verticality = false;
		loop_count++;
	}

	// console.log(collected_paths);

	if (collected_paths.length > 0) {

		collected_paths.sort((a, b) => {
			return pathLength(b, 1) - pathLength(a, 1);
		})
	
		for (let pi=1; pi<collected_paths[0].length; pi++) {
			globaldx += collected_paths[0][pi][0] - collected_paths[0][pi-1][0];
		}

		if (globaldx > 0) {
			retobj = collected_paths[0];
		} else {
			retobj = collected_paths[0].reverse();
		}
	}

	return retobj;
}


function textDrawParamsAlongStraightSegmentsPath(p_mapctxt, p_gfctx, p_path_coords, p_labeltxt, p_label_len, out_data) {
	// console.log("pl:", p_path_levels);

	const ubRendCoordsFunc = p_mapctxt.transformmgr.getRenderingCoordsPt;
	const pl = pathLength(p_path_coords, 1, ubRendCoordsFunc.bind(p_mapctxt.transformmgr));

	let cursor_position;
	let poppable_string = (' ' + p_labeltxt).slice(1);

	out_data.length = 0;

	//console.log(p_labeltxt)

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
				// console.log("    ri inicial:", ri, acclength, p_cursor_position, pt1);
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
		let dlt, prevpt = null;
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

				out_data.push([[prevpt[0]+(dx/2), prevpt[1]+(dy/2)], ang, char, w, 20]);
				prevang = ang;
			}
			prevpt = [...pt];
		}
	}

}

const canvasVectorMethodsMixin = (Base) => class extends Base {
	
	canvasKey = 'normal';
	default_symbol;	
	fillflag = false;
	strokeflag = false;
	_gfctx;  // current graphics context to be always updated at each refreshing / drawing

	_grabGf2DCtx(p_mapctx, b_forlabel, opt_alt_canvaskey, opt_symbs) {

		let canvaskey, symb;

		if (opt_alt_canvaskey) {
			canvaskey = opt_alt_canvaskey;
		} else {
			canvaskey = this.canvasKey;
		}

		//console.log("canvaskey:", canvaskey, opt_symbs);

		this._gfctx = p_mapctx.renderingsmgr.getDrwCtx(canvaskey, '2d');
		this._gfctx.save();

		if (opt_symbs) {
			symb = opt_symbs;
		} else {
			symb = this.default_symbol;
		}	

		if (b_forlabel) {

			this.strokeflag = false;
	
			if (symb.labelFillStyle !== undefined && symb.labelFillStyle.toLowerCase() !== "none") {
				this._gfctx.fillStyle = symb.labelFillStyle;
				this.fillflag = true;
			}	

			if (symb.labelFont !== undefined) {
				this._gfctx.font = symb.labelFont;
			}	
	
	
		} else {

			if (symb.strokeStyle !== undefined && symb.strokeStyle.toLowerCase() !== "none") {
				this._gfctx.strokeStyle = symb.strokeStyle;
				this.strokeflag = true;
			}
	
			if (symb.lineWidth !== undefined) {
				this._gfctx.lineWidth = symb.lineWidth;
			}	
	
			if (symb.fillStyle !== undefined && symb.fillStyle.toLowerCase() !== "none") {
				this._gfctx.fillStyle = symb.fillStyle;
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

	drawLabel(p_mapctxt, p_coords, p_path_levels, p_labeltxt) {
		// console.log("pl:", p_path_levels);

		if (this._gfctx == null) {
			throw new Error(`graphics context was not previously grabbed for layer '${this.key}'`);
		}

		const tl = this._gfctx.measureText(p_labeltxt).width;
		const path = evalTextAlongPathViability(p_mapctxt, p_coords, p_path_levels, tl);
		if (path == null) {
			// console.warn("drawLabel, no path", p_labeltxt);
			return;
		}

		const textDrawData=[];
		textDrawParamsAlongStraightSegmentsPath(p_mapctxt, this._gfctx, path, p_labeltxt, tl, textDrawData)

		//let cnt = 10;

		this._gfctx.textAlign = "center";
		this._gfctx.textBaseline = "middle";

		this._gfctx.save();
		this._gfctx.fillStyle = "#808080a0";
		for (const [pt, ang, char, w, h] of textDrawData) {

			this._gfctx.save();
			this._gfctx.translate(pt[0], pt[1]);
			this._gfctx.rotate(ang);
			this._gfctx.translate(-pt[0], -pt[1]);

			this._gfctx.fillRect(pt[0]-(w/2), pt[1]-(h/2), w, h);
			//console.log("..", char, pt)
			this._gfctx.restore();

		}
		this._gfctx.restore();

		this._gfctx.save();
		for (const [pt, ang, char, w, h] of textDrawData) {


			this._gfctx.save();
			this._gfctx.translate(pt[0], pt[1]);
			this._gfctx.rotate(ang);
			this._gfctx.translate(-pt[0], -pt[1]);

			this._gfctx.fillText(char, ...pt)
			//console.log("..", char, pt)
			this._gfctx.restore();

		}
		this._gfctx.restore();

		return true;	
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

	refreshitem(p_mapctxt, p_coords, p_attrs, p_path_levels, opt_lblfield, opt_feat_id, opt_alt_canvaskey, opt_symbs) {

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


}

export class CanvasRiscoFeatsLayer extends canvasVectorMethodsMixin(RiscoFeatsLayer) {

	refreshitem(p_mapctxt, p_coords, p_attrs, p_path_levels, opt_lblfield, opt_feat_id, opt_alt_canvaskey, opt_symbs) {

		let ret = true;
		let pathoptsymbs = null;
		let lbloptsymbs = null;

		if (opt_symbs) {
			if (opt_symbs['path'] !== undefined)
				pathoptsymbs = opt_symbs['path'];
			if (opt_symbs['label'] !== undefined)
				lbloptsymbs = opt_symbs['label'];
		}

		//console.log("aa:", [p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs]);

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

		if (ret && opt_lblfield != null && p_attrs[opt_lblfield] !== undefined) {

			/*if (p_attrs["cod_topo"] != "JMOLI0") {
				return;
			}*/

 			if (this.grabLabelGf2DCtx(p_mapctxt, opt_alt_canvaskey, lbloptsymbs)) {
				try {
					ret = this.drawLabel(p_mapctxt, p_coords, p_path_levels, p_attrs[opt_lblfield]);
				} catch(e) {
					console.log(p_coords, opt_lblfield, p_attrs[opt_lblfield]);
					throw e;
				} finally {
					this.releaseGf2DCtx();
				}				
			}
		}

		return ret;

	}


}

