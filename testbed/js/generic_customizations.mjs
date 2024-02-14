
import {I18n} from './riscojs_v2/i18n.mjs';
import {GrSymbol} from './riscojs_v2/canvas_symbols.mjs';
import {addEnv} from './riscojs_v2/geom.mjs';

function getCircularReplacer() {
	return function (key, value) {
	  if (key == "mapctx" || key == "i18n" || key == "msg_ctrlr") {
		return null;
	  } else if (typeof value === 'function') {
		return "[metodo]";
	  } else {
			return value;
	  }
	};
}


export class LocQuery {

	mapctx;
	url;
	crs;
	msgs_ctrlr;
	
	query_box;
	query_results;

	zoomto;
	npolfeats;
	centerlinefeats;
	symbs;
	found;
	loc_layer_key;
	#lastinput;

	otherqueriesmgr;
	current_npol_data;

	constructor(p_mapctx, p_msgs_ctrlr, p_cfg, p_crs, opt_loc_layer_key) {

		this.mapctx = p_mapctx;
		this.msgs_ctrlr = p_msgs_ctrlr;
		this.url = p_cfg["url"];
		this.zoomto = p_cfg["zoomto"];
		this.npolfeats = p_cfg["npolfeats"];
		this.centerlinefeats = p_cfg["centerlinefeats"];
		this.crs = p_crs;
		this.loc_layer_key = opt_loc_layer_key;
		this.current_npol_data = null;
		// this._querying = false;
		// this._query_timeout_id = null;

		this.symbs = {};

		let symb;
		for (let symbitem of ["npolfeats", "centerlinefeats"]) {
			symb = new GrSymbol();
			Object.assign(symb, p_cfg[symbitem]['symb']);
			this.symbs[symbitem] = symb;
		}

	}

	set lastinput(p_li) {
		this.#lastinput = p_li;
	}

	get lastinput() {
		return this.#lastinput;
	}

	setOtherQueriesMgr(p_otherqueriesmgr) {
		this.otherqueriesmgr = p_otherqueriesmgr;
	}

	cleanResultArea(p_keepshown) {
		if (!p_keepshown) {
			this.query_results.style.display = 'none';	
		} else {
			this.query_results.style.display = '';	
		}
		while (this.query_results.firstChild) {
			this.query_results.removeChild(this.query_results.firstChild);
		}
	}


	clear(p_full) {

		let lyr = null;
		if (this.loc_layer_key) {
			lyr = this.mapctx.tocmgr.getLayer(this.loc_layer_key);
		}
	
		if (p_full) {
			if (lyr != null) {
				lyr.clear();
				this.mapctx.maprefresh();
			}	
		}

		this.mapctx.renderingsmgr.clearAll(['temporary']);
		this.cleanResultArea();	
		this.query_box.value = '';	
		this.#lastinput = '';
	}

	addLine2Results(p_txtlns, p_types, opt_clickhandler) {

		let txtstrings = [];
		let types = [];
		if (Array.isArray(p_txtlns)) {
			txtstrings = [...p_txtlns];
			if (p_types) {
				types = [...p_types];
			}
		} else {
			txtstrings.push(p_txtlns.toLocaleString());
			if (p_types) {
				types.push(p_types.toLocaleString());
			}
		}

		let p, s, r, h = 0;

		if (txtstrings.length == 0) {

			return  h;

		} else if (txtstrings.length == 1) {

			p = this.query_results.appendChild(document.createElement('p'));
			p.innerText = txtstrings[0];

			if (types.length > 0 && types[0] != null) {
	
				switch (types[0]) {
	
					case "MSG":
						p.classList.add("queryret-message");
						break;
		
					case "CLASS":
						p.classList.add("queryret-classify");
						break;

					case "CLICK":
						p.classList.add("queryret-clickable");
						break;

					case "CLICKBOLD":
						p.classList.add("queryret-clickable");
						p.classList.add("bold");
						break;							
				}

				if (types[0].startsWith("CLICK")) {
					if (opt_clickhandler) {
						p.addEventListener("click", opt_clickhandler);
					}
				}
	
			}

			r = p.getBoundingClientRect();
			h = r.height;

		} else {

			for (let si=0; si<txtstrings.length; si++) {
			
				p = this.query_results.appendChild(document.createElement('p'));
				s = document.createElement('span')
				s.innerText = txtstrings[si];
				p.appendChild(s);
	
				if (types.length > 0) {
	
					switch (types[si]) {
		
						case "MSG":
							s.classList.add("queryret-message");
							break;
			
						case "CLASS":
							s.classList.add("queryret-classify");
							break;
			
					}
		
				}
		
			}

			r = p.getBoundingClientRect();
			h = r.height;
		}

		return h;	
	}

