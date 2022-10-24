import {SpatialIndex} from './spatial_index.mjs';

export class FeatureCollection {

	constructor(p_mapctx) {
		this.mapctx = p_mapctx;
		this.featList = {};
		this.spIndex = new SpatialIndex();
	}

	setLayer(p_layerkey) {
		if (this.featList[p_layerkey] === undefined) {
			this.featList[p_layerkey] = {};
		}		
	}

	add(p_layerkey, p_id_fieldname, p_geom, p_attrs) {

		if (this.featList[p_layerkey] === undefined) {
			this.featList[p_layerkey] = {};
		}

		const id = p_attrs[p_id_fieldname];
		this.featList[p_layerkey][id] = {
			g: p_geom.slice(0),
			a: {...p_attrs}
		};

		return id;
	}

	remove(p_layerkey, p_id) {
		if (this.featList[p_layerkey] !== undefined) {
			if (this.featList[p_layerkey][p_id] !== undefined) {
				delete this.featList[p_layerkey][p_id];
			}
		}
	}

	emptyLayer(p_layerkey) {
		if (this.featList[p_layerkey] !== undefined) {
			for (let id in this.featList[p_layerkey]) {
				if (this.featList[p_layerkey].hasOwnProperty(id)) {
					delete this.featList[p_layerkey][id];
				}
			}
		}
	}

	emptyAll() {
		for (let layerkey in this.featList) {
			this.emptyLayer(layerkey);
		}
	}	

	invalidate() {
		this.emptyAll();
		this.spIndex.invalidate();
	}


}