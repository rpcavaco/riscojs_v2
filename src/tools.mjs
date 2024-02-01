
import {GlobalConst} from './constants.js';
import {dist2D} from './geom.mjs';
import {BaseTool, interactWithSpindexLayer, wheelEventCtrller} from './interactions.mjs'

// pan, zoom wheel
class MultiTool extends BaseTool {

	name = 'MultiTool';
	constructor(p_mapctx) {
		super(p_mapctx, false, false); // not part of general toggle group, surely not default in toogle
		this.start_screen = null;
		this.pending_pinch = null;
		this.imgs_dict={};		
		this.wheelevtctrlr = new wheelEventCtrller();
		//this.touchevtctrlr = new TouchController();
		this._isworking_timeout = null;
	}

	finishPan(p_transfmgr, p_x, p_y, opt_origin) {

		if (this._isworking_timeout) {
			
			clearTimeout(this._isworking_timeout);

			(function(p_this, pp_transfmgr, pp_x, pp_y, oopt_origin, p_delay_msecs) {
				p_this._isworking_timeout = setTimeout(function() {
					p_this.finishPan(pp_transfmgr, pp_x, pp_y, oopt_origin);
				}, p_delay_msecs);
			})(this, p_transfmgr, p_transfmgr, p_x, p_y, opt_origin, 700);

		} else {

			let dx=1, dy=1;
			let deltascrx =  Math.abs(this.start_screen[0] - p_x);
			let deltascry =  Math.abs(this.start_screen[1] - p_y);

			this.imgs_dict={};

			if (opt_origin == 'touch') {
				dx = 6;
				dy = 6;
			}

			if (GlobalConst.getDebug("INTERACTIONCLICKEND")) {
				console.log("[DBG:INTERACTIONCLICKEND] MULTITOOL finishPan, deltascr:", deltascrx, deltascry, "dx_dy:", dx, dy);
			}

			if (deltascrx > dx || deltascry > dy) {		
				p_transfmgr.doPan(this.start_screen, [p_x, p_y], true);
			}

		}
	}

	finishZoomTo(p_transfmgr, p_x, p_y, p_scalingf) {

		if (this._isworking_timeout) {
			
			clearTimeout(this._isworking_timeout);

			(function(p_this, pp_transfmgr, pp_x, pp_y, pp_scalingf, p_delay_msecs) {
				p_this._isworking_timeout = setTimeout(function() {
					p_this.finishZoomTo(pp_transfmgr, pp_x, pp_y, pp_scalingf);
				}, p_delay_msecs);
			})(this, p_transfmgr, p_x, p_y, p_scalingf, 700);

		} else {

			const cs = p_transfmgr.getReadableCartoScale();
			const newscale = p_scalingf * cs;

			this.imgs_dict={};
			
			if (GlobalConst.getDebug("INTERACTION")) {
				console.log("[DBG:INTERACTION] finishZoomTo, scale, x, y:", newscale, [p_x, p_y]);
			}
		
			p_transfmgr.setScaleCenteredAtScrPoint(newscale, [p_x, p_y], true);
	
		}

	}

	concludePendingAction(p_mapctx, p_evt, p_orig) {
		
		let orig, ret =false;

		if (this.pending_pinch) {

			this.finishZoomTo(p_mapctx.transformmgr, this.pending_pinch.centerx, this.pending_pinch.centery, this.pending_pinch.scale)
			this.pending_pinch = null;

			this.wheelevtctrlr.clear();
			ret = true;

		} else if (this.start_screen != null) {

			// never do pan on mouseout or mouseleave events
			//if (["mouseleave", "mouseout"].indexOf(p_evt.type) < 0) {
			if (p_orig) {
				orig = p_orig;
			} else {
				orig = "mouse";
			}

			this.finishPan(p_mapctx.transformmgr, p_evt.offsetX, p_evt.offsetY, orig);	

			//}
			this.imgs_dict={};
			this.start_screen = null;

			this.wheelevtctrlr.clear();
			ret = true;
		}

		return ret;
	}	