	/*
								"type": "npol",
								"str": responsejson['out']['str'],
								"loc": responsejson['out']['loc'],
								"toponym": responsejson['out']['toponym'],
								"cod_topo": responsejson['out']['cod_topo'],
								"np": responsejson['out']['npol']

	
	*/

	drawNPolPoint(p_cod_topo, p_npol, p_loc) {

		const that = this;

		this.current_npol = p_npol;

		this.current_npol_data = {
			"cod_topo": p_cod_topo,
			"npol": p_npol,
			"loc": [...p_loc]
		}

		if (this.loc_layer_key) {
			const lyr = this.mapctx.tocmgr.getLayer(that.loc_layer_key);
			lyr.setToPoint(this.current_npol_data.loc);
		}


		this.mapctx.setScaleCenteredAtPoint(this.zoomto, p_loc, true, () => {

			// Desenha features temporárias, de eixo de via e de linha de
			//  projeção do número de polícia

			const env = [];
			that.mapctx.getMapBounds(env);

			let filter_dict = {}, foundlist = [];
			filter_dict[that.centerlinefeats["fieldname_topo"]] = p_cod_topo;
			that.mapctx.featureCollection.find(that.centerlinefeats["layerkey"], 'EQ', filter_dict, foundlist);
			for (let foundid of foundlist) {
				that.mapctx.featureCollection.featuredraw(that.centerlinefeats["layerkey"], 
				foundid, {'normal': 'temporary', 'label': 'temporary' }, 
				{ "graphic": that.symbs["centerlinefeats"] }, null, env );
			}

			filter_dict = {}
			filter_dict[that.npolfeats["fieldname_topo"]] = that.current_npol_data.cod_topo;
			filter_dict[that.npolfeats["fieldname_npol"]] = that.current_npol_data.npol;
			that.mapctx.featureCollection.find(that.npolfeats["layerkey"], 'EQ', filter_dict, foundlist);

			for (let foundid of foundlist) {
				that.mapctx.featureCollection.featuredraw(that.npolfeats["layerkey"], 
				foundid, {'normal': 'temporary', 'label': 'temporary' }, 
				{ "graphic": that.symbs["npolfeats"] }, null, env );
			}

		});

	}

	drawCenterline(p_cod_topo, p_ext) {

		const that = this;
		this.mapctx.tocmgr.addAfterRefreshProcedure(() => {

			let filter_dict = {}, foundlist = [];
			filter_dict[that.centerlinefeats["fieldname_topo"]] = p_cod_topo;
			that.mapctx.featureCollection.find(that.centerlinefeats["layerkey"], 'EQ', filter_dict, foundlist);

			const env = [];
			that.mapctx.getMapBounds(env);

			//console.warn("feat id:", featid, "feat:", feat, "symb:", GlobalConst.FEATMOUSESEL_HIGHLIGHT[feat.gt])
			for (let foundid of foundlist) {
				that.mapctx.featureCollection.featuredraw(that.centerlinefeats["layerkey"], 
				foundid, {'normal': 'temporary', 'label': 'temporary' }, 
				{ "graphic": that.symbs["centerlinefeats"] }, null, env );
			}

		});

		this.mapctx.transformmgr.zoomToRect(...p_ext);		
	}


