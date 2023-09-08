
import {GlobalConst} from './constants.js';
import { ctrToolTip, MapPrintInRect, PermanentMessaging, LoadingMessaging, ControlsBox, Info, OverlayMgr } from './customization_canvas_baseclasses.mjs';
import { AnalysisMgr, SelectionsNavigator } from './analysis.mjs';
import { SlicingPanel } from './slicing.mjs';
import { TOC } from './tocwidget.mjs';

class MousecoordsPrint extends PermanentMessaging {

	constructor() {
		super();
	}

	print(p_mapctx, p_x, py) {

		const terr_pt = [], canvas_dims = [];
		p_mapctx.transformmgr.getTerrainPt([p_x, py], terr_pt);

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		try {
			p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);

			this.boxw = 130;
			this.boxh = 20;
			this.left = canvas_dims[0]-this.boxw;
			this.top = canvas_dims[1]-(3*this.boxh)-2;

			ctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
			ctx.fillStyle = this.fillStyleBack;
			ctx.fillRect(this.left, this.top, this.boxw, this.boxh);

			ctx.fillStyle = this.fillStyleFront;
			ctx.font = this.font;

			const bottom = this.top + this.boxh;

			ctx.fillText(terr_pt[0].toLocaleString(undefined, { maximumFractionDigits: 2 }), this.left+8, bottom-6);		
			ctx.fillText(terr_pt[1].toLocaleString(undefined, { maximumFractionDigits: 2 }), this.left+66, bottom-6);	
			
		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}

	}	

	
}

class MapScalePrint extends PermanentMessaging {

	constructor() {
		super();
	}

	print(p_mapctx, p_scaleval, opt_right_offset, opt_vert_offset) {

		const canvas_dims = [];
		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		let right_offset = 0;
		if (opt_right_offset) {
			right_offset = opt_right_offset;
		}

		try {
			p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);

			this.boxw =  GlobalConst.MESSAGING_STYLES.MAPSCALE_WIDTH;
			this.boxh = GlobalConst.MESSAGING_STYLES.MAPSCALE_HEIGHT;

			const text_baseline_offset = GlobalConst.MESSAGING_STYLES.MAPSCALE_TXTBASEOFFSET;
	
			this.left = canvas_dims[0]-this.boxw-right_offset;

			if (opt_vert_offset) {
				this.top = canvas_dims[1] - this.boxh - opt_vert_offset;
			} else {
				this.top = canvas_dims[1] - this.boxh;
			}

			ctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
			ctx.fillStyle = this.fillStyleBack;
			ctx.fillRect(this.left, this.top, this.boxw, this.boxh);

			ctx.fillStyle = this.fillStyleFront;
			ctx.font = this.font;

			const bottom = this.top + this.boxh;

			ctx.fillText(p_mapctx.i18n.msg('ESCL', true) + " 1:"+p_scaleval, this.left+GlobalConst.MESSAGING_STYLES.TEXT_OFFSET, bottom+text_baseline_offset);		

		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}
	}	

	interact(p_mapctx, p_evt) {


		let topcnv, ret = false;
		let maxscl = 1000000;

		if (p_mapctx.cfgvar.basic["maxscaleview"] !== undefined && p_mapctx.cfgvar.basic["maxscaleview"]["scale"] !== undefined) {
			maxscl = p_mapctx.cfgvar.basic["maxscaleview"]["scale"];
		}

		if (this.top == null) {
			return ret;
		}

		if (p_evt.clientX >= this.left && p_evt.clientX <= this.left + this.boxw && 
			p_evt.clientY >= this.top && p_evt.clientY <= this.top + this.boxh) {

			switch(p_evt.type) {

				case 'mousemove':
					topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "pointer";
					break; 

				case 'touchend':
				case 'mouseup':
					const sv = p_mapctx.transformmgr.getReadableCartoScale();
					p_mapctx.getCustomizationObject().messaging_ctrlr.numberInputMessage(
						[p_mapctx.i18n.msg('DEFSCL', true), "1:", sv], 
						(evt, p_result, p_value) => { 
							if (p_value) {
								p_mapctx.transformmgr.setScaleFromReadableCartoScale(p_value, true);
							}
						}, 
						{"step": 10, "min": 100, "max": maxscl}
					);
					break; 
								
				default:
					topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "default";
	
			}

			// SelBaseMap
			ret = true;
		}
	

		if (!ret) {

			if (this.had_prev_interaction) {

				// emulating mouseout
				topcnv = p_mapctx.renderingsmgr.getTopCanvas();
				topcnv.style.cursor = "default";

				p_mapctx.clearInteractions('MAPSCALEBOX');

				this.had_prev_interaction = false;

			}

		} else {
			if (!this.had_prev_interaction) {
				p_mapctx.clearInteractions('MAPSCALEBOX');
			}
			this.had_prev_interaction = true;
		}

		return ret;		
	}
}

