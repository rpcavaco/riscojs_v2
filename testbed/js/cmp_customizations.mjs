
export class LocQuery {

	mapctx;
	url;
	crs;
	msgs_ctrlr;
	
	//querybox;
	// result_area;

	query_box;
	query_results;

	zoomto;
	npolfeats;
	centerlinefeats;
	found;
	#lastinput;

	constructor(p_mapctx, p_msgs_ctrlr, p_cfg, p_crs) {
		this.mapctx = p_mapctx;
		this.msgs_ctrlr = p_msgs_ctrlr;
		this.url = p_cfg["url"];
		this.zoomto = p_cfg["zoomto"];
		this.npolfeats = p_cfg["npolfeats"];
		this.centerlinefeats = p_cfg["centerlinefeats"];
		this.crs = p_crs;
		this.found = null;
	}

	set lastinput(p_li) {
		this.#lastinput = p_li;
	}

	get lastinput() {
		return this.#lastinput;
	}

	cleanResultArea() {
		this.query_results.style.display = 'none';	
		while (this.query_results.firstChild) {
			this.query_results.removeChild(this.query_results.firstChild);
		}
	}



	clear(p_full) {

		// console.trace("-- LocQuery clear --, full:", p_full);

		if (p_full) {
			this.found = null;
		}
		this.cleanResultArea();	
		this.query_box.value = '';	
		this.#lastinput = '';
	}

	setTopo(p_cod_topo, p_toponimo) {

		let ret = false;

		if (this.found == null || this.found["codigo_topo"] != p_cod_topo) {
			this.found = {
				"codigo_topo": p_cod_topo,
				"toponimo": p_toponimo
			}
			ret = true;
		}

		return ret;
	}

	setNpol(p_npol, p_cod_topo, p_toponimo) {

		let ret = false;

		if (this.found == null || this.found["codigo_topo"] != p_cod_topo) {
			this.found = {
				"codigo_topo": p_cod_topo,
				"toponimo": p_toponimo,
				"npol": p_npol
			}
			ret = true;
		} else {
			if (this.found["npol"] === undefined || this.found["npol"] != p_npol) {
				this.found["npol"] = p_npol;
				ret = true;
			}
		}

		return ret;
	}