	fillResultInUI(p_results_json) {

		let featcount = 0, single_customqry_feat = null, layer=null, feats=null, zoomdict;
		let h = 0, usablestr;

		// console.log("fillResultInUI:", JSON.stringify(p_results_json));

		this.cleanResultArea(true);		

		const that = this;
		
		if (p_results_json["customqry"] !== undefined && p_results_json["customqry"]["status"] == "OK") {

			for (let lyrk in p_results_json["customqry"]["layers"]) {

				layer = p_results_json["customqry"]["layers"][lyrk];

				console.assert(layer['srid'] == this.crs, `sistemas coords incompatíveis, entre layer '${lyrk}' (${layer['srid']}) e o CRS esperado (${this.crs})`);

				feats = layer["features"];
				featcount += feats.length;
				if (featcount == 1) {
					single_customqry_feat = {"layerkey": lyrk, "feat": JSON.parse(JSON.stringify(feats[0]))};
				}
			}
		} 

		if (featcount > 0) {

			// Se houver apenas uma feature resultado da pesquisa especializada, fazer zoom + info à mesma
			if (featcount == 1) {
				
				console.assert(single_customqry_feat != null);
				zoomdict = {};
				zoomdict[single_customqry_feat.layerkey] = [single_customqry_feat.feat.oid];
				this.mapctx.zoomToFeatsAndOpenInfoOnLast(zoomdict, single_customqry_feat.feat.env, {'normal': 'temporary', 'label': 'temporary' });

				h += this.addLine2Results(I18n.capitalize(this.otherqueriesmgr.layers_labels[single_customqry_feat.layerkey]), "CLASS");
				h += this.addLine2Results(single_customqry_feat.feat.label, "CLICK", (e) => {
					that.query_box.value = single_customqry_feat.feat.label;
					that.cleanResultArea();
				});

			} else {
				for (let lyrk in p_results_json["customqry"]["layers"]) {

					h += this.addLine2Results(I18n.capitalize(this.otherqueriesmgr.layers_labels[lyrk]), "CLASS");

					layer = p_results_json["customqry"]["layers"][lyrk];
					for (const f of layer["features"]) {
						h += this.addLine2Results(f.label, "CLICKBOLD", (e) => {
							that.query_box.value = f.label;
							zoomdict = {};
							zoomdict[lyrk] = [f.oid];
							this.mapctx.zoomToFeatsAndOpenInfoOnLast(zoomdict, f.env, {'normal': 'temporary', 'label': 'temporary' });
							that.cleanResultArea();
						});		
					}
				}
			}

		} else if (p_results_json["address"] !== undefined && p_results_json["address"]["status"] === "OK") {

			if (["topo", "npol"].indexOf(p_results_json["address"]["data"]["type"]) >= 0) {

				this.query_results.style.display = '';

				switch(p_results_json["address"]["data"]["type"]) {

					case "topo":

						that.drawCenterline(p_results_json["address"]["data"]['cod_topo'], p_results_json["address"]["data"]['ext']);

						usablestr = p_results_json["address"]["data"]["toponym"];
						h += this.addLine2Results(p_results_json["address"]["data"]["toponym"], "CLICK", (e) => {
							that.query_box.value = usablestr;
							that.cleanResultArea();
						});

						break;
					
					case "npol":

						this.drawNPolPoint(p_results_json["address"]["data"]['cod_topo'], p_results_json["address"]["data"]['np'], p_results_json["address"]["data"]['loc']);

						usablestr = `${p_results_json["address"]["data"]["toponym"]}, ${p_results_json["address"]["data"]["np"]}`;
						h += this.addLine2Results(usablestr, "CLICK", (e) => {
							that.query_box.value = usablestr;
							that.cleanResultArea();
						});
						break;

				}

			} else if (p_results_json["address"]["data"]["type"] == "errornp") {

				// lista nao encontrado + numbers
				h += this.addLine2Results("Toponym found", "CLASS");
				h += this.addLine2Results(p_results_json["address"]["data"]["toponym"]);
				h += this.addLine2Results("Address numbers", "CLASS");
				h += this.addLine2Results(`'${p_results_json["address"]["data"]["np"]}': number not found.`, "MSG");
				h += this.addLine2Results("Some address numbers found:", "MSG");
				for (const np of p_results_json["address"]["data"]["numbers"]) {

					h += this.addLine2Results(np["npol"], "CLICKBOLD", (e) => {

						usablestr = `${p_results_json["address"]["data"]["toponym"]}, ${np["npol"]}`;

						that.query_box.value = usablestr;
						that.cleanResultArea();

						that.drawNPolPoint(p_results_json["address"]["data"]['cod_topo'], np["npol"], np["pt"]);
					});
				}
				h += this.addLine2Results("(clique sobre o número de polícia pretendido)", "MSG");

			} else if (p_results_json["address"]["data"]["type"] == "partial") {

				// resposta parcial, com lista de possíveis topónimos
				h += this.addLine2Results("Topónimo não encontrado", "MSG");
				h += this.addLine2Results(p_results_json["address"]["data"]["str"]);
				h += this.addLine2Results("Topónimos possíveis", "CLASS");
				for (const topn of p_results_json["address"]["data"]["toponyms"]) {

					h += this.addLine2Results(topn["toponimo"], "CLICKBOLD", (e) => {

						that.drawCenterline(topn["cod_topo"], topn["env"]);
						that.query_box.value = topn["toponimo"];
						that.cleanResultArea();

					});
				}
				h += this.addLine2Results("(choose a toponym)", "MSG");

			}

		} else {

			that.msgs_ctrlr.warn("no search results");
			
		}



		if (h == 0) {								
			this.cleanResultArea();	
		} else {
			this.query_results.style.height = h + "px";
		}		

	}