class AttributionPrint extends PermanentMessaging {

	constructor() {
		super();
	}

	setdims(p_mapctx, opt_canvas_dims) {

		let canvas_dims;

		if (opt_canvas_dims) {
			canvas_dims = opt_canvas_dims;
		} else {
			canvas_dims = [];
			p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);
		}

		this.boxw =  GlobalConst.MESSAGING_STYLES.ATTRIBUTION_WIDTH;
		this.boxh = GlobalConst.MESSAGING_STYLES.ATTRIBUTION_HEIGHT;
		this.left = canvas_dims[0] - this.boxw;
		this.top = canvas_dims[1] - this.boxh;

	}

	print(p_mapctx) {

		const canvas_dims = [];
		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		try {

			let msg;
			p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);

			this.setdims(p_mapctx, canvas_dims);

			if (p_mapctx.cfgvar["basic"]["attribution"] !== undefined) {
				msg = p_mapctx.cfgvar["basic"]["attribution"];
			} else {
				msg = "(no \"attribution\" entry in basic config)";
			}

			// const tm = ctx.measureText(msg);
			// this.boxw =  GlobalConst.MESSAGING_STYLES.ATTRIBUTION_WIDTH;
			// this.boxh = GlobalConst.MESSAGING_STYLES.ATTRIBUTION_HEIGHT;
			// this.left = canvas_dims[0] - this.boxw;
			// this.top = canvas_dims[1] - this.boxh;

			ctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
			ctx.fillStyle = GlobalConst.MESSAGING_STYLES.ATTRIBUTION_BCKGRND;
			ctx.fillRect(this.left, this.top, this.boxw, this.boxh);

			ctx.fillStyle = GlobalConst.MESSAGING_STYLES.ATTRIBUTION_FOREGRND;
			ctx.font = this.font;
			ctx.textAlign = "center";

			const bottom = canvas_dims[1];

			ctx.fillText(msg, this.left+this.boxw/2, bottom+GlobalConst.MESSAGING_STYLES.ATTRIBUTION_TXTBASEOFFSET);		

		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}
	}	
}

class LoadingPrint extends LoadingMessaging {

	constructor() {
		super();
		this.canvaslayer = 'transientmap';
	}

	print(p_mapctx, p_msg) {

		const canvas_dims = [];
		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		try {
			p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);

			const msg = `${p_mapctx.i18n.msg('LDNG', false)} ${p_msg}`;
			// const tm = ctx.measureText(msg);
			this.boxw =  GlobalConst.MESSAGING_STYLES.LOADING_WIDTH;

			this.left = 0;
			this.boxh = GlobalConst.MESSAGING_STYLES.LOADING_HEIGHT;
			this.top = canvas_dims[1]-(2*this.boxh);

			ctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
			ctx.fillStyle = this.fillStyleBack;
			ctx.fillRect(this.left, this.top, this.boxw, this.boxh);

			ctx.fillStyle = this.fillStyleFront;
			ctx.font = this.font;
			ctx.textAlign = "center";

			const bottom = this.top + this.boxh;

			ctx.fillText(msg, this.boxw/2, bottom-8, this.boxw - 2 * GlobalConst.MESSAGING_STYLES.TEXT_OFFSET);		

		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}
	}	
}

import {canvasVectorMethodsMixin} from '../riscojs_v2/canvas_vector.mjs';
import { VectorLayer } from '../riscojs_v2/layers.mjs';

class LocLayerClass extends VectorLayer {

	is_internal = true;
	_geomtype = "line";
	items;

	constructor() {
		super();
		this.items = [null, null];
		this._servmetadata_docollect = false;		
	}

	clear() {
		this.items = [null, null];
	}

	setFromPoint(p_pt, p_accuracy) {
		this.items[0] = {
			key: "from",
			pt: [...p_pt],
			accuracy: p_accuracy
		}
	}

