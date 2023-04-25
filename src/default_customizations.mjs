

import {GlobalConst} from './constants.js';
import {PermanentMessaging, LoadingMessaging, ControlsBox, Info} from './customization_canvas_baseclasses.mjs';

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

	print(p_mapctx, p_scaleval) {

		const canvas_dims = [];
		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		try {
			p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);

			this.boxh = 20;
			this.boxw = 130;
			this.left = canvas_dims[0]-this.boxw;
			this.top = canvas_dims[1]-(2*this.boxh);

			ctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
			ctx.fillStyle = this.fillStyleBack;
			ctx.fillRect(this.left, this.top, this.boxw, this.boxh);

			ctx.fillStyle = this.fillStyleFront;
			ctx.font = this.font;

			const bottom = this.top + this.boxh;

			ctx.fillText(p_mapctx.i18n.msg('ESCL', true) + " 1:"+p_scaleval, this.left+GlobalConst.MESSAGING_STYLES.TEXT_OFFSET, bottom-6);		

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
		this.canvaslayer = 'transient';
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

			ctx.fillText(msg, this.boxw/2, bottom-6, this.boxw - 2 * GlobalConst.MESSAGING_STYLES.TEXT_OFFSET);		

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
			if (p_this.strokeflag) {
				p_this._gfctx.stroke();
			};
			if (p_this.fillflag) {
				p_this._gfctx.fill();
			};
		}

		if (ok && !this.strokeflag && !this.fillflag) {
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
						this._gfctx.moveTo(cpt[0]-20, cpt[1]+18);
						this._gfctx.lineTo(cpt[0], cpt[1]-22);
						this._gfctx.lineTo(cpt[0]+20, cpt[1]+18);
						this._gfctx.closePath();
						strokeFill(this);
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
		
				/*	}
				});				*/  
				  
			}		
		} else {
			this.mapctx.getCustomizationObject().messaging_ctrlr.warn("Impossível ativar geolocalização");
		}

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

	/*drawGeolocationMarkings(p_scr_pt, p_radius) {

		const ctx = this.mapctx.renderingsmgr.getDrwCtx("temporary", '2d');
		ctx.save();

		// console.log("##> drawGeolocationMarkings:", p_scr_pt, p_radius);
	
		try {

			this.mapctx.renderingsmgr.clearAll(['temporary']);
	
			ctx.strokeStyle = "red";
			ctx.lineWidth = 2;
			
			ctx.beginPath();
			ctx.arc(...p_scr_pt, p_radius, 0, 2 * Math.PI, false);
			ctx.stroke();	

			ctx.lineWidth = 5;

			ctx.beginPath();
			ctx.arc(...p_scr_pt, 2, 0, 2 * Math.PI, false);
			ctx.stroke();	
			
		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}

    } */
}

export function ctrToolTip(p_mapctx, p_evt, p_text) {
	
	const gfctx = p_mapctx.renderingsmgr.getDrwCtx("transient", '2d');
	gfctx.save();
	const slack = 6;

	const canvas_dims = [];		
	try {
		p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);
		gfctx.clearRect(0, 0, ...canvas_dims); 


		gfctx.font = "16px Helvetica";
		gfctx.strokeStyle = "white";
		gfctx.lineWidth = 2;

		const tm = gfctx.measureText(p_text);

		const x = p_evt.clientX + 50;
		const y = p_evt.clientY + 20;
		const h = 2*slack + tm.actualBoundingBoxAscent + tm.actualBoundingBoxDescent;

		gfctx.fillStyle = "#8080807f";
		gfctx.fillRect(x - tm.actualBoundingBoxLeft - slack, y + tm.actualBoundingBoxDescent + slack, tm.width+2*slack, -h);
		gfctx.strokeRect(x - tm.actualBoundingBoxLeft - slack, y + tm.actualBoundingBoxDescent + slack, tm.width+2*slack, -h);

		gfctx.fillStyle = "white";
		gfctx.fillText(p_text, x, y);

	} catch(e) {
		throw e;
	} finally {
		gfctx.restore();
	}	
}