	// query entry point, executed after firing of input events in query box
	query(p_qrystr) {

		const that = this;
		const results = {};
		let oqtype = "empty";

		const identsre = new RegExp("^[\\d/\-_]+$", "g");

		//this.startedQuerying();

		if (this.otherqueriesmgr) {

			oqtype = this.otherqueriesmgr.test(p_qrystr);

			if (oqtype != "none") {

				this.otherqueriesmgr.customquery([ p_qrystr ], oqtype).then((p_responsejson) => {

					const customqresult = {};
					if (p_responsejson == null) {
						customqresult["status"] = "NULL_RESPONSE"; 
					} else if (Array.isArray(p_responsejson)) {
						if (p_responsejson.length == 1 && p_responsejson[0] == "SEM_RESULTADO") {
							customqresult["status"] = "EMPTY_RESPONSE"; 
						} else if (p_responsejson.length == 1 && p_responsejson[0] == "NUMCHARS_INSUFICIENTE") {
							customqresult["status"] = "EMPTY_QUERY"; 
						} else {
							const msg = JSON.stringify(p_responsejson);
							console.error("custom query:", msg);
							customqresult["status"] = "ERROR"; 
							customqresult["msg"] = msg; 
						}
					} else {

						if (p_responsejson != null && Object.keys(p_responsejson).length > 0) {

							let has_feats = false;
							for (let lyrk in p_responsejson) {
								if (p_responsejson[lyrk]["features"].length > 0) {
									has_feats = true;
									break;
								}
							}
				
							if (has_feats) {
								customqresult["status"] = "OK"; 
								customqresult["layers"] = JSON.parse(JSON.stringify(p_responsejson));	
							} else {
								customqresult["status"] = "EMPTY_RESPONSE";
							}
						}	
					}

					results["customqry"] = JSON.parse(JSON.stringify(customqresult));

					if (oqtype == "_mix" && !identsre.test(p_qrystr)) {

						this.addressQuery(p_qrystr).then((p_responsejson) => {

							if (["partial", "errornp", "topo", "npol", "full"].indexOf(p_responsejson["type"]) >= 0) {			
								results["address"]  = {
									"status":  "OK",
									"data": JSON.parse(JSON.stringify(p_responsejson))
								}
								
							} else {
								results["address"]  = {
									"status":  "ERROR",
									"message": `unknown 'type': ${p_responsejson['type']}`
								}
							}

							this.fillResultInUI(results);
			
						}).catch((e) => {

							if (typeof e == "string") {
								if (e == "SEM_RESULTADO") {
									results["address"]  = {
										"status":  "EMPTY_RESPONSE"
									}	
								} else {
									const msg = "adress search in error:" + e;
									console.error(e);
									that.msgs_ctrlr.warn(msg);		
								}
							} else if (e.name == "SyntaxError" && e.message.indexOf("JSON.parse") >= 0) {
								results["address"]  = {
									"status":  "ERROR",
									"message": e.message
								}
							}			


							this.fillResultInUI(results);
							
						});
			
					} else {

						this.fillResultInUI(results);
					}	
					
				}).catch((e) => {

					const msg = "Erro em tentativa de pesquisa: " + e.message;
					console.error(msg);
					that.msgs_ctrlr.warn(msg);
	
				});

			}
		
		} else {
			oqtype = "none";
		}

		if (oqtype == "none") {



			this.addressQuery(p_qrystr).then((p_responsejson) => {

				console.log(JSON.stringify(p_responsejson))

				if (["partial", "errornp", "topo", "npol"].indexOf(p_responsejson["type"]) >= 0) {			
					results["address"]  = {
						"status":  "OK",
						"data": JSON.parse(JSON.stringify(p_responsejson))
					}
					
				} else {
					results["address"]  = {
						"status":  "ERROR",
						"message": `'type' desconhecido: ${p_responsejson['type']}`
					}
				}

				this.fillResultInUI(results);

			}).catch((e) => {

				if (typeof e == "string") {
					if (e == "SEM_RESULTADO") {
						results["address"]  = {
							"status":  "EMPTY_RESPONSE"
						}	
					} else {
						const msg = "Erro em tentativa de pesquisa de endereço:" + e;
						console.error(e);
						that.msgs_ctrlr.warn(msg);		
					}
				} else if (e.name == "SyntaxError" && e.message.indexOf("JSON.parse") >= 0) {
					results["address"]  = {
						"status":  "ERROR",
						"message": e.message
					}
				}			


				this.fillResultInUI(results);
		
			});

		}


	}