	query(b_qrystr) {

		const msgs_ctrlr  = this.msgs_ctrlr;
		const that = this;

		fetch(this.url, {
			method: "POST",
			body: JSON.stringify({ "curstr": b_qrystr, "outsrid": this.crs })
		})
		.then(response => response.json())
		.then(
			function(responsejson) {

				let p, r, hei, filter_dict, foundlist = [];

				if (responsejson['error'] !== undefined) {
					msgs_ctrlr.warn(responsejson['error']);
				} else {
					if (responsejson['out']['tiporesp'] == 'partial') {

						that.found = null;

						if (that.query_results == null) {
							return;
						}

						that.cleanResultArea();					
						if (responsejson['toponyms'] === undefined) {
							return;
						}

						hei = 0;
						that.query_results.style.display = '';		
						for(const top of responsejson['toponyms']['list']) {
							p = that.query_results.appendChild(document.createElement('p'));
							((p_elem, p_this, p_cod_topo, p_toponimo, p_env) => {
								p_elem.innerText = p_toponimo;
								p_elem.classList.add("hoverme");
								p_elem.addEventListener(
									'click', (e) => { 
										p_this.setTopo(p_cod_topo, p_toponimo);
										p_this.query_box.value = p_toponimo;
										p_this.query_results.style.display = 'none';

										that.mapctx.tocmgr.addAfterRefreshProcedure(() => {

											filter_dict = {}
											filter_dict[that.centerlinefeats["fieldname_topo"]] = p_cod_topo;
											that.mapctx.featureCollection.find(that.centerlinefeats["layerkey"], 'EQ', filter_dict, foundlist);
											for (let foundid of foundlist) {
												that.mapctx.featureCollection.draw(that.mapctx, that.centerlinefeats["layerkey"], 
												foundid, {'normal': 'temporary', 'labels': 'temporary' }, 
												{ "path": that.centerlinefeats["symb"] } );
											}
			
										});
										that.mapctx.transformmgr.zoomToRect(p_env[0], p_env[1], p_env[2], p_env[3]);										
									}
								);	
							})(p, that, top['cod_topo'], top['toponimo'], top['env']);
							r = p.getBoundingClientRect();
							hei += r.height;
						}
						if (hei == 0) {								
							that.cleanResultArea();	
						} else {
							that.query_results.style.height = hei + "px";
						}

					} else if (responsejson['out']['tiporesp'] == 'topo') { 

						if (that.setTopo(responsejson['out']['cod_topo'], responsejson['out']['toponym'])) {
							that.query_box.value = responsejson['out']['toponym'];

							that.mapctx.tocmgr.addAfterRefreshProcedure(() => {

								filter_dict = {}
								filter_dict[that.centerlinefeats["fieldname_topo"]] = responsejson['out']['cod_topo'];
								that.mapctx.featureCollection.find(that.centerlinefeats["layerkey"], 'EQ', filter_dict, foundlist);
								//console.warn("feat id:", featid, "feat:", feat, "symb:", GlobalConst.FEATMOUSESEL_HIGHLIGHT[feat.gt])
								for (let foundid of foundlist) {
									that.mapctx.featureCollection.draw(that.mapctx, that.centerlinefeats["layerkey"], 
									foundid, {'normal': 'temporary', 'labels': 'temporary' }, 
									{ "path": that.centerlinefeats["symb"] } );
								}

							});

							that.mapctx.transformmgr.zoomToRect(responsejson['out']['ext'][0], responsejson['out']['ext'][1], responsejson['out']['ext'][2], responsejson['out']['ext'][3]);
						}

						that.cleanResultArea();
						
						if (responsejson['out']['errornp'] !== undefined) {

							if (that.query_results == null) {
								return;
							}
								
							that.query_results.style.display = '';		
							for (let ln of [
								`Número '${responsejson['out']['errornp']}': não encontrado.`
							]) {
								p = that.query_results.appendChild(document.createElement('p'));
								p.innerText = ln;
								p.style.fontWeight = "bold";
								r = p.getBoundingClientRect();
								hei = r.height;	
							}

							if (responsejson['numbers'] !== undefined) {

								for (let ln of [
									"Alguns números de polícia existentes:"
								]) {
									p = that.query_results.appendChild(document.createElement('p'));
									p.innerText = ln;
									p.style.fontWeight = "bold";
									r = p.getBoundingClientRect();
									hei += r.height;	
								}

								for(const np of responsejson['numbers']) {
									p = that.query_results.appendChild(document.createElement('p'));
									((p_elem, p_this, p_npol, p_cod_topo, p_toponimo, p_pt) => {
										p_elem.innerText = ` ${p_toponimo} ${p_npol}`;
										p_elem.classList.add("hoverme");
										p_elem.addEventListener(
											'click', (e) => { 
												p_this.setNpol(p_npol, p_cod_topo, p_toponimo);
												p_this.query_box.value = `${p_toponimo} ${p_npol}`;
												p_this.query_results.style.display = 'none';
												that.mapctx.transformmgr.setScaleCenteredAtPoint(that.zoomto, [p_pt[0], p_pt[1]], true);
											}
										);	
									})(p, that, np['npol'], responsejson['out']['cod_topo'], responsejson['out']['toponym'], np['pt']);
									r = p.getBoundingClientRect();
									hei += r.height;
								}
							}

							that.query_results.style.height = hei + "px";
						}
					} else if (responsejson['out']['tiporesp'] == 'npol') {

						if (that.setNpol(responsejson['out']['npol'], responsejson['out']['cod_topo'], responsejson['out']['toponym'])) {
							that.query_box.value = `${responsejson['out']['toponym']} ${responsejson['out']['npol']}`;

							that.mapctx.tocmgr.addAfterRefreshProcedure(() => {

								filter_dict = {}
								filter_dict[that.centerlinefeats["fieldname_topo"]] = responsejson['out']['cod_topo'];
								that.mapctx.featureCollection.find(that.centerlinefeats["layerkey"], 'EQ', filter_dict, foundlist);
								//console.warn("feat id:", featid, "feat:", feat, "symb:", GlobalConst.FEATMOUSESEL_HIGHLIGHT[feat.gt])
								for (let foundid of foundlist) {
									that.mapctx.featureCollection.draw(that.mapctx, that.centerlinefeats["layerkey"], 
									foundid, {'normal': 'temporary', 'labels': 'temporary' }, 
									{ "path": that.centerlinefeats["symb"] } );
								}

								filter_dict = {}
								filter_dict[that.npolfeats["fieldname_topo"]] = responsejson['out']['cod_topo'];
								filter_dict[that.npolfeats["fieldname_npol"]] = responsejson['out']['npol'];
								that.mapctx.featureCollection.find(that.npolfeats["layerkey"], 'EQ', filter_dict, foundlist);
								//console.warn("feat id:", featid, "feat:", feat, "symb:", GlobalConst.FEATMOUSESEL_HIGHLIGHT[feat.gt])
								for (let foundid of foundlist) {
									that.mapctx.featureCollection.draw(that.mapctx, that.npolfeats["layerkey"], 
									foundid, {'normal': 'temporary', 'labels': 'temporary' }, 
									{ "path": that.npolfeats["symb"] } );
								}

							});

							that.mapctx.transformmgr.setScaleCenteredAtPoint(that.zoomto, [responsejson['out']['loc'][0], responsejson['out']['loc'][1]], true);
						}
						that.cleanResultArea();
					}
				}

				if (false) { // debugging
					console.log("[DBG:TEXTQUERY] ------------------------");
					console.log(responsejson);
				}

			}
		).catch((error) => {
			console.error("Erro em tentativa de acesso ao serviço Localizador " + error);
		});			

	}

