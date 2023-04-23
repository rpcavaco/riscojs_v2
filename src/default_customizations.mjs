

import {GlobalConst} from './constants.js';
import {MaptipBox} from './canvas_maptip.mjs';
import {InfoBox} from './canvas_info.mjs';

import {PermanentMessaging, LoadingMessaging, ControlsBox} from './customization_canvas_baseclasses.mjs';

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

			ctx.fillText(this.i18n.msg('ESCL', true) + " 1:"+p_scaleval, this.left+GlobalConst.MESSAGING_STYLES.TEXT_OFFSET, bottom-6);		

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
	}

	print(p_mapctx, p_msg) {

		const canvas_dims = [];
		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		try {
			p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);

			const msg = `${this.i18n.msg('LDNG', false)} ${p_msg}`;
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

class Info {
	// curr_layerkey;
	// curr_featid;
	callout;
	ibox;
	canvaslayer = 'interactive_viz';
	styles;

	constructor(p_styles) {
		this.styles = p_styles;
		this.callout = null;
		this.ibox = null;
	}
	hover(p_mapctx, p_layerkey, p_featid, p_feature, p_scrx, p_scry) {
		// this.curr_layerkey = p_layerkey;
		// this.curr_featid = p_featid;
		//console.log("Maptip, layer:", p_layerkey, " feat:", p_featid);
		const currlayer = p_mapctx.tocmgr.getLayer(p_layerkey);
		this.callout = new MaptipBox(p_mapctx, currlayer, p_featid, p_feature, this.styles, p_scrx, p_scry, true);
		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		this.callout.clear(ctx);
		this.callout.draw(ctx);
	}
	pick(p_mapctx, p_layerkey, p_featid, p_feature, p_scrx, p_scry) {
		this.clear(p_mapctx, p_layerkey, p_featid, p_scrx, p_scry)
		// this.curr_layerkey = p_layerkey;
		// this.curr_featid = p_featid;

		const currlayer = p_mapctx.tocmgr.getLayer(p_layerkey);
		if (currlayer["infocfg"] === undefined) {
			throw new Error(`Missing 'infocfg' config for layer '${this.layer.key}, cannot 'pick' features`);
		}
		if (currlayer["infocfg"]["keyfield"] === undefined) {
			throw new Error(`Missing 'infocfg.keyfield' config for layer '${this.layer.key}, cannot 'pick' features`);
		}

		if (p_feature.a[currlayer["infocfg"]["keyfield"]] === undefined) {
			console.warn(`[WARN] layer '${p_layerkey}' has no attribute corresponding to INFO key field '${currlayer["infocfg"]["keyfield"]}'`);
			return;
		}

		let keyval;
		const _keyval = p_feature.a[currlayer["infocfg"]["keyfield"]];

		if (currlayer["infocfg"]["keyisstring"] === undefined || !currlayer["infocfg"]["keyisstring"])
			keyval = _keyval;
		else
			keyval = _keyval.toString();


		const that = this;
		const lyr = p_mapctx.tocmgr.getLayer(p_layerkey);

		// done - [MissingFeat 0002] - Obter este URL de configs
		fetch(currlayer.url + "/doget", {
			method: "POST",
			body: JSON.stringify({"alias":lyr.infocfg.qrykey,"filtervals":[keyval],"pbuffer":0,"lang":"pt"})
		})
		.then(response => response.json())
		.then(
			function(responsejson) {
				const currlayer = p_mapctx.tocmgr.getLayer(p_layerkey);
				that.ibox = new InfoBox(p_mapctx, currlayer, responsejson, that.styles, p_scrx, p_scry, that.infobox_pick, false);
				const ctx = p_mapctx.renderingsmgr.getDrwCtx(that.canvaslayer, '2d');
				that.ibox.clear(ctx);
				that.ibox.draw(ctx);				
			}
		).catch((error) => {
			console.error(`Impossible to fetch attributes on '${p_layerkey}'`, error);
		});	
	} 
	// mouse pick inside info box and over any of its items
	infobox_pick(p_info_box, p_data_rec, p_fldname, p_column_idx) {
		
		//console.log(p_info_box, p_data_rec, p_fldname, p_column_idx);

		// open a new tab with URL, if it exists
		if (p_column_idx == 1 && p_info_box.urls[p_fldname] !== undefined) {
			window.open(p_info_box.urls[p_fldname], "_blank");
		}
	}
	clear(p_mapctx, p_layerkey, p_featid, p_scrx, p_scry) {
		//console.log("info/tip clear, prev layer:", p_layerkey, " feat:", p_featid);
		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		if (this.ibox) {
			this.ibox.clear(ctx);
		}
		if (this.callout) {
			this.callout.clear(ctx);
		}
	}
	interact(p_mapctx, p_evt) {
		if (this.ibox) {
			const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
			this.ibox.interact(ctx, p_evt);
		}

	}
}

export class GeoLocationMgr {

	mapctx;
	mapctx_config_var;
	transformmgr;
	geoloc;

	constructor(p_mapctx, p_transformmgr) {

		this.mapctx = p_mapctx;
		this.mapctx_config_var = p_mapctx.cfgvar["basic"];
		this.transformmgr = p_transformmgr;
	
		this.geoloc = {
			timeoutid: null,
			active: false,
			lastpos: [],
			last_ts: null
		}	
	}


	trackpos(p_gps_coords) {
		
		//console.log(p_gps_coords);
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

						s = that.transformmgr.getReadableCartoScale();
						usablescale = s;

						if (that.geoloc.last_ts) {
						
							ts = new Date();
							dt = ts - that.geoloc.last_ts;
							dx = that.geoloc.lastpos[0]-recieved_pos[0];
							dy = that.geoloc.lastpos[1]-recieved_pos[1];

							tol = GlobalConst.GEOLOCATION_NEXTPOS_TOLERANCE_PX * that.transformmgr.getPixSize();

							d = Math.sqrt(dx * dx + dy * dy);
							v = d / (dt / 1000);

							that.transformmgr.getCenter(curr_center);
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
						minsclval = that.transformmgr.convertScalingFactorToReadableScale(sf);

						if (GlobalConst.getDebug("GEOLOC")) {
							console.info("[DBG:GEOLOC] minsclval:", minsclval, "scl.factor:", sf, "min.scr.dim:", Math.min(...dims), "accur:", p_gps_coords.accuracy);
						}

						if (s < minsclval) {
							usablescale = minsclval;
							that.transformmgr.setScaleFromReadableCartoScale(minsclval, false);
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
								that.transformmgr.setScaleFromReadableCartoScale(vsclval, false);
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

							that.mapctx.tocmgr.addAfterRefreshProcedure(() => {

								const scr_pt = [];
								that.transformmgr.getScrPt(recieved_pos, scr_pt);

								const radius = Math.round(that.transformmgr.converReadableScaleToScalingFactor(usablescale) * p_gps_coords.accuracy);
								if (GlobalConst.getDebug("GEOLOC")) {
									console.log("[DBG:GEOLOC] drawGeolocationMarkings: radius, us.scale, scl.factor, accur:", radius, usablescale, that.transformmgr.converReadableScaleToScalingFactor(usablescale), p_gps_coords.accuracy);
								}
								that.drawGeolocationMarkings(scr_pt, radius);

							});

							if (GlobalConst.getDebug("GEOLOC")) {
								console.log("[DBG:GEOLOC] SET CENTER", recieved_pos);
							}

							that.transformmgr.setCenter(recieved_pos[0], recieved_pos[1], true);

							that.geoloc.lastpos.length = 2;
							that.geoloc.lastpos[0] = recieved_pos[0];
							that.geoloc.lastpos[1] = recieved_pos[1];
							that.geoloc.last_ts = new Date();

						} 

					}

				}
			).catch((error) => {
				console.error(`[GEOLOC] Impossible to transform coords`, error);
			});	

		} else {
			throw new Error("[GEOLOC] Missing URL for geometry service point transformation");
		}
		
	}

	toggleGeolocWatch() {

		const options = { enableHighAccuracy: true };

		function getLocation(p_this) {

			navigator.geolocation.getCurrentPosition((pos) => {
				
				console.log("[GEOLOC]", pos.coords);
				
				if (p_this.geoloc.active) {
					p_this.trackpos(pos.coords);
					p_this.geoloc.timeoutid = setTimeout(getLocation(p_this), GlobalConst.GEOLOCATION_INTERVAL_MS);
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

				navigator.permissions.query({ name: "geolocation" }).then((result) => {
					if (result.state !== "granted") {

						console.error("[GEOLOC] Geolocation permission not granted");
						this.mapctx.getCustomizationObject().messaging_ctrlr.warn("Ainda não foi dada permissão de uso da geolocalização.")

					} else {

						this.geoloc.active = true;
						getLocation(this);
						this.mapctx.getCustomizationObject().messaging_ctrlr.info("Geolocalização iniciada");
		
					}
				});				  
				  
			}		
		} else {
			this.mapctx.getCustomizationObject().messaging_ctrlr.warn("Impossível ativar geolocalização");
		}


	}

	drawGeolocationMarkings(p_scr_pt, p_radius) {

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

    }
}

class BasicCtrlBox extends ControlsBox {

	constructor() {
		super();

		this.orientation = "VERTICAL";
		this.controls_keys = [
			"zoomout",
			"home",
			"zoomin"
			//"gps"
		];

		this.gap = GlobalConst.CONTROLS_STYLES.GAP;

		this.controls_funcs = {
			"zoomout": {
				"drawface": function(p_ctx, p_left, p_top, p_width, p_height, p_basic_config, p_global_constants) {
					p_ctx.beginPath();
					p_ctx.moveTo(p_left+p_width*0.2, p_top+p_height*0.5);
					p_ctx.lineTo(p_left+p_width*0.8, p_top+p_height*0.5);
					p_ctx.stroke();
				},
				"endevent": function(p_mapctx, p_basic_config, p_global_constants) {
//					console.log("***", p_basic_config);
					p_mapctx.transformmgr.zoomOut(p_basic_config.maxscaleview.scale, p_global_constants.SCALEINOUT_STEP, true);
					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "default";
				},
				"mmoveevent": function(p_mapctx, p_basic_config, p_global_constants) {
					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "pointer";
				},
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
				"endevent": function(p_mapctx, p_basic_config, p_global_constants) {
					p_mapctx.transformmgr.zoomIn(p_global_constants.MINSCALE, p_global_constants.SCALEINOUT_STEP, true);
					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "default";
				},
				"mmoveevent": function(p_mapctx, p_basic_config, p_global_constants) {
					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "pointer";
				},
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
				"endevent": function(p_mapctx, p_basic_config, p_global_constants) {
					p_mapctx.transformmgr.setScaleCenteredAtPoint(p_basic_config.scale, [p_basic_config.terrain_center[0], p_basic_config.terrain_center[1]], true);
					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "default";
				},
				"mmoveevent": function(p_mapctx, p_basic_config, p_global_constants) {
					const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					topcnv.style.cursor = "pointer";
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

			if (this.controls_funcs[ctrl_key] !== undefined) {

				switch(p_evt.type) {

					case 'touchend':
					case 'mouseup':

						if (this.controls_funcs[ctrl_key]["endevent"] !== undefined) {
							this.controls_funcs[ctrl_key]["endevent"](p_mapctx, p_mapctx.cfgvar["basic"], GlobalConst);
						} else {
							throw new Error("interact, missing endevent control func block for", ctrl_key);
						}
						break;

					case "mousemove":

						if (this.controls_funcs[ctrl_key]["mmoveevent"] !== undefined) {
							this.controls_funcs[ctrl_key]["mmoveevent"](p_mapctx, p_mapctx.cfgvar["basic"], GlobalConst);
						} else {
							throw new Error("interact, missing mmoveevent control func block for", ctrl_key);
						}

				}

			} else {
				throw new Error("interact, missing control funcs block for", ctrl_key);
			}

			ret = true;

		} else {

			const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
			topcnv.style.cursor = "default";	

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
			"mousecoordsprint": new MousecoordsPrint(),
			"mapscaleprint": new MapScalePrint(),
			"loadingmsgprint": new LoadingPrint(),
			"infoclass": new Info(GlobalConst.INFO_MAPTIPS_BOXSTYLE)
		}
	}
}