	// query entry point, executed after firing of input events in query box
	addressQuery(p_qrystr) {

		return new Promise((resolve, reject) => {

			fetch(this.url, {
				method: "POST",
				body: JSON.stringify({ "curstr": p_qrystr, "outsrid": this.crs })
			})
			.then(
				response => response.json()
			)
			.then(
				function(responsejson) {

					if (Object.keys(responsejson).length == 0) {

						reject("SEM_RESULTADO");

					} else if (responsejson['status'] == 500) {

						reject(responsejson['statusText']);

					} else if (responsejson['error'] !== undefined) {

						reject(responsejson['error']);

					} else {

						if (responsejson['out']['tiporesp'] == 'partial') {

							if (responsejson['toponyms'] === undefined) {
								reject({ "error": "resposta parcial truncada" });
							} else {
								resolve({
									"type": "partial",
									"str": responsejson['out']['str'],
									"toponyms": JSON.parse(JSON.stringify(responsejson['toponyms']['list']))
								});
							}

						} else if (responsejson['out']['tiporesp'] == 'topo') { 

							if (responsejson['out']['errornp'] !== undefined) {

								resolve({
									"type": "errornp",
									"str": responsejson['out']['str'],
									"ext": responsejson['out']['ext'],
									"toponym": responsejson['out']['toponym'],
									"cod_topo": responsejson['out']['cod_topo'],
									"np": responsejson['out']['errornp'],
									"numbers": JSON.parse(JSON.stringify(responsejson['numbers']))
								});

							} else {

								resolve({
									"type": "topo",
									"str": responsejson['out']['str'],
									"ext": responsejson['out']['ext'],
									"toponym": responsejson['out']['toponym'],
									"cod_topo": responsejson['out']['cod_topo']
								});

							}

						} else if (responsejson['out']['tiporesp'] == 'npol' || responsejson['out']['tiporesp'] == 'full') {

							resolve({
								"type": "npol",
								"str": responsejson['out']['str'],
								"loc": responsejson['out']['loc'],
								"toponym": responsejson['out']['toponym'],
								"cod_topo": responsejson['out']['cod_topo'],
								"np": responsejson['out']['npol']
							});

						}

					}
				}
			).catch((error) => {
				reject(error);
			});			

		});
	}