	setToPoint(p_pt) {
		this.items[1] = {
			key: "to",
			pt: [...p_pt]
		}
	}


	* itemchunks(p_mapctxt, p_prep_data) {
		yield [];
	}	

	* layeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims, item_chunk_params) {

		for (const item of this.items) {

			if (item) {
				if (item["accuracy"] !== undefined) {
					yield [[item.pt], { "key": item.key, "accuracy": item.accuracy }, 1];
				} else {
					yield [[item.pt], { "key": item.key }, 1];
				}
			}
			
			// yield [item_coords, item_attrs, item_path_levels];

		}

		p_mapctxt.tocmgr.signalVectorLoadFinished(this.key);		
	}

}

export class CanvasLocLayerClass extends canvasVectorMethodsMixin(LocLayerClass) {

	simplerefreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_path_levels) {

		const ok = this.grabGf2DCtx(p_mapctxt);

		function strokeFill(p_this) {
			if (p_this._currentsymb.toFill) {
				p_this._gfctx.fill();
			};
			if (p_this._currentsymb.toStroke) {
				p_this._gfctx.stroke();
			};
		}

		if (ok && !this._currentsymb.toStroke && !this._currentsymb.toFill) {
			throw new Error(`Layer ${this.key}, no 'stroke' and no 'fill' flags, nothin to draw`);
		}

		if (ok) {
			try {
				let radius=0, cpt=[], other=[];

				for (let pt of p_coords) {

					p_mapctxt.transformmgr.getRenderingCoordsPt(pt, cpt);

					if (p_attrs["key"] == "from") {

						this._gfctx.beginPath();
						this._gfctx.arc(cpt[0], cpt[1], 2, 0, Math.PI * 2, true);
						strokeFill(this);
					
						// linha de ligação, ponto GPS > Local
						if (this.items[1]) {
							p_mapctxt.transformmgr.getRenderingCoordsPt(this.items[1].pt, other);

							this._gfctx.beginPath();
							this._gfctx.moveTo(...cpt);
							this._gfctx.lineTo(...other);
							strokeFill(this);							
						}
					
					} else {

						this._gfctx.beginPath();
						this._gfctx.arc(cpt[0], cpt[1], 2, 0, Math.PI * 2, true);
						strokeFill(this);

						this._gfctx.beginPath();
						this._gfctx.arc(cpt[0], cpt[1], 12, 0, Math.PI * 2, true);
						strokeFill(this);

						/* TODO - locrsb PRECISA DE aspeto especifico
						this._gfctx.beginPath();
						this._gfctx.moveTo(cpt[0]-20, cpt[1]+18);
						this._gfctx.lineTo(cpt[0], cpt[1]-22);
						this._gfctx.lineTo(cpt[0]+20, cpt[1]+18);
						this._gfctx.closePath();
						strokeFill(this);
						*/
					}

					// accuracy circle
					if (p_attrs["key"] == "from") {

						radius = Math.round(p_mapctxt.transformmgr.convertReadableScaleToScalingFactor(p_mapctxt.transformmgr.getReadableCartoScale()) * p_attrs["accuracy"]);

						this._gfctx.beginPath();
						this._gfctx.arc(cpt[0], cpt[1], radius, 0, Math.PI * 2, true);
						strokeFill(this);

					}
				}

			} catch(e) {
				throw e;
			} finally {
				this.releaseGf2DCtx();
			}
		}

		return true;		
	}
}

function getGeoLocation(p_this, b_check_active) {

	const options = { enableHighAccuracy: true };
	navigator.geolocation.getCurrentPosition((pos) => {
		
		console.log("[GEOLOC]", b_check_active, pos.coords);
		
		if (!b_check_active || p_this.geoloc.active) {
			p_this.trackpos(pos.coords);
		} 
		if (b_check_active && p_this.geoloc.active) {
			p_this.geoloc.timeoutid = setTimeout(getGeoLocation(p_this, true), GlobalConst.GEOLOCATION_INTERVAL_MS);
		} 		
	},
	(error) => {
		console.error("[GEOLOC] geolocation.getCurrentPosition error:", error);
		if (p_this.geoloc.timeoutid) {
			clearTimeout(p_this.geoloc.timeoutid);
			p_this.geoloc.timeoutid = null;
		}	
		p_this.geoloc.active = false;			
	},
	options);
}

export class GeoLocationMgr {