	onEvent(p_mapctx, p_evt) {

		let orig, ret = false;

		if (GlobalConst.getDebug("INTERACTION")) {
			console.log("[DBG:INTERACTION] MULTITOOL evt.type:", p_evt.type);
		}
		if (GlobalConst.getDebug("INTERACTIONCLICKEND") && ["touchstart", "touchend", "mousedown", "mouseup", "mouseleave", "mouseout"].indexOf(p_evt.type) >= 0) {
			console.log("[DBG:INTERACTIONCLICKEND] MULTITOOL onEvent evt.type:", p_evt.type);
		}

		if (GlobalConst.getDebug("INTERACTIONOUT") && p_evt.type == "mouseout") {
			console.log("[DBG:INTERACTIONOUT] MULTITOOL, mouseout");
		}		

		try {
			orig = null;
			switch(p_evt.type) {

				case 'touchpinch':
					this.pending_pinch = p_evt;
					ret = true;
					break;

				case 'touchstart':
				case 'mousedown':
					//console.log("mdown multitool");
					//console.trace();
					// console.log(p_evt, "start:", this.start_screen, (p_evt.buttons & 1) == 1);

					if (GlobalConst.getDebug("INTERACTIONCLICKEND") && ["touchstart", "touchend", "mousedown", "mouseup", "mouseleave", "mouseout"].indexOf(p_evt.type) >= 0) {
						console.log("[DBG:INTERACTIONCLICKEND] MULTITOOL mdown:", p_evt, "startscrpt:", this.start_screen, "orig:", orig, "pinch:", this.pending_pinch);
					}

					if (this.start_screen == null) {
						if (p_evt.buttons === undefined || (p_evt.buttons & 1) == 1) {						
							this.start_screen = [p_evt.offsetX, p_evt.offsetY];		
							if (GlobalConst.getDebug("INTERACTIONCLICKEND") && ["touchstart", "touchend", "mousedown", "mouseup", "mouseleave", "mouseout"].indexOf(p_evt.type) >= 0) {
								console.log("[DBG:INTERACTIONCLICKEND] MULTITOOL mdown start point marked at:", this.start_screen);
							}		
							p_mapctx.renderingsmgr.getRenderedBitmaps(this.imgs_dict);
						}
					} else {
						this.start_screen = null;
					}
					this.wheelevtctrlr.clear();
					ret = true;
					break;

				case 'touchend':
					orig = "touch";
					// fallthrough
				case 'mouseup':
					// console.log("mup multitool");
					// console.trace();
				case 'mouseout':
				case 'mouseleave':
					if (orig == null) {
						orig = "mouse";
					}

					if (GlobalConst.getDebug("INTERACTION")) {
						console.log("[DBG:INTERACTION] MULTITOOL up/end/out/leave:", this.start_screen, orig, p_evt, this.pending_pinch);
					}
					if (GlobalConst.getDebug("INTERACTIONCLICKEND") && ["touchstart", "touchend", "mousedown", "mouseup", "mouseleave", "mouseout"].indexOf(p_evt.type) >= 0) {
						console.log("[DBG:INTERACTIONCLICKEND] MULTITOOL up/end/out/leave", p_evt, "startscrpt:", this.start_screen, "orig:", orig, "pinch:", this.pending_pinch);
					}
			
					/*if (this.pending_pinch) {

						this.finishZoomTo(p_mapctx.transformmgr, this.pending_pinch.centerx, this.pending_pinch.centery, this.pending_pinch.scale)
						this.pending_pinch = null;

					} else if (this.start_screen != null) {

						// never do pan on mouseout or mouseleave events
						//if (["mouseleave", "mouseout"].indexOf(p_evt.type) < 0) {
							this.finishPan(p_mapctx.transformmgr, p_evt.offsetX, p_evt.offsetY, orig);	
						//}
						this.imgs_dict={};
						this.start_screen = null;
					} */

					if (!this.concludePendingAction(p_mapctx, p_evt, orig)) {
						this.wheelevtctrlr.clear();
					}

					ret = true;
					break;

				case 'touchmove':
				case 'mousemove':
					p_mapctx.printMouseCoords(p_evt.offsetX, p_evt.offsetY);
					if (this.start_screen != null) {
						if (p_evt.buttons === undefined || (p_evt.buttons & 1) == 1) {
							p_mapctx.renderingsmgr.putImages(this.imgs_dict, [p_evt.offsetX-this.start_screen[0], p_evt.offsetY-this.start_screen[1]]);
						}
					}
					//this.wheelevtctrlr.clear();
					ret = true;
					break;

				case 'wheel':

					this.wheelevtctrlr.onWheelEvent(p_mapctx, this.imgs_dict, p_evt);
					ret = true;
					break;


			}
		} catch(e) {
			this.start_screen = null;
			this.imgs_dict={};
			this.pending_pinch = null;
			console.error(e);
		}  

		// interacted with this tool ?
		return ret;

		
	}	
}