	setCustomizationUI(p_customization_instance, p_mapctx, p_global_constants, p_basic_config) {

		let xoffset, logo=null, bcb = null,  qryb=null, qryboxheight = 22, canvas_dims=[];

		p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);

		if (p_customization_instance.instances["basiccontrolsbox"] !== undefined) {
			bcb = p_customization_instance.instances["basiccontrolsbox"];
		}	

		if (p_basic_config["logo"]["src"] !== undefined) {
			logo = document.createElement('img');
			logo.src = p_basic_config["logo"]["src"];
			logo.setAttribute("id", "logo-img");
			p_mapctx.panelwidget.appendChild(logo);
			logo.style.position = "absolute";
			logo.style.zIndex = p_mapctx.renderingsmgr.getMaxZIndex()+1;
			logo.style.width = p_basic_config["logo"]["width"];	
		}

		this.query_box = document.createElement('input');
		this.query_box.setAttribute("id", "loc-inputtext");

		let lbl = "(void placeholder, edit 'querybox'->'placeholder' and 'msgs' in risco_basic_config.js)";

		if (p_basic_config["querybox"]["placeholder"] !== undefined && p_basic_config["msgs"] !== undefined) {

			const lang = (new I18n(p_basic_config["msgs"])).getLang();

			// Querybox placeholder caption
			if (p_basic_config["querybox"]["placeholder"] != "none") {
				if (Object.keys(p_basic_config["msgs"][lang]).indexOf(p_basic_config["querybox"]["placeholder"]) >= 0) {
					lbl = I18n.capitalize(p_basic_config["msgs"][lang][p_basic_config["querybox"]["placeholder"]]);
				} else {
					lbl = I18n.capitalize(p_basic_config["querybox"]["placeholder"]);
				}	
			}
		}

		this.query_box.setAttribute("placeholder", lbl );

		p_mapctx.panelwidget.appendChild(this.query_box);

		this.query_box.setAttribute("type", "text");
		this.query_box.style.position = "absolute";
		this.query_box.style.zIndex = p_mapctx.renderingsmgr.getMaxZIndex()+1;
		if (navigator.userAgent.toLowerCase().includes("mobile") || navigator.userAgent.toLowerCase().includes("android")) {
			this.query_box.style.fontSize = "14pt";
		} else {
			this.query_box.style.fontSize = "12pt";
		}

		this.query_results = document.createElement('div');
		p_mapctx.panelwidget.appendChild(this.query_results);

		this.query_results.id = "loc-query_results";
		//this.query_results.setAttribute("type", "text");
		this.query_results.style.position = "absolute";
		this.query_results.style.zIndex = p_mapctx.renderingsmgr.getMaxZIndex()+1;
		this.query_results.style.backgroundColor = "white";
		this.query_results.style.padding = "2px";
		this.query_results.style.margin = "0";

		if (bcb) {

			if (logo) {
				logo.style.top = bcb.top - 2 + "px";
				logo.style.left = (2 * bcb.left + bcb.getWidth()) + "px";		

				xoffset = (2 * bcb.left + bcb.getWidth()) + 80 + 4;
			} else {
				xoffset = (2 * bcb.left + bcb.getWidth());
			}

			this.query_box.style.top = bcb.top + "px";
			this.query_box.style.left = xoffset + "px";	

			this.query_results.style.top = 6 + bcb.top + qryboxheight + "px";
			this.query_results.style.left = this.query_box.style.left;	
		} else {
			this.query_box.style.top = p_global_constants.CONTROLS_STYLES.OFFSET + "px";
			this.query_box.style.left = p_global_constants.CONTROLS_STYLES.OFFSET + "px";	

			this.query_results.style.top = p_global_constants.CONTROLS_STYLES.OFFSET + qryboxheight + "px";
			this.query_results.style.left = this.query_box.style.left + "px";	
		}