	mapctx;
	mapctx_config_var;
	transformmgr;
	geoloc;
	loc_layer_key;

	constructor(p_mapctx, p_loc_layer_key) {

		this.mapctx = p_mapctx;
		this.mapctx_config_var = p_mapctx.cfgvar["basic"];
		this.loc_layer_key = p_loc_layer_key;
	
		this.geoloc = {
			timeoutid: null,
			active: false,
			lastpos: [],
			last_ts: null
		}	
	}


	trackpos(p_gps_coords) {
		
		//console.trace(":426:", p_gps_coords);
		let url = null;

		if (this.mapctx_config_var['geometry_service']['type'] == "ARCGIS") {
			url = `${this.mapctx_config_var['geometry_service']['url']}&geometries=${p_gps_coords.longitude}%2C${p_gps_coords.latitude}`;
		}

		if (url) {

			const that = this;

			fetch(url, {
				method: "GET"
			})
			.then(response => response.json())
			.then(
				function(responsejson) {

					let ts, dx=0, dy=0, dt, d, v=null, tol=0, s, testdx=null, testdy=null, curr_center=[];
					let change=false, dims=[], sf, minsclval, vsclval, usablescale;

					let recieved_pos = [];
					if (that.mapctx_config_var['geometry_service']['type'] == "ARCGIS" && responsejson.geometries !== undefined) {
						recieved_pos.push(responsejson.geometries[0].x);
						recieved_pos.push(responsejson.geometries[0].y);
					}

					if (recieved_pos.length != 2) {

						console.error("[GEOLOC] No geometries from conversion service");

					} else {

						s = that.mapctx.transformmgr.getReadableCartoScale();
						usablescale = s;

						if (that.geoloc.last_ts) {
						
							ts = new Date();
							dt = ts - that.geoloc.last_ts;
							dx = that.geoloc.lastpos[0]-recieved_pos[0];
							dy = that.geoloc.lastpos[1]-recieved_pos[1];

							tol = GlobalConst.GEOLOCATION_NEXTPOS_TOLERANCE_PX * that.mapctx.transformmgr.getPixSize();

							d = Math.sqrt(dx * dx + dy * dy);
							v = d / (dt / 1000);

							that.mapctx.transformmgr.getCenter(curr_center);
							testdx = curr_center[0]-recieved_pos[0];
							testdy = curr_center[1]-recieved_pos[1];

							if (GlobalConst.getDebug("GEOLOC")) {
								console.log(`[DBG:GEOLOC] Position ${JSON.stringify(recieved_pos)}, v:${v}, dt:${dt} accu:${p_gps_coords.accuracy}`);
							}

						} else {

							if (GlobalConst.getDebug("GEOLOC")) {
								console.info(`[DBG:GEOLOC] INITIAL Position ${JSON.stringify(recieved_pos)}, accu:${p_gps_coords.accuracy}`);
							}
						}

						that.mapctx.getCanvasDims(dims);

						sf = Math.min(...dims) / (2.4 * p_gps_coords.accuracy);
						minsclval = that.mapctx.transformmgr.convertScalingFactorToReadableScale(sf);

						if (GlobalConst.getDebug("GEOLOC")) {
							console.info("[DBG:GEOLOC] minsclval:", minsclval, "scl.factor:", sf, "min.scr.dim:", Math.min(...dims), "accur:", p_gps_coords.accuracy);
						}

						if (s < minsclval) {
							usablescale = minsclval;
							that.mapctx.transformmgr.setScaleFromReadableCartoScale(minsclval, false);
							change = true;
						} else {
							vsclval = 0;
							if (v) {
								if (v > GlobalConst.GEOLOCATION_SPEED_THRESHOLD) {
									vsclval = GlobalConst.GEOLOCATION_HIGHSPEED_SCALE;
								} else {
									vsclval = GlobalConst.GEOLOCATION_LOWSPEED_SCALE;
								}
							}
							if (vsclval >= minsclval && s > vsclval) {
								usablescale = vsclval;
								that.mapctx.transformmgr.setScaleFromReadableCartoScale(vsclval, false);
								change = true;
							}
						}

						if (!change) {
							if (that.geoloc.last_ts == null ) {
								change = true;
							} else {
								if (testdx != null && testdy != null) {
									change = Math.abs(testdx) > tol || Math.abs(testdy) > tol;
								}
							}
						}

						if (GlobalConst.getDebug("GEOLOC")) {
							console.info(`[DBG:GEOLOC] Check 'change':${change} dx:${testdx}>${tol}?, dy:${testdy}>${tol}?, dtime:${dt}`);
						}

						if (change) {

							if (GlobalConst.getDebug("GEOLOC")) {
								console.log("[DBG:GEOLOC] SET CENTER", recieved_pos);
							}

							const lyr = that.mapctx.tocmgr.getLayer(that.loc_layer_key);
							if (lyr == null) {
								throw new Error(`no layer '${that.loc_layer_key}' found`);
							}

							lyr.setFromPoint(recieved_pos, p_gps_coords.accuracy);

							that.mapctx.transformmgr.setCenter(recieved_pos[0], recieved_pos[1], true);

							that.geoloc.lastpos.length = 2;
							that.geoloc.lastpos[0] = recieved_pos[0];
							that.geoloc.lastpos[1] = recieved_pos[1];
							that.geoloc.last_ts = new Date();

						} 

					}

				}
			).catch((error) => {
				console.error(`[GEOLOC] Impossible to transform coords or paint geolocation`, error);
			});	

		} else {
			throw new Error("[GEOLOC] Missing URL for geometry service point transformation");
		}
		
	}