class InfoTool extends BaseTool {

	name = 'InfoTool';
	pickpanel_active;
	fixedtippanel_active;
	toc_collapsed;
	constructor(p_mapctx) {
		super(p_mapctx, true, true); // part of general toggle group, default in toogle
		this.pickpanel_active = false;
		this.fixedtippanel_active = false;
		this.toc_collapsed = false;
	}

	static mouseselMaxdist(p_mapctx) {
		const mscale = p_mapctx.getScale();
		return GlobalConst.FEATMOUSESEL_MAXDIST_1K * mscale / 1000.0;
	}

	setTocCollapsed(p_is_collapsed) {
		this.toc_collapsed = p_is_collapsed;
	}
	
	cleanUp(p_mapctx) {

		const ci = p_mapctx.getCustomizationObject();
		if (ci == null) {
			console.warn("[WARN] InfoTool cleanup, customization instance is missing - inocuous warning at startup")
		} else {
			const ic = ci.instances["infoclass"];
			if (ic) {
				ic.clearinfo(p_mapctx, 'INFOTOOLCLEANUP');
			}
		
		}	
	}

	onEvent(p_mapctx, p_evt) {

		let mxdist, ret = false; 
		const ci = p_mapctx.getCustomizationObject();
		if (ci == null) {
			throw new Error("InfoTool onEvent, customization instance is missing")
		}

		const ic = ci.instances["infoclass"];

		try {

			let insidefixedtippanel = false;
			let insideainfoboxpanel = false;

			if (ic.callout != null && ic.callout !== undefined && ic.callout['box'] !== undefined) {
				if (this.getFixedtipPanelActive()) {
					if (p_evt.offsetX >= ic.callout.box[0] && p_evt.offsetX <= ic.callout.box[0] + ic.callout.box[2] && 
						p_evt.offsetY >= ic.callout.box[1] && p_evt.offsetY <= ic.callout.box[1] + ic.callout.box[3]) {
							insidefixedtippanel = true;
					}
				}
			}

			if (!insidefixedtippanel) {
				if (ic.ibox != null && ic.pick !== undefined && ic.ibox['box'] !== undefined) {
					if (this.getPickPanelActive()) {
						if (p_evt.offsetX >= ic.ibox.box[0] && p_evt.offsetX <= ic.ibox.box[0] + ic.ibox.box[2] && 
							p_evt.offsetY >= ic.ibox.box[1] && p_evt.offsetY <= ic.ibox.box[1] + ic.ibox.box[3]) {
								insideainfoboxpanel = true;
						}
					}
				}	
			}
	
			if (GlobalConst.getDebug("INTERACTION")) {
				console.log("[DBG:INTERACTION] INFOTOOL onEvent evt.type:", p_evt.type, "insideactivepanel:", insideainfoboxpanel, "insidefixedtippanel:", insidefixedtippanel);
			}
			if (GlobalConst.getDebug("INTERACTIONCLICKEND") && ["touchstart", "touchend", "mousedown", "mouseup", "mouseleave", "mouseout"].indexOf(p_evt.type) >= 0) {
				console.log("[DBG:INTERACTIONCLICKEND] INFOTOOL onEvent evt.type:", p_evt.type, "insideactivepanel:", insideainfoboxpanel, "insidefixedtippanel:", insidefixedtippanel);
			}

			if (GlobalConst.getDebug("INTERACTIONOUT") && p_evt.type == "mouseout") {
				console.log("[DBG:INTERACTIONOUT] INFOTOOL, mouseout");
			}	
			
			//console.log("-- Infotool on event, evt.type:", p_evt.type, "cstm:", p_evt.custom);

			switch(p_evt.type) {

				case 'touchstart':
				case 'mousedown':
					if (insidefixedtippanel || insideainfoboxpanel) {
						ret = true; 
					}
					break;

				case 'touchend':
				case 'mouseup':

					if (ic.pick !== undefined || ic.callout !== undefined) {

						if (insidefixedtippanel) {
							ic.interactFixedtip(p_evt);
							this.setFixedtipPanelActive(ic.callout.is_drawn);
							ret = true;
						} else if (insideainfoboxpanel) {
							ic.interactInfobox(p_evt);
							ret = true; 
						} else {
							this.setAllPanelsInactive();
						}

						if (!ret && !this.getAnyPanelActive()) {
 
							mxdist = this.constructor.mouseselMaxdist(p_mapctx);
							ret = interactWithSpindexLayer(p_mapctx, p_evt.offsetX, p_evt.offsetY, mxdist, true, 
								{
									"hover": ic.hover.bind(ic),
									"pick": ic.pick.bind(ic)

								},
								ic.clearinfo.bind(ic));
						}
					} else {
						console.warn(`infoclass customization unavailable, cannot pick feature`);			
					}	
				
					break;

				case 'mouseout':
					ic.clearinfo(p_mapctx, 'INFOTOOL_MOUSEOUT');
					break;

				case 'mousemove':
				case "adv_hover":
					// if any tablet mode, ignore mouse move for info / maptip purposes

					if (p_evt.type == "mousemove" && p_mapctx.tabletmode.toLowerCase() != "none") {
						ret = false;
						break;
					}

					if (!this.getAnyPanelActive()) {
						if (ic.hover !== undefined) {

							ic.clearinfo(p_mapctx, 'INFOTOOL_MOUSEMOVE');
		
							mxdist = this.constructor.mouseselMaxdist(p_mapctx);
							// console.log(":: 389 :: type:", p_evt.type, p_evt.offsetX, p_evt.offsetY);
							ret = interactWithSpindexLayer(p_mapctx, p_evt.offsetX, p_evt.offsetY, mxdist, false, {"hover": ic.hover.bind(ic)}, ic.clearinfo.bind(ic));
						} else {
							console.warn(`infoclass customization unavailable, cannot hover / maptip feature`);			
						}	
					} else {
						if (insidefixedtippanel) {
							ic.interactFixedtip(p_evt);
							ret = true; 
						} else if (insideainfoboxpanel) {
							ic.interactInfobox(p_evt);
							ret = true; 
						}						
					}
					break;

			}
		} catch(e) {
			console.error(e);
		}  

		// has this tool interacted with event ?
		return ret;
		
	}	

