var RISCOJS_LAYERS_CFG = {
	"lorder": ["ortos_2018", "mancha_construida", "EV", "pec_naolot", "grat_crosses"], //, "mancha_constr", "mancha_construida", "gratMRK"],
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
			"marker": "circle",
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
			"url": "https://servergeo.cm-porto.pt/arcgis/rest/services/BASE/ENQUADRAMENTO_BW_ComFregsPTM06/MapServer",
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
			"mouseinteraction": true,
			"url": "https://geo.cm-porto.net/riscosrv_v2",

			"labelfield": "toponimo",
			"labelplacement": "along",
			"labelFontSizePX": 18,
			"labelFontFace": "Calibri",

			"envsplit": false,
			"fillStyle": "none",
			"strokeStyle": "white",
			"lineWidth": 2				
		},

		"mancha_construida": {

			"type": "riscofeats",
			"geomtype": "poly",
			"label": "Mancha construída",
			"url": "https://geo.cm-porto.net/riscosrv_v2",
			"envsplit": false,
			"fillStyle": "#0000FF7F",
			"strokeStyle": "rgba(0.7,0.7,0.7)",
			"lineWidth": 1,
			

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
			"url": "https://geo.cm-porto.net/riscosrv_v2bdt",
			"mouseinteraction": true,
			"envsplit": false,
			"strokeStyle": "#ff5e32ff",
			"lineWidth": 1,
			"fillStyle": "rgba(204, 204, 204, 0.5)"
		}		

		
		
		

	}

}