	toggleGeolocWatch() {

		let ret = false;

		console.info("[GEOLOC] start WATCH")

		if (navigator["geolocation"] !== undefined) {
			
			if (this.geoloc.active) {

				if (this.geoloc.timeoutid) {
					clearTimeout(this.geoloc.timeoutid);
					this.geoloc.timeoutid = null;
				}

				this.mapctx.renderingsmgr.clearAll(['temporary']);

				this.geoloc.active = false;
				this.mapctx.getCustomizationObject().messaging_ctrlr.info("Geolocalização terminada");

			} else {

				/*navigator.permissions.query({ name: "geolocation" }).then((result) => {
					if (result.state !== "granted") {

						console.error("[GEOLOC] Geolocation permission not granted");
						this.mapctx.getCustomizationObject().messaging_ctrlr.warn("Ainda não foi dada permissão de uso da geolocalização.")

					} else { */

					this.geoloc.active = true;
					getGeoLocation(this, true);
					this.mapctx.getCustomizationObject().messaging_ctrlr.info("Geolocalização iniciada");

					ret = true;
		
				/*	}
				});				*/  
				  
			}		
		} else {
			this.mapctx.getCustomizationObject().messaging_ctrlr.warn("Impossível ativar geolocalização");
		}

		return ret;

	}

	geolocPinpoint() {

		if (navigator["geolocation"] !== undefined) {
			
			/*navigator.permissions.query({ name: "geolocation" }).then((result) => {
				if (result.state !== "granted") {

					console.error("[GEOLOC] Geolocation permission not granted");
					this.mapctx.getCustomizationObject().messaging_ctrlr.warn("Ainda não foi dada permissão de uso da geolocalização.")

				} else { */

				this.mapctx.getCustomizationObject().messaging_ctrlr.info("A pedir geolocalização ...");
				getGeoLocation(this, false);
	
			/*	}
			});				  */
				  	
		} else {
			this.mapctx.getCustomizationObject().messaging_ctrlr.warn("Impossível ativar geolocalização");
		}		
	}

}


class BasicCtrlBox extends ControlsBox {

	prev_ctrl_key = null;
	had_prev_interaction; 