	setPickPanelActive(b_panel_is_active) {
		this.pickpanel_active = b_panel_is_active;
	}

	setFixedtipPanelActive(b_panel_is_active) {
		this.fixedtippanel_active = b_panel_is_active;
	}

	setAllPanelsInactive() {
		this.pickpanel_active = false;
		this.fixedtippanel_active = false;
	}
	
	getAnyPanelActive() {
		return this.fixedtippanel_active || this.pickpanel_active;
	}

	getFixedtipPanelActive() {
		return this.fixedtippanel_active;
	}	

	getPickPanelActive() {
		return this.pickpanel_active;
	}	

}

class PointEditTool extends BaseTool {

	canvaslayers = ['temporary', 'transientmap'];
	toc_collapsed;
	editmanager;
	editfeat_engaged = false;
	constructor(p_mapctx) {
		super(p_mapctx, true, false); // part of general toggle group, default in toogle
		this.toc_collapsed = false;
		this.editmanager = null;
	}

	static mouseselMaxdist(p_mapctx) {
		const mscale = p_mapctx.getScale();
		return GlobalConst.FEATMOUSESEL_MAXDIST_1K * mscale / 1000.0;
	}

	setTocCollapsed(p_is_collapsed) {
		this.toc_collapsed = p_is_collapsed;
	}

	setEditingManager(p_edit_manager) {
		if (p_edit_manager) {
			console.info("[init RISCO] PointEditTool, edit manager is set");
			this.editmanager = p_edit_manager;
		} else {
			throw new Error("setEditingManager, no edit manager passed");
		}
	}

	async init(p_mapctx) {

		if (this.editmanager == null) {
			throw new Error("PointEditTool, mandatory previous use of 'setEditingManager' has not happened");
		}

		// If tabletFeatPreSelection is set, meaning tablet mode SIMPLE is enabled and there is a presel feature
		if (p_mapctx.tabletFeatPreSelection.isSet) {
			const feat = this.editmanager.setCurrentEditFeature(p_mapctx, p_mapctx.tabletFeatPreSelection.get());
			if (feat) {
				await p_mapctx.drawFeatureAsMouseSelected(this.editmanager.editingLayerKey, feat.id, "EDITSEL", {'normal': 'temporary', 'label': 'temporary' });		
			}
		}	
	}

