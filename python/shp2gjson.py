import numpy as np
import fiona
import collections
import os

# shapefile is source .shp file/dir (pass without the .shp)
# recFiltFunc is a function to call on each element/record in shapefile to filter out unwanted elements
# boundingBox is the bounding box of shape elements to keep - at least one point in shape must be inside boundingBox
# dataProp is the property in the shapefile that we care about? (like 'ZCTA5CE10')
# newDataProp is what we'll rename dataProp in the output (like 'ZCTA5CE10'->'zip')
def translate_shapefile(shapeFile, recFiltFunc, boundingBox, dataProp, newDataProp):
    if os.path.isfile(shapeFile+'.json'):
        os.remove(shapeFile+'.json')

    recList = {}
    idCnt = 0
    with fiona.open(shapeFile+'.shp', 'r') as src:
        meta = src.meta
        meta['schema']['properties'] = collections.OrderedDict([(newDataProp, 'str:5'), ('id', 'int')])
        meta['driver'] = 'GeoJSON'
        with fiona.open(shapeFile+'.json', 'w', **meta) as sink:
            for rec in filter(recFiltFunc, src):
                # not polygon means the multi-level/nested polygon thing. This removes those complicated compound shapes
                if rec['geometry']['type'] != 'Polygon':
                    rec['geometry']['type'] = 'Polygon'
                    newCoords = []

                    # simplify multipolygon to polygon:
                    # if polygon has negative space, the first element is the outer bound, skip other/interior pieces
                    # if polygon consists of multiple, separate pieces (like islands) we include all of those
                    for idx in range(len(rec['geometry']['coordinates'])):
                        newCoords.append(rec['geometry']['coordinates'][idx][0])

                    # store the simplified polygon
                    rec['geometry']['coordinates'] = newCoords

                # if any point in polygon lies in bBox, add the poylgon to the output
                if polygon_intersects_box(rec['geometry'], boundingBox):
                    rec['properties'] = collections.OrderedDict([(newDataProp, rec['properties'][dataProp]), ('id', idCnt)])
                    recList[(rec['properties'][newDataProp])] = idCnt
                    sink.write(rec)
                    idCnt += 1

    return recList


# true if any point of geomElem's polygon is inside the bounding box (intersect, not necessarily fully within/contained)
def polygon_intersects_box(geomElem, boundingBox):
    # if no box, don't filter
    if boundingBox is None:
        return True

    for geomPolygon in geomElem['coordinates']:
        polygonCoords = np.array(geomPolygon)
        if any( map(lambda x: (boundingBox[0][0] < x[0] < boundingBox[1][0] and x[1] < boundingBox[1][1] < boundingBox[0][1]), polygonCoords) ):
            return True

    return False


if __name__ == "__main__":
    bBox = [[-90, 42.5], [-89, 43.5]]
    bBox = None
    shapeFile = "../data/shapefiles-wi_counties/cb_2015_us_zcta510_500k"
    recList = translate_shapefile(shapeFile, lambda x: True , bBox, 'ZCTA5CE10', 'zip')