	constructor() {
		super();

		this.orientation = "VERTICAL";
 		this.controls_keys = [
			"zoomout",
			"home",
			"zoomin"
		];

		this.controls_funcs = {
			"zoomout": {
				"drawface": function(p_ctrlsbox, p_ctx, p_left, p_top, p_width, p_height, p_basic_config, p_global_constants, p_control_status) {

					p_ctx.beginPath();
					p_ctx.moveTo(p_left+p_width*0.2, p_top+p_height*0.5);
					p_ctx.lineTo(p_left+p_width*0.8, p_top+p_height*0.5);
					p_ctx.stroke();
				},
				"endevent": function(p_mapctx, p_evt, p_basic_config, p_global_constants) {
//					console.log("***", p_basic_config);
					p_mapctx.transformmgr.zoomOut(p_basic_config.maxscaleview.scale, p_global_constants.SCALEINOUT_STEP, true);
					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "default";

					return true;
				},
				"mmoveevent": function(p_mapctx, p_evt, p_basic_config, p_global_constants) {

					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "pointer";

					ctrToolTip(p_mapctx, p_evt, p_mapctx.i18n.msg('ZOUT', true));
				}
			},
			"zoomin": {
				"drawface": function(p_ctrlsbox, p_ctx, p_left, p_top, p_width, p_height, p_basic_config, p_global_constants, p_control_status) {

					p_ctx.beginPath();
					p_ctx.moveTo(p_left+p_width*0.2, p_top+p_height*0.5);
					p_ctx.lineTo(p_left+p_width*0.8, p_top+p_height*0.5);
					p_ctx.moveTo(p_left+p_width*0.5, p_top+p_height*0.2);
					p_ctx.lineTo(p_left+p_width*0.5, p_top+p_height*0.8);
					p_ctx.stroke();
				},
				"endevent": function(p_mapctx, p_evt, p_basic_config, p_global_constants) {
					p_mapctx.transformmgr.zoomIn(p_global_constants.MINSCALE, p_global_constants.SCALEINOUT_STEP, true);
					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "default";

					return true;
				},
				"mmoveevent": function(p_mapctx, p_evt, p_basic_config, p_global_constants) {
					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "pointer";

					ctrToolTip(p_mapctx, p_evt, p_mapctx.i18n.msg('ZIN', true));
				}
			},
			"home": {
				"drawface": function(p_ctrlsbox, p_ctx, p_left, p_top, p_width, p_height, p_basic_config, p_global_constants, p_control_status) {

					let imgsrc;
					const imgh = new Image();
					imgh.decoding = "sync";

					imgsrc = p_global_constants.CONTROLS_STYLES.HOMESYMB.replace(/=%22black%22/g, `=%22${encodeURIComponent(p_ctrlsbox.strokeStyleFront)}%22`);

					imgh.src = imgsrc;
					imgh.decode()
					.then(() => {
						p_ctx.drawImage(imgh, p_left + ((p_global_constants.CONTROLS_STYLES.SIZE - p_global_constants.CONTROLS_STYLES.HOMESYMBWID) / 2), p_top);
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

					ctrToolTip(p_mapctx, p_evt, p_mapctx.i18n.msg('HOME', true));
				}
			}	
		}

		this.controls_status["zoomout"] = { "togglable": false, "togglestatus": false, "disabled": false };
		this.controls_status["zoomin"] = { "togglable": false, "togglestatus": false, "disabled": false };
		this.controls_status["home"] = { "togglable": false, "togglestatus": false, "disabled": false };

		this.had_prev_interaction = false;
	}


	initialDrawingActions(p_ctx, p_control_key, p_control_status) {

		const [left, top, boxw, boxh] = this.controls_boxes[p_control_key];

		p_ctx.clearRect(left, top, boxw, boxh); 
		
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
			console.log("[DBG:INTERACTION] BASICCTRLBX, event, control key:", p_evt, ctrl_key);
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
				p_mapctx.clearInteractions('BASICCTRLBOX');
			}
			this.had_prev_interaction = true;

		} else {

			if (this.prev_ctrl_key) {

				// emulating mouseout

				this.prev_ctrl_key = null;

				const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
				topcnv.style.cursor = "default";

				p_mapctx.clearInteractions('BASICCTRLBOX');
				
			}
			this.had_prev_interaction = false;

		}

		return ret;
	}

}

class BasemapCtrlBox extends MapPrintInRect {

	/* left;
	boxh;
	boxw;
	top;
	fillStyleBack; 
	fillStyleFront; 
	font;
	canvaslayer = 'service_canvas'; */
	had_prev_interaction;
	tocmgr;

	constructor() {

		super();

		this.fillStyleBack = GlobalConst.CONTROLS_STYLES.BCKGRD; 
		this.strokeStyleBack = GlobalConst.CONTROLS_STYLES.COLOR;
		this.strokeWidth = GlobalConst.CONTROLS_STYLES.STROKEWIDTH;

		this.margin_offset = GlobalConst.CONTROLS_STYLES.OFFSET;
		this.loadingMsgHeight = 2 * GlobalConst.MESSAGING_STYLES.LOADING_HEIGHT;

		this.btnSize = 40;

		this.FilterOption = "COLOR";

		this.had_prev_interaction = false;

		this.cota = -1;

	}

	boxSelFilterBtn() {
		return [this.margin_offset, this.cota, this.btnSize, this.btnSize];
	}