	clearCanvas(p_mapctx) {

		let gfctx;
		const canvas_dims = [];		
		p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);
		for (const cl of this.canvaslayers) {
			gfctx = p_mapctx.renderingsmgr.getDrwCtx(cl, '2d');
			gfctx.clearRect(0, 0, ...canvas_dims); 	
		}	

	}

	/*
	clearCanvasAndResetEditFeat(p_mapctx) {

		this.clearCanvas(p_mapctx);	
		this.editmanager.resetCurrentEditFeatureHolder();

	}	
	*/

	clickOnEmpty(p_mapctx, p_source_id, p_scrx, p_scry) {

		// ... and create set / create vertex or new point object

		if (p_source_id == 'TOC' || p_source_id == 'TOCMGR') {
			return;
		}

		this.clearCanvas(p_mapctx);

		p_mapctx.drawVertex("NEW", p_scrx, p_scry, 'temporary');

		if (this.editfeat_engaged) {
			// edit current vertex in current feature
			this.editmanager.editCurrentVertex(p_mapctx, p_scrx, p_scry);
			p_mapctx.featureCollection.redrawAllVectorLayers();
		} else {
			// add new vertex to current feature or init a new feature creating its first vertex
			this.editmanager.addNewVertex(p_mapctx, "point", p_scrx, p_scry);
		}
	} 

	hoverOnEmpty(p_mapctx, p_source_id, p_scrx, p_scry) {

		// ... and create set / create vertex or new point object

		if (p_source_id == 'TOC' || p_source_id == 'TOCMGR') {
			return;
		}

		this.clearCanvas(p_mapctx);

	} 	

	hover(p_mapctx, p_feature_dict, p_scrx, p_scry){

		let feat=null, layerklist, doDrawFeat = false, ret = null;

		this.editfeat_engaged = false;

		feat = this.editmanager.setCurrentEditFeature(p_mapctx, p_feature_dict);
		if (feat) {
			ret = p_mapctx.drawFeatureAsMouseSelected(this.editmanager.editingLayerKey, feat.id, "EDITSEL", {'normal': 'temporary', 'label': 'temporary' });		
		}

		return ret;
	}

	pick(p_mapctx, p_feature_dict, p_scrx, p_scry) {

		let layerklist, ret = null;

		// If NOT tabletFeatPreSelection is active, meaning tablet mode is NOT SIMPLE, lets act as expected in pick method
		if (!p_mapctx.tabletFeatPreSelection.isActive) {
			this.editmanager.setCurrentEditFeature(p_mapctx, p_feature_dict);
		}

		if (this.editmanager.currentEditFeatHolder != null) {
			layerklist = Object.keys(p_feature_dict);
			ret = p_mapctx.drawFeatureAsMouseSelected(layerklist[0], p_feature_dict[layerklist[0]][0].id, "EDITENGAGE", {'normal': 'temporary', 'label': 'temporary' });	
			if (ret) {
				this.editfeat_engaged = true;
			}
		}

		// TODO - usar p_scrx, p_scry para 'apanhar' o vértice da geometria amover, zero para o ponto

		if (p_feature_dict[layerklist[0]][0].feat.gt == "point") {
			this.editmanager.setCurrentEditVertex(p_mapctx, 0, 0);
		}

		return ret;

	}

	hoverEditVertex(p_mapctx, p_source_id, p_scrx, p_scry) {
		p_mapctx.drawVertex("MOVE", p_scrx, p_scry, 'transientmap');
	}

	async onEvent(p_mapctx, p_evt) {

		let mxdist, ret = false; 

		try {
	
			if (GlobalConst.getDebug("INTERACTION")) {
				console.log("[DBG:INTERACTION] SIMPLEPTEDITTOOL onEvent evt.type:", p_evt.type);
			}
			if (GlobalConst.getDebug("INTERACTIONCLICKEND") && ["touchstart", "touchend", "mousedown", "mouseup", "mouseleave", "mouseout"].indexOf(p_evt.type) >= 0) {
				console.log("[DBG:INTERACTIONCLICKEND] SIMPLEPTEDITTOOL onEvent evt.type:", p_evt.type);
			}

			if (GlobalConst.getDebug("INTERACTIONOUT") && p_evt.type == "mouseout") {
				console.log("[DBG:INTERACTIONOUT] SIMPLEPTEDITTOOL, mouseout");
			}				

			switch(p_evt.type) {

				/*case 'touchstart':
				case 'mousedown':
					if (insidefixedtippanel || insideainfoboxpanel) {
						ret = true; 
					}
					break; */

				case 'touchend':
				case 'mouseup':

					mxdist = this.constructor.mouseselMaxdist(p_mapctx);
					ret = interactWithSpindexLayer(p_mapctx, p_evt.offsetX, p_evt.offsetY, mxdist, true, 
						{
							"hover": this.hover.bind(this),
							"pick": this.pick.bind(this)

						},
						this.clickOnEmpty.bind(this));

					break;

				case 'mouseout':
					this.clearCanvas(p_mapctx);
					break;

				case 'mousemove':
					// if in tablet mode SIMPLE, ignore mouse move for info / maptip purposes , EXCEPT when feature engaged
					if (this.editfeat_engaged) {

						mxdist = this.constructor.mouseselMaxdist(p_mapctx);
						ret = interactWithSpindexLayer(p_mapctx, p_evt.offsetX, p_evt.offsetY, mxdist, false, null, null, this.hoverEditVertex.bind(this));

					} else {

						// if in tablet mode SIMPLE, ignore mouse move for info / maptip purposes
						if (p_mapctx.tabletFeatPreSelection.isActive) {
							ret = false;
						} else {
							mxdist = this.constructor.mouseselMaxdist(p_mapctx);
							ret = interactWithSpindexLayer(p_mapctx, p_evt.offsetX, p_evt.offsetY, mxdist, false, { "hover": this.hover.bind(this) }, null, this.hoverOnEmpty.bind(this));	
						}
						break;
					}

			}
		} catch(e) {
			console.error(e);
		}  

		// has this tool interacted with event ?
		return ret;
		
	}	

	cleanUp(p_mapctx) {

		console.info("[INFO] PointEditTool cleanup");

		this.editfeat_engaged = false;
		this.editmanager.resetCurrentEditFeatureHolder();
	}	
}