	setCustomizationUI(p_customization_instance, p_mapctx, p_global_constants, p_basic_config) {

		let r, bcb = null,  qryb=null, qryboxheight = 22;

		if (p_customization_instance.instances["basiccontrolsbox"] !== undefined) {
			bcb = p_customization_instance.instances["basiccontrolsbox"];
		}	

		this.query_box = document.createElement('input');
		this.query_box.setAttribute("type", "text");
		this.query_box.style.position = "absolute";
		this.query_box.style.zIndex = p_mapctx.renderingsmgr.getMaxZIndex()+1;

		this.query_results = document.createElement('div');
		this.query_results.id = "query_results";
		//this.query_results.setAttribute("type", "text");
		this.query_results.style.position = "absolute";
		this.query_results.style.zIndex = p_mapctx.renderingsmgr.getMaxZIndex()+1;
		this.query_results.style.backgroundColor = "white";
		this.query_results.style.padding = "2px";
		this.query_results.style.margin = "0";

		if (bcb) {
			this.query_box.style.top = bcb.top + "px";
			this.query_box.style.left = (2 * bcb.left + bcb.getWidth()) + "px";	

			this.query_results.style.top = bcb.top + qryboxheight + "px";
			this.query_results.style.left = this.query_box.style.left;	
		} else {
			this.query_box.style.top = p_global_constants.CONTROLS_STYLES.OFFSET + "px";
			this.query_box.style.left = p_global_constants.CONTROLS_STYLES.OFFSET + "px";	

			this.query_results.style.top = p_global_constants.CONTROLS_STYLES.OFFSET + qryboxheight + "px";
			this.query_results.style.left = this.query_box.style.left + "px";	
		}

		this.query_box.style.width = p_basic_config["querybox"]["size"] + "px";	
		this.query_results.style.width = p_basic_config["querybox"]["size"] + "px";	
		this.query_results.style.height = "6px";
		this.query_results.style.display = 'none';
		
		p_mapctx.panelwidget.appendChild(this.query_box);
		p_mapctx.panelwidget.appendChild(this.query_results);

		this.query_clrbtn = document.createElement('button');

		this.query_clrbtn.innerText = p_mapctx.i18n.msg('clr', true);
		this.query_clrbtn.style.position = "absolute";

		if (bcb) {
			this.query_clrbtn.style.top = bcb.top + "px";
			this.query_clrbtn.style.left = (3 * bcb.left + bcb.getWidth()) + p_basic_config["querybox"]["size"] + "px";	
		} else {
			this.query_clrbtn.style.top = p_global_constants.CONTROLS_STYLES.OFFSET + "px";
			this.query_clrbtn.style.left = p_global_constants.CONTROLS_STYLES.OFFSET + p_basic_config["querybox"]["size"] + "px";	
		}

		this.query_clrbtn.style.width =  p_basic_config["querybox"]["clrbtn_size"] + "px";
		this.query_clrbtn.style.zIndex = p_mapctx.renderingsmgr.getMaxZIndex()+1;
		
		p_mapctx.panelwidget.appendChild(this.query_clrbtn);

		(function(p_btn, p_query_box, p_qryb_obj) {
			
			p_qryb_obj.lastinput = "";

			// Query clear button
			p_btn.addEventListener("click", function(e) { 
				p_qryb_obj.clear(true);
			}); 

			// Query box input event
			(function(pp_query_box) {
				const evttypes = ["input", "paste"];
				for (let i=0; i<evttypes.length; i++) {
					pp_query_box.addEventListener(evttypes[i], function(e) { 
						let clntxt = pp_query_box.value.trim();
						//console.log("::284:: qryb EVENT", e.type, clntxt, pp_query_box.value, "len", clntxt.length, "!=", p_qryb_obj.lastinput.length);
						if (clntxt.length > 2) {
							if (clntxt != p_qryb_obj.lastinput) {
								p_qryb_obj.lastinput = clntxt;
								p_qryb_obj.query(p_qryb_obj.lastinput);
							}
						} else if (clntxt.length == 0) {
							if (p_qryb_obj.lastinput.length > 0) {
								p_qryb_obj.clear(true);
							}
						}
					}); 
				}
			})(p_query_box);	

		})(this.query_clrbtn, this.query_box, this);	

	}				

}