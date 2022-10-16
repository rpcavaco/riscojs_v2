var RISCOJS_LAYERS_CFG = {
	"lorder": ["orto2021", "grat"],
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
		}		

	}

}