	boxSelBasemapBtn() {
		// if base raster exists, box is shifted right
		if (this.tocmgr.getBaseRasterLayer() != null) {
			return [this.margin_offset+this.btnSize, this.cota, this.btnSize, this.btnSize];
		} else {
			return [this.margin_offset, this.cota, this.btnSize, this.btnSize];
		}
	}	

	setTOCMgr(p_tocmgr) {
		this.tocmgr = p_tocmgr;
	}	

	draw3CircSymbol(p_ctx, p_colors) {

		const cp = [this.margin_offset+(this.btnSize/2), 2+this.cota+(this.btnSize/2)];

		let r1 = 8;
		let r2 = 6;

		let a = Math.PI;
		let cp2;
		
		for (let i=0; i<3; i++) {
			cp2 = [cp[0]+r1*Math.sin(a), cp[1]+r1*Math.cos(a)]
			p_ctx.beginPath();
			p_ctx.arc(...cp2, r2, 0, 2 * Math.PI, false);
			p_ctx.fillStyle = p_colors[i];
			p_ctx.fill();
			a = a + (2 * Math.PI/3);	
		}
	}

	printSelFilter(p_mapctx) {

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		try {

			const dims = [];
			p_mapctx.renderingsmgr.getCanvasDims(dims);

			ctx.fillStyle = this.fillStyleBack;
			ctx.strokeStyle = this.strokeStyleBack;
			ctx.lineWidth = this.strokeWidth;

			if (this.cota < 0) {
				this.cota = dims[1]-this.loadingMsgHeight-this.margin_offset-this.btnSize;
			}

			// RGB vs Grayscale
			const b1 = this.boxSelFilterBtn();
			ctx.clearRect(...b1);
			ctx.fillRect(...b1);
			ctx.strokeRect(...b1);

			if (this.FilterOption == "BW") {
				this.draw3CircSymbol(ctx, ["blue", "red", "green"]);
			} else {
				this.draw3CircSymbol(ctx, ["rgb(30, 30, 30)", "rgb(100, 100, 100)", "rgb(150, 150, 150)"]);
			}

		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}

	}	

	printSelBasemap(p_mapctx) {

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		try {

			const dims = [];
			p_mapctx.renderingsmgr.getCanvasDims(dims);

			ctx.fillStyle = this.fillStyleBack;
			ctx.strokeStyle = this.strokeStyleBack;
			ctx.lineWidth = this.strokeWidth;

			if (this.cota < 0) {
				this.cota = dims[1]-this.loadingMsgHeight-this.margin_offset-this.btnSize;
			}

			// Base map choice
			ctx.fillStyle = this.fillStyleBack;

			const b2 = this.boxSelBasemapBtn();
			ctx.fillRect(...b2);
			ctx.strokeRect(...b2);

		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}

	}	

	print(p_mapctx) {

		const bm = this.tocmgr.getBaseRasterLayer();
		if (bm != null) {
			if (bm.filter == 'none') {
				this.FilterOption = "COLOR";
			} else {
				this.FilterOption = "BW";
			}
			this.printSelFilter(p_mapctx);
		}
		// this.printSelBasemap(p_mapctx);

	}		

	interact(p_mapctx, p_evt) {

		if (this.cota < 0) {
			return false;
		}

		const b1 = this.boxSelFilterBtn();
		const b2 = this.boxSelBasemapBtn();
		let topcnv, ret = false;

		if (this.tocmgr.getBaseRasterLayer() != null && p_evt.clientX >= b1[0] && p_evt.clientX <= b1[0] + b1[2] && 
			p_evt.clientY >= b1[1] && p_evt.clientY <= b1[1] + b1[3]) {

			switch(p_evt.type) {

				case 'touchend':
				case 'mouseup':

					const bm = this.tocmgr.getBaseRasterLayer();

					// SelFilter
					if (this.FilterOption == "COLOR") {
						bm.filter = 'grayscale';
					} else {
						bm.filter = 'none';
					}

					this.printSelFilter(p_mapctx);
					topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "default";

					p_mapctx.maprefresh();

					break;

				case 'mousemove':

					topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "pointer";

					ctrToolTip(p_mapctx, p_evt, p_mapctx.i18n.msg('ALTBMFILT', true), [80,30]);

					break;

				default:
					topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "default";

			}

			ret = true;
		}

		if (!ret) {
			if (p_evt.clientX >= b2[0] && p_evt.clientX <= b2[0] + b2[2] && 
				p_evt.clientY >= b2[1] && p_evt.clientY <= b2[1] + b2[3]) {
	
				// SelBaseMap
				ret = true;
			}
	
		}

		if (!ret) {

			if (this.had_prev_interaction) {

				// emulating mouseout
				topcnv = p_mapctx.renderingsmgr.getTopCanvas();
				topcnv.style.cursor = "default";

				p_mapctx.clearInteractions('BASEMAPCTRLBOX');

				this.had_prev_interaction = false;

			}

		} else {
			if (!this.had_prev_interaction) {
				p_mapctx.clearInteractions('BASEMAPCTRLBOX');
			}
			this.had_prev_interaction = true;
		}

		return ret;
	}
}