class MeasureTool extends BaseTool {

	name = 'MeasureTool';
	accumdist;
	prevpt;
	constructor(p_mapctx) {
		super(p_mapctx, true, false); // part of general toggle group, default in toogle
		this.accumdist = 0;
		this.prevpt = null;
	}

	onEvent(p_mapctx, p_evt) {

		let d, pt, ret = false;
		// const ci = p_mapctx.getCustomizationObject();
		// if (ci == null) {
		// 	throw new Error("InfoTool, customization instance is missing")
		// }

		// const ic = ci.instances["infoclass"];

		try {
			switch(p_evt.type) {

				case 'dblclick':
					this.accumdist = 0;
					this.prevpt = null;
					ret = true;
					break;

				case 'mouseup':
					if (this.prevpt == null) {
						this.prevpt = [p_evt.offsetX, p_evt.offsetY];
						console.log("dist start");
					} else {
						pt = [p_evt.offsetX, p_evt.offsetY];
						d = dist2D(this.prevpt, pt);
						if (d < 2) {
							this.accumdist = 0;
							this.prevpt = null;	
							console.log("dist reset");	
						} else {
							this.accumdist += d;
							this.prevpt = [p_evt.offsetX, p_evt.offsetY];
							console.log("dist:", this.accumdist);
						}
					}	
					ret = true;					
					break;

			}
		} catch(e) {
			console.error(e);
		}  

		return ret;
		
	}	
}

export class ToolManager {

	editmgr;
	maptools;
	mapcontrolmgrs;

	constructor(p_mapctx, p_mapctx_config_var) {

		if (p_mapctx_config_var == null) {
			throw new Error("Class ToolManager, null mapctx_config_var");
		}

		this.basic_config = p_mapctx_config_var;

		// this.maptools = [new DefaultTool(), new MultiTool()];
		this.maptools = [new MultiTool(p_mapctx)];
		this.mapcontrolmgrs = [];
		
		if (p_mapctx_config_var["togglable_tools"] !== undefined) {
			for (let i=0; i<p_mapctx_config_var["togglable_tools"].length; i++) {
				switch (p_mapctx_config_var["togglable_tools"][i]) {
					case "InfoTool":
						this.addTool(new InfoTool(p_mapctx));
						break;
					case "MeasureTool":
						this.addTool(new MeasureTool(p_mapctx));
						break;
					case "PointEditTool":
						this.addTool(new PointEditTool(p_mapctx));
						break;
					}
			}
		}	

		const tnames = [];
		for (let mt of this.maptools) {
			tnames.push(mt.name);
		}
		console.info("[init RISCO] tools in ToolManager:", tnames);

		
	}

