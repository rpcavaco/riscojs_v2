var RISCOJS_LAYERS_CFG = {
	"lorder": ["ortos_2018", "mancha_constr", "grat"],
	"layers": {
		"grat": {
			"type": "graticule",
			"separation": 100,
			"strokeStyle": "black",
			"lineWidth": 1
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
			"envsplit": false
			//"filter": "grayscale"
		}		
		
		

	}

}