class BasicCtrlBox extends ControlsBox {

	prev_ctrl_key = null;

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
				"drawface": function(p_ctx, p_left, p_top, p_width, p_height, p_basic_config, p_global_constants) {
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
				},
				"mmoveevent": function(p_mapctx, p_evt, p_basic_config, p_global_constants) {

					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "pointer";

					ctrToolTip(p_mapctx, p_evt, p_mapctx.i18n.msg('ZOUT', true));
				}
			},
			"zoomin": {
				"drawface": function(p_ctx, p_left, p_top, p_width, p_height, p_basic_config, p_global_constants) {
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
				},
				"mmoveevent": function(p_mapctx, p_evt, p_basic_config, p_global_constants) {
					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "pointer";

					ctrToolTip(p_mapctx, p_evt, p_mapctx.i18n.msg('ZIN', true));
				}
			},
			"home": {
				"drawface": function(p_ctx, p_left, p_top, p_width, p_height, p_basic_config, p_global_constants) {

					const imgh = new Image();
					imgh.decoding = "sync";
					imgh.src = p_global_constants.CONTROLS_STYLES.HOMESYMB;
			
					imgh.decode()
					.then(() => {
						p_ctx.drawImage(imgh, p_left + ((p_global_constants.CONTROLS_STYLES.SIZE - p_global_constants.CONTROLS_STYLES.HOMESYMBWID) / 2), p_top);
					});
				},
				"endevent": function(p_mapctx, p_evt, p_basic_config, p_global_constants) {
					p_mapctx.transformmgr.setScaleCenteredAtPoint(p_basic_config.scale, [p_basic_config.terrain_center[0], p_basic_config.terrain_center[1]], true);
					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "default";
				},
				"mmoveevent": function(p_mapctx, p_evt, p_basic_config, p_global_constants) {
					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "pointer";

					ctrToolTip(p_mapctx, p_evt, p_mapctx.i18n.msg('HOME', true));
				}
			}							
		}

	}

	drawControlFace(p_ctx, p_control_key, p_left, p_top, p_width, p_height, p_basic_config, p_global_constants) {

		// console.log("trls funcs:", Object.keys(this.controls_funcs));

		if (this.controls_funcs[p_control_key] !== undefined) {
			if (this.controls_funcs[p_control_key]["drawface"] !== undefined) {
				this.controls_funcs[p_control_key]["drawface"](p_ctx, p_left, p_top, p_width, p_height, p_basic_config, p_global_constants);
			} else {
				throw new Error(`drawControlFace, missing DRAWFACE control func block for ${p_control_key}`);
			}
		} else {
			throw new Error(`drawControlFace, missing control funcs block for ${p_control_key}`);
		}

	}

	interact(p_mapctx, p_evt) {

		let ret = false;
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
							this.controls_funcs[ctrl_key]["endevent"](p_mapctx, p_evt, p_mapctx.cfgvar["basic"], GlobalConst);
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

		} else {

			if (this.prev_ctrl_key) {

				// emulating mouseout

				this.prev_ctrl_key = null;

				const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
				topcnv.style.cursor = "default";

				const gfctx = p_mapctx.renderingsmgr.getDrwCtx("transient", '2d');		
				const canvas_dims = [];
				p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);
				gfctx.clearRect(0, 0, ...canvas_dims); 
				
			}





		}

		return ret;
	}

}


export class MapCustomizations {

	mapctx;
	messaging_ctrlr; // object with info, warn and error methods

	constructor(p_messaging_ctrlr) {

		this.messaging_ctrlr = p_messaging_ctrlr;
		this.instances = {
			"basiccontrolsbox": new BasicCtrlBox(),
			//"toc": new TOC();
			"infoclass": new Info(GlobalConst.INFO_MAPTIPS_BOXSTYLE),
			"mousecoordsprint": new MousecoordsPrint(),
			"mapscaleprint": new MapScalePrint(),
			"loadingmsgprint": new LoadingPrint()
		}
	}
}