	setEditingManager(p_editmgr) {

		if (p_editmgr == null) {
			throw new Error("Class ToolManager, setEditingManager, null instance passed");
		}

		this.editmgr = p_editmgr;

		for (const t of this.maptools) {
			if (t['setEditingManager'] !== undefined && t.editmanager == null) {
				t.setEditingManager(this.editmgr);
				console.info(`[INFO] Delayed setting of edit mgr. for tool '${t.name}' is now completed`);
			}
		}

	}

	addTool(p_toolinstance) {

		if (p_toolinstance == null) {
			throw new Error("Class ToolManager, addTool, null tool instance passed");
		}	

		const existing_classnames = [], classname = p_toolinstance.constructor.name;
		if (!(p_toolinstance instanceof BaseTool)) {
			throw new Error(`Class ToolManager, addTool, tool is not a BaseTool instance: ${p_toolinstance.name}`);
		}	
		
		if (p_toolinstance['setEditingManager'] !== undefined) {
			if (this.editmgr) {
				p_toolinstance.setEditingManager(this.editmgr);
			} else {
				console.warn(`[WARN] ToolManager, no edit manager YET available for '${p_toolinstance.name}'; later when 'ToolManager.setEditingManager' will be called it will also set edit mgr. for this tool.`);
			}
		}

		for (let i=0; i<this.maptools.length; i++) {
			if (existing_classnames.indexOf(this.maptools[i].constructor.name) >= 0) {
				throw new Error(`Class ToolManager, addTool, found duplicate tool instance of: ${this.maptools[i].name}`);
			}
			existing_classnames.push(this.maptools[i].constructor.name); 
		}	
		
		if (existing_classnames.indexOf(p_toolinstance.constructor.name) < 0) { 
			this.maptools.push(p_toolinstance);
		} else {
			console.error(`Class ToolManager, addTool, foiled attempt to add duplicate instance of: ${p_toolinstance.constructor.name}`);
		}	
	}

	findTool(p_classname) {
		let foundtool = null;
		for (let i=0; i<this.maptools.length; i++) {
			if (this.maptools[i].constructor.name == p_classname) {
				foundtool = this.maptools[i];
			}
		}	
		if (foundtool == null) {
			throw new Error(`Class ToolManager, no instance of '${p_classname}' was found. Must add it to 'togglable_tools' in basic config`);
		}
		return foundtool;	
	}

	enableDefaultToolInToggleGroup(p_mapctx) {
		for (let j=0; j<this.maptools.length; j++) {
			if (!this.maptools[j].joinstogglegroup) {
				continue;
			}
			if (this.maptools[j].defaultintoggle) {
				this.maptools[j].setEnabled(p_mapctx, true);
			} else {
				this.maptools[j].setEnabled(p_mapctx, false);
			}
		}		
	}

	enableTool(p_mapctx, p_classname, p_do_enable) {

		let foundtool = this.findTool(p_classname);

		if (foundtool == null) {
			return null;
		}

		if (GlobalConst.getDebug("TOOLENABLE")) {
			console.info("[DBG:TOOLENABLE] enableTool, tool:", foundtool.name, "enabled:", p_do_enable);
		}		

		if (!foundtool.joinstogglegroup) {
			foundtool.setEnabled(p_do_enable);
		} else {
			if (p_do_enable) {

				// disable all in toggle group ...
				for (let j=0; j<this.maptools.length; j++) {
					if (!this.maptools[j].joinstogglegroup) {
						continue;
					}		
					this.maptools[j].setEnabled(p_mapctx, false);
				}	

				// enable chosen tool
				foundtool.setEnabled(p_mapctx, true);	

			} else {

				// Enable default tool, keeping all others disabled
				for (let j=0; j<this.maptools.length; j++) {
					if (!this.maptools[j].joinstogglegroup) {
						continue;
					}
					this.maptools[j].setEnabled(p_mapctx, this.maptools[j].defaultintoggle);
				}
			}
		}

		return foundtool;
	}