export class MapCustomizations {

	mapctx;
	messaging_ctrlr; // object with info, warn and error methods
	mapcustom_controls_keys; // custom. instances containing interactive controls
	mapcustom_controlsmgrs_keys; // custom. instances containing interactive controls, acting as controls managers
	overlay_keys; // custom. instances directly interacting with default tool

	constructor(p_mapctx, p_messaging_ctrlr) {

		let max_textlines_height;
		this.mapctx = p_mapctx;

		if (this.mapctx.cfgvar["basic"]["info"] !== "undefined") {
			max_textlines_height = this.mapctx.cfgvar["basic"]["info"]["max_textlines_height"];
		}

		let infoboxStyle;

		if (this.mapctx.cfgvar["basic"]["info"]["boxstyle"] !== undefined) {
			infoboxStyle = {
				...GlobalConst.INFO_MAPTIPS_BOXSTYLE,
				...this.mapctx.cfgvar["basic"]["info"]["boxstyle"]
			}
		} else {
			infoboxStyle = GlobalConst.INFO_MAPTIPS_BOXSTYLE;
		}

		this.messaging_ctrlr = p_messaging_ctrlr;
		this.messaging_ctrlr.setI18n(this.mapctx.i18n);

		// widget which presence impacts others, at least through display area occupied
		const ap = new AttributionPrint();
		// const nav = new SelectionsNavigator(this.mapctx, [ap]);

		let has_slicing = false;
		if (this.mapctx.cfgvar["basic"]["slicing"] !== undefined && this.mapctx.cfgvar["basic"]["slicing"]["keys"] !== undefined && Object.keys(this.mapctx.cfgvar["basic"]["slicing"]["keys"]) > 0) {
			has_slicing = true;
		}
		
		this.instances = {
			"basiccontrolsbox": new BasicCtrlBox(),
			"basemapctrl": new BasemapCtrlBox(),
			"toc": new TOC(this.mapctx),
			"infoclass": new Info(this.mapctx, infoboxStyle, max_textlines_height),
			"mousecoordsprint": new MousecoordsPrint(),
			"mapscaleprint": new MapScalePrint(),
			"loadingmsgprint": new LoadingPrint(),
			"attributionprint": ap,
			"overlay": new OverlayMgr(this.mapctx)
			// "analysis": new AnalysisMgr([ap]),
			// "navigator": nav,
			// "slicing": new SlicingPanel()
		}

		if (has_slicing) {
			this.instances["analysis"] = new AnalysisMgr([ap]);
			this.instances["slicing"] = new SlicingPanel();
		}

		// Temporariamente sem navigator
		this.mapcustom_controls_keys = ["basiccontrolsbox", "basemapctrl", "toc", "analysis", "slicing"]; // widgets exposing a 'print' method, just for display
		this.mapcustom_controlsmgrs_keys = ["basiccontrolsbox", "basemapctrl", "analysis", "slicing"]; // controls manager widgets, exposing a generic 'interact' method

/* 		this.mapcustom_controls_keys = ["basiccontrolsbox", "basemapctrl", "toc", "navigator", "analysis"]; // widgets exposing a 'print' method, just for display
		this.mapcustom_controlsmgrs_keys = ["basiccontrolsbox", "basemapctrl", "navigator", "analysis"]; // controls manager widgets, exposing a generic 'interact' method
																		// TOC is a special widget, not considered as a 'controls manager', its interactions
																		// are trated separately, as it is a default map context member, opposite to these widgets 
																		// which act as plugins */
		this.overlay_keys = ["overlay", "mapscaleprint"];
	}
}


