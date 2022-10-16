var RISCOJS_LAYERS_CFG = {
	"lorder": ["orto2021",  "enq_bw_porto", "grat"],
	"layers": {
		"grat": {
			"type": "graticule",
			"separation": 100,
			"strokeStyle": "white",
			"lineWidth": 1
		},
		"orto2021": {
			"type": "wms",
			"reuseurl": true, 
			"url": "http://localhost:9200/wms/ortos2021",
			"layernames": "Ortos2021-RGB"
			//"filter": "grayscale"
		},
		"enq_bw_porto": {
			"type": "ags_map",
			"url": "https://servergeo.cm-porto.pt/arcgis/rest/services/BASE/ENQUADRAMENTO_BW_ComFregsPTM06/MapServer",
			"layers": "show:9,11,16,17"
			//"filter": "grayscale"
		},		
		
		

	}

}