	// event procedes from mxOnEvent
	toolmgrOnEvent(p_mapctx, p_evt) {

		const clickendevents = ["touchstart", "touchend", "mousedown", "mouseup", "mouseleave", "mouseout"];

		let _ret;

		// console.log("mapcontrolmgrs:", Object.keys(this.mapcontrolmgrs));

		for (let mapctrl_key in this.mapcontrolmgrs) {

			if (!this.mapcontrolmgrs.hasOwnProperty(mapctrl_key)) {
				continue;
			}

			if (this.mapcontrolmgrs[mapctrl_key]["interact"] === undefined) {
				console.error(`missing 'interact' function for control key '${mapctrl_key}'`);
				continue;
			}

			_ret = this.mapcontrolmgrs[mapctrl_key].interact(p_mapctx, p_evt);
			if (_ret) {

				// Conclude the first pending action found on an active maptool, searching from last in maptools list
				for (let i=this.maptools.length-1; i>=0; i--) {
					if (this.maptools[i].enabled) {
						if (this.maptools[i].concludePendingAction(p_mapctx, p_evt)) {
							break;
						}
					}
				}
				break;
			}
		}

		if (GlobalConst.getDebug("INTERACTION")) {
			console.log("[DBG:INTERACTION] ToolManager toolmgrOnEvent evt.type:", p_evt.type, "interacted with map controls:", _ret);
		}
		if (GlobalConst.getDebug("INTERACTIONCLICKEND") && clickendevents.indexOf(p_evt.type) >= 0) {
			console.log("[DBG:INTERACTIONCLICKEND] ToolManager toolmgrOnEvent evt.type:", p_evt.type, "interacted with map controls:", _ret);
		}

		// if event interacted with any map controls (_ret is true) 
		//  we prevent its dispatchment to the active tools

		if (!_ret) {
			// for (let i=this.maptools.length-1; i>=0; i--) {
			let evt = p_evt, mapdims = [], center_pt;
			let toggletool_already_interacted = false; 
			let mini, step;

			// if (p_mapctx.tabletmode.toLowerCase() == "advanced") {
			// 	mini = 0;
			// 	maxi = this.maptools.length;
			// 	step = 1;
			// } else {
			mini = this.maptools.length-1;
			step = -1;
			//}

			for (let i=mini; ; i=i+step) {

				// if (p_mapctx.tabletmode.toLowerCase() == "advanced") {
				// 	if (i >= this.maptools.length) {
				// 		return;
				// 	}
				// } else {
				if (i < 0) {
					return;
				}
				//}

				// toggletool_already_interacted - signals if a tool joining a toggle group already interacted with this event.
				// In that case, other tools joining toggle groups should not interact

				// Other tools, including always-available ones like 'base' tool, should not be prevented
				// from interacting

				if (this.maptools[i].enabled) {

					if (this.maptools[i].joinstogglegroup && toggletool_already_interacted) {
						continue;
					}

					_ret = this.maptools[i].onEvent(p_mapctx, evt);

					// if (_ret && p_mapctx.tabletmode.toLowerCase() == "advanced") {
					// 	if (evt.custom !== undefined && evt.custom.operation == "pan") {
					// 		p_mapctx.renderingsmgr.getCanvasDims(mapdims);					
					// 		center_pt = p_mapctx.getCenterPoint(mapdims);
					// 		evt = {
					// 			type: "adv_hover",
					// 			offsetX: center_pt[0],
					// 			offsetY: center_pt[1],
					// 			custom: {
					// 				orig: "synthetic"
					// 			}
					// 		}
					// 	}
					// }

					if (p_evt.type.startsWith("adv")) {
						console.log(_ret, i, this.maptools[i].constructor.name, "ty:", p_evt.type, "->", evt.type, "custX:", evt.offsetX, "Y:", evt.offsetY, evt.custom);
					}

					if (GlobalConst.getDebug("INTERACTIONCLICKEND") && clickendevents.indexOf(evt.type) >= 0) {
						console.log("[DBG:INTERACTIONCLICKEND] ToolManager tool", this.maptools[i].constructor.name, "onEvent, returned:", _ret, "togglegrp:", this.maptools[i].joinstogglegroup);
					}

					if (GlobalConst.getDebug("INTERACTIONOUT") && evt.type == "mouseout") {
						console.log("[DBG:INTERACTIONOUT] ToolManager, mouseout tool", this.maptools[i].constructor.name, "onEvent, returned:", _ret, "togglegrp:", this.maptools[i].joinstogglegroup);
					}	

					if (_ret && this.maptools[i].joinstogglegroup) {
						toggletool_already_interacted = true;
					}
				}
			}	
		}



	}

	addControlsMgr(p_key, p_mapctrlmgr) {
		this.mapcontrolmgrs[p_key] = p_mapctrlmgr;
		// this.mapcontrolmgrs[p_key].setToolmgr(this);
	}

}