		const boxw = Math.min(canvas_dims[0]*0.65, p_basic_config["querybox"]["size"]);
		this.query_box.style.width = boxw + "px";	
		this.query_results.style.width = boxw + "px";	
		this.query_results.style.height = "6px";
		this.query_results.style.display = 'none';
		
		this.query_clrbtn = document.createElement('button');
		this.query_clrbtn.setAttribute("id", "loc-clrbtn");
		this.query_clrbtn.setAttribute("type", "button");
		p_mapctx.panelwidget.appendChild(this.query_clrbtn);

		this.query_clrbtn.innerText = p_mapctx.i18n.msg('CLR', true);
		this.query_clrbtn.style.position = "absolute";

		if (bcb) {
			if (((3 * bcb.left + bcb.getWidth()) + boxw + this.query_clrbtn.scrollWidth + 15) > canvas_dims[0]) {
				this.query_clrbtn.innerText = "C";	
				this.query_clrbtn.style.width = "40px";
			} else {
				this.query_clrbtn.style.width =  p_basic_config["querybox"]["clrbtn_size"] + "px";
			}
			this.query_clrbtn.style.top = bcb.top + "px";
			this.query_clrbtn.style.left = (xoffset + boxw + 12) + "px";	

		} else {
			this.query_clrbtn.style.top = p_global_constants.CONTROLS_STYLES.OFFSET + "px";
			this.query_clrbtn.style.left = p_global_constants.CONTROLS_STYLES.OFFSET + boxw + "px";	
			this.query_clrbtn.style.width =  (p_basic_config["querybox"]["clrbtn_size"] + 12) + "px";
		}

		this.query_clrbtn.style.zIndex = p_mapctx.renderingsmgr.getMaxZIndex()+1;
		if (navigator.userAgent.toLowerCase().includes("mobile") || navigator.userAgent.toLowerCase().includes("android")) {
			this.query_clrbtn.style.fontSize = "12pt";
		} else {
			this.query_clrbtn.style.fontSize = "10pt";
		}
		

		(function(p_btn, p_query_box, p_qryb_obj, pp_mapctx) {
			
			p_qryb_obj.lastinput = "";

			// Query clear button
			p_btn.addEventListener("click", function(e) { 

				// clear input box
				p_qryb_obj.clear(true);

				// clear up map UI
				pp_mapctx.clearInteractions('LOCCLRBTN', true);
				e.stopPropagation();
				
			}); 

			// Query box input event
			(function(pp_query_box, pp_qryb_obj) {
				const evttypes = ["input", "paste"];
				for (let i=0; i<evttypes.length; i++) {

					pp_query_box.addEventListener(evttypes[i], function(e) {
						let clntxt = pp_query_box.value.trim();
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
				pp_query_box.addEventListener('keypress', function(e) { 
					if (e.key == 13) {
						e.target.blur();
						pp_qryb_obj.lastinput = pp_query_box.value.trim();
						pp_qryb_obj.query(pp_qryb_obj.lastinput);
						pp_qryb_obj.cleanResultArea();	
					}
				}); 
			})(p_query_box, p_qryb_obj);	

		})(this.query_clrbtn, this.query_box, this, p_mapctx);	

	}				


	zoomToFoundFeats(p_jsonresponse) {

		const totalEnv = [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER];
		const lyrkIds = {};
		let featcount = 0;
			
		for (let lyrk in p_jsonresponse) {

			if (lyrkIds[lyrk] === undefined) {
				lyrkIds[lyrk] = [];
			}

			for (let resp_feat of p_jsonresponse[lyrk].features) {
				featcount++;
				lyrkIds[lyrk].push(resp_feat.oid);
				addEnv(totalEnv, resp_feat.env);
			}
		}

		if (featcount == 0) {
			throw new Error("no features corresponding to search results were found");
		}

		this.mapctx.zoomToFeatsAndOpenInfoOnLast(lyrkIds, totalEnv, {'normal': 'temporary', 'label': 'temporary' }, this.adic_callback);

	}	
}