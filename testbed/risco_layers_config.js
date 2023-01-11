var RISCOJS_LAYERS_CFG = {
	"lorder": ["ortos_2018", "mancha_construida", "EV", "procs_fisca", "NPOLPROJ", "grat_crosses"], //, "mancha_constr", "mancha_construida", "gratMRK"],
	/*"relations": [
		{
			"from": "grat_sqrs",
			"to": "mancha_construida",
			"op": "bbtouch"
		}
	], */
	"layers": {
		"grat": {
			"type": "graticule",
			"strokeStyle": "white",
			"lineWidth": 1
		},
		"grat_crosses": {
			"type": "ptgrid",
			"marker": "vertcross",
			"markersize": 2,
			"strokeStyle": "white",
			"lineWidth": 2
		},	
		"orto2021": {
			"type": "wms",
			"reuseurl": true, 
			"url": "https://sigcrsprxy.cm-porto.pt/dgtwms/ortos2021",
			"layernames": "Ortos2021-RGB",
			"envsplit": true,
			"filter": "grayscale"
		},
		"ortos_2018": {
			"type": "wms",
			"url": "http://geo.cm-porto.net/wms/ortos_2018_dgt",
			"layernames": "ortos2018",
			"envsplit": false
			//"filter": "grayscale"			
		},

		"enq_bw_porto": {
			"type": "ags_map",
			"url": "https://servergeo.cm-porto.pt/arcgis/rest/services/BASE/ENQUADRAMENTO_BW_ComFregsPTM06/MapServer",
			"layers": "11,16,17",
			"scaledepLayers": {
				5000: "9,11,16,17"
			},
			"envsplit": false
			//"filter": "grayscale"
		},
		
		"mancha_constr": {
			"type": "ags_qry",
			"geomtype": "poly",
			"url": "http://servergeo.cm-porto.pt/arcgis/rest/services/BASE/ENQUADRAMENTO_BW_ComFregsPTM06/MapServer",
			"layerid": "9",
			"envsplit": false,
			"fillStyle": "#FF00007F",
			"strokeStyle": "rgba(0.7,0.7,0.7)",
			"lineWidth": 1,

			"labelfield": "objectid",
			"labelplacement": "centroid",
			"labelFontSizePX": 18,
			"labelFontFace": "CourierNew",
			"labelRotation": 45,

			"labelLeaderLength": 100,
			"labelLeaderStroke": "green",
			"labelLeaderLinewidth": 2,
			"labelLeaderRotation": -80					
			//"filter": "grayscale"
		},	

		"EV": {
			"type": "riscofeats",
			"geomtype": "line",
			"label": "Eixos de via",
			"mouseinteraction": false,
			"url": "http://geo.cm-porto.net/riscosrv_v2",
			"lineDash": [8,2], 
			"lineWidth": 1,
			"strokeStyle": "#c0c0c0",

			"labelfield": "toponimo",
			"labelplacement": "along",
			"labelFontSizePX": 18,
			"labelFontFace": "OpenSans-CondensedRegular",

			"envsplit": false,
			"fillStyle": "none",
		},

		"mancha_construida": {

			"type": "riscofeats",
			"geomtype": "poly",
			"label": "Mancha construída",
			"url": "http://geo.cm-porto.net/riscosrv_v2",
			"envsplit": false,
			"fillStyle": "#0000FF7F",
			"strokeStyle": "rgba(0.7,0.7,0.7)",
			"lineWidth": 1
			

			/*"labelfield": "objectid",
			"labelplacement": "centroid",
			"labelFontSizePX": 18,
			"labelFontFace": "Tahoma",
			"labelRotation": -18,
			"labelTextAlign": "left",

			"labelLeaderLength": 100,
			"labelLeaderStroke": "green",
			"labelLeaderLinewidth": 2,
			"labelLeaderRotation": -60		*/		
			
		},

		"pec_naolot": {
			"type": "riscofeats",
			"geomtype": "poly",
			"url": "http://geo.cm-porto.net/riscosrv_v2bdt",
			"mouseinteraction": true,
			"envsplit": false,
			"strokeStyle": "#ff5e32ff",
			"lineWidth": 1,
			"fillStyle": "rgba(204, 204, 204, 0.5)"
		},		

		"NPOLPROJ": {
			"type": "riscofeats",
			"geomtype": "line",
			"url": "http://geo.cm-porto.net/riscosrv_v2",
			"mouseinteraction": false,
			"strokeStyle": "none",
			//"lineWidth": 1,
			"maxscale": 1000,

			"labelfield": "n_policia",
			"labelplacement": "extend",
			"labelextend": "0.2:10:arrow",
			"labelFontSizePX": 12,
			"labelFontFace": "OpenSans-CondensedRegular",
			"labelTextAlign": "left",			
		},
		
		"procs_fisca": {

			"label": "Processos fiscalização",
			"type": "riscofeats",
			"geomtype": "point",
			"url": "http://geo.cm-porto.net/riscosrv_v2",
			"mouseinteraction": true,
			"marker": "circle",
			"markersize": 2,
			"strokeStyle": "#b1dbdb",
			"fillStyle": "rgba(204, 204, 204, 0.5)",
			"lineWidth": 2,
			"maxscale": 10000,
			"varstyles": [
				{
					"func": (scl, attrs) => { return attrs.cnt == 1; },
					"key": "um_processo",
					"fillStyle": RISCOJS_COLORRAMPS.RAMPS4X4.green_blue.b,
				},
				{
					"func": (scl, attrs) => { return attrs.cnt >= 2 && attrs.cnt <= 4; },
					"key": "dois_a_quatro_procs",
					"fillStyle": RISCOJS_COLORRAMPS.RAMPS4X4.green_blue.c,
				},
				{
					"func": (scl, attrs) => { return attrs.cnt >= 5 && attrs.cnt <= 10; },
					"key": "cinco_a_dez_procs",
					"fillStyle": RISCOJS_COLORRAMPS.RAMPS4X4.green_blue.b,
				},
				{
					"func": (scl, attrs) => { return attrs.cnt > 10; },
					"key": "mais_dez_procs",
					"fillStyle": RISCOJS_COLORRAMPS.RAMPS4X4.mag_ora.a,
				}												
			],
			"msgsdict": {
				"deflang": "pt",
				"pt": {
					"cnt": "núm.processos",
					"assuntos": "assunto(s)",
					"uos": "unidade(s) orgânica(s)",
					"title": "designação",
					"created": "data de criação",
					"subjectpartrecord_title": "assunto",
					"oumanagerpartrecord_title": "UO gestora",
					"classificationpartrecord_title": "classificação",
					"created": "data de criação",
					"closed": "data de fecho",
					"description": "descrição",
					"detalheassunto": "detalhe assunto",
					"entidadenome": "entidade",
					"entitysubtype_title": "tipo entidade",
					"toponimia": "toponímia",
					"toponimialocal": "local",
					"toponimianrpolicia": "núm.polícia",
					"numbered": "NUP"
				}
			},
			"maptipfields": {
				"add": [
					"cnt",
					"assuntos",
					"uos"
				]
			},
			"infocfg": {
				"keyfield": "id",
				"keyisstring": true,
				"jsonkey": "procs_fisca_aggregs", 
				"fields": {
					"order": [
						"oumanagerpartrecord_title", "subjectpartrecord_title", "classificationpartrecord_title", "numbered", 
						"title", "created", "estado", "description", "detalheassunto", "entidadenome",
						"entitysubtype_title", "toponimia", "toponimialocal", "toponimianrpolicia"
					],
					"remove": [
						"id",
						"arquivado",
						"aggregationstatus",
					],
					"formats": {
						"aa": "bal"
					},
					"transforms": [
						{
							"outfield": "estado",
							"func": function(p_rec) {
								let ret = "";
								if (p_rec.arquivado) {
									ret = "arquivado";
								} else if (p_rec.aggregationstatus == "OPEN") {
									ret = "aberto";
								} else if (p_rec.aggregationstatus == "FECHADO") {
									ret = "fechado";
								}
								return ret;
							}}
					]
				},
				"aggfields": [
					"oumanagerpartrecord_title"
				]
			}



		},			

		

	}

}
