import numpy as np
import fiona
import os
import pandas as pd

"""
output format is geoJSON, like:
{
"type":"FeatureList",
"crs": <stuff about map coordinate system>
"features": 
    [#list of zip code boundaries and info#
        {#one zip object#
            "type": "Feature",
            "properties":
                {
                    "zip": "<zip_code>",  #as a string
                    "id":<unique_id_from_idCnt>  #as an int  #errr, scratch that I removed this
                },
            "geometry":
                {
                    "type":"Polygon",
                    "coordinates":
                        [#total shape#
                            [#one closed polygon (zip code can have multiple separate chunks, like a mainland and islands)
                                [longitude,latitude] #the boundary points on the map with unjustifiable precision (in this order)
                            ]
                        ]
                }
        }
        {#another zip...#}
    ]
}

#funfacts: ZCTA = Zip Code Tabulation Areas. CE10 = Census Estimate(?) from 2010

"""


# shapefile is source .shp file/dir (pass without the .shp)
# recFiltFunc is a function to call on each element/record in shapefile to filter out unwanted elements (you might be able to filter by zip codes in some set/dict here but I forget)
# boundingBox is the bounding box of shape elements to keep - at least one point in shape must be inside boundingBox. Pass None (default) to avoid this
# dataProp is the property in the shapefile that we care about? (like 'ZCTA5CE10' = 'GEOID10' = [zipcode])
# newDataProp is what we'll rename dataProp in the output (like 'ZCTA5CE10'->'zip')
def translate_shapefile_bounding_box(shapeFile, recFiltFunc=None, propMap={}, boundingBox=None):
    # clear the existing target file (this is necessary because fiona/gdal is dumb, doesn't support overwriting)
    sinkFile = shapeFile+'.json'
    if os.path.isfile(sinkFile):
        os.remove(sinkFile)

    recList = []
    idCnt = 0
    with fiona.open(shapeFile+'.shp', 'r') as src:
        meta = src.meta
        #schemaDict = {'id': 'int'}
        schemaDict = {}  # defines the format/datatype of properties element in output
        for key,val in propMap.items():
            schemaDict[val] = 'str'
        meta['schema']['properties'] = schemaDict
        meta['driver'] = 'GeoJSON'
        with fiona.open(sinkFile, 'w', **meta) as sink:
            for rec in filter(recFiltFunc, src):
                if idCnt > 1000:
                    break

                # I don't like displaying all the quirks of zip boundaries (and may be more costly to render), but this block isn't necessary
                # not polygon means the multi-level/nested polygon thing. This removes those complicated compound shapes
                if rec['geometry']['type'] != 'Polygon':
                    # simplify multipolygon to polygon:
                    # if polygon has negative space, the first element is the outer bound, skip other/interior pieces
                    # if polygon consists of multiple, separate pieces (like islands) we include all of those
                    newCoords = [coordSet[0] for coordSet in rec['geometry']['coordinates']]
                    rec['geometry']['coordinates'] = newCoords
                    rec['geometry']['type'] = 'Polygon'

                # if any point in polygon lies in bBox, add the poylgon to the output
                if polygon_intersects_box(rec['geometry'], boundingBox):
                    #newProps = {'id': idCnt}
                    newProps = {}
                    for key,val in propMap.items():
                        newProps[val] = rec['properties'][key]
                    rec['properties'] = newProps
                    recList.append(newProps)
                    sink.write(rec)
                    idCnt += 1

    return recList


# true if any point of geomElem's polygon is inside the bounding box (intersect, not necessarily fully within/contained)
def polygon_intersects_box(geomElem, bBox):
    # if no box, don't filter
    if bBox is None:
        return True

    for geomPolygon in geomElem['coordinates']:
        polygonCoords = np.array(geomPolygon)
        if any( map(lambda x: (bBox[0][0] < x[0] < bBox[1][0] and x[1] < bBox[1][1] < bBox[0][1]), polygonCoords) ):
            return True

    return False


# get a dataframe relating zip codes to their corresponding states. download info from the census bureau
# this gives just raw DF with zipCol/stateCol, 5-char zip/2-char state. includes like puerto rico and stuff
# some zip codes map to multiple states
def get_state_zip_df():
    saveFile = '../data/shapefiles-us_zips/zip_state_map.csv'
    # try to read read pre-downloaded and massaged file (if run/'cached' before), else download and save
    # feels sloppy to try/except... oh well
    try:
        stateZipDf = pd.read_csv(saveFile, dtype=str)
    except FileNotFoundError:
        zipCol = 'ZCTA5'
        stateCol = 'STUSAB'
        stateIdCol = 'STATE'
        readType = {zipCol: str, stateCol: str}

        zipSourceURL = 'https://www2.census.gov/geo/docs/maps-data/data/rel/zcta_place_rel_10.txt'
        zipInfoDf = pd.read_csv(zipSourceURL, usecols=[zipCol, stateIdCol], dtype=readType)
        zipInfoDf.drop_duplicates(inplace=True)  # not sure what this data means, but there are several rows per zip

        stateSourceURL = 'https://www2.census.gov/geo/docs/reference/state.txt'
        stateInfoDf = pd.read_csv(stateSourceURL, sep='|')

        # pandas JOIN on state(FIPS ID)
        stateZipDf = pd.merge(zipInfoDf, stateInfoDf, left_on=stateIdCol, right_on=stateIdCol)
        stateZipDf = stateZipDf[[zipCol, stateCol]]
        # convert zip from int to 5 char str (actually pointer/object) #passing dtype=str on read already does this
        #stateZipDf[zipCol] = stateZipDf[zipCol].apply(lambda x: str(x).rjust(5, '0'))

        stateZipDf.to_csv(saveFile, index=False)  # save, don't print index column

    return stateZipDf


# pass the stateZipDf from get_state_zip_df()
# zip2StateDict[zipCode] = [state_zip_code_is_in, maybe_more_than_1_state]
# state2ZipDict[state][zipCode]=True
def gen_state_zip_dict(stateZipDf):
    zipCol = 'ZCTA5'
    stateCol = 'STUSAB'

    zip2StateDict = {}
    state2ZipDict = {}
    for row in stateZipDf.iterrows():
        zipCode = row[1][zipCol]
        stateStr = row[1][stateCol]

        if zipCode in zip2StateDict:
            # print(zipCode, stateStr)  # zip codes in more than 1 state. interesting
            zip2StateDict[zipCode].append(stateStr)
        else:
            zip2StateDict[zipCode] = [stateStr]

        if stateStr in state2ZipDict:
            state2ZipDict[stateStr][zipCode] = True
        else:
            state2ZipDict[stateStr] = {zipCode: True}

    return zip2StateDict, state2ZipDict


# the quickest, dirtiest, dumbest way to make a separate zip file for each state:
#   re-read the shape file once for each state and only print the zips that are in the state
def create_state_zip_bounds_files(shapeFile):
    zipDf = get_state_zip_df()
    zipDict, stateDict = gen_state_zip_dict(zipDf)

    stateCnt = 0
    for state in stateDict.keys():
        print(stateCnt, ': ', state)
        stateCnt += 1
        sinkFile = shapeFile+'_'+state+'.json'
        # gdal doesn't know how to overwrite a file
        if os.path.isfile(sinkFile):
            os.remove(sinkFile)

        with fiona.open(shapeFile+'.shp', 'r') as src:
            meta = src.meta
            meta['schema']['properties'] = {'zip': 'str'}
            meta['driver'] = 'GeoJSON'
            with fiona.open(sinkFile, 'w', **meta) as sink:
                for rec in src:
                    #only include zips in this state
                    if rec['properties']['ZCTA5CE10'] not in stateDict[state]:
                        continue

                    # I don't like displaying all the quirks of zip boundaries (and may be more costly to render), but this block isn't necessary
                    # not polygon means the multi-level/nested polygon thing. This removes those complicated compound shapes
                    if rec['geometry']['type'] != 'Polygon':
                        # simplify multipolygon to polygon:
                        # if polygon has negative space, the first element is the outer bound, skip other/interior pieces
                        # if polygon consists of multiple, separate pieces (like islands) we include all of those
                        newCoords = [coordSet[0] for coordSet in rec['geometry']['coordinates']]
                        rec['geometry']['coordinates'] = newCoords
                        rec['geometry']['type'] = 'Polygon'

                    rec['properties'] = {'zip': rec['properties']['ZCTA5CE10']}
                    sink.write(rec)

    return










if __name__ == "__main__":
    shapeFile = '../data/shapefiles-us_zips/cb_2017_us_zcta510_500k'
    filterFunction = lambda x: True
    propertyMap = {'ZCTA5CE10':'zip'}
    boundingBox = [[-90, 42.5], [-89, 43.5]]
    boundingBox = None
    recList = translate_shapefile_bounding_box(shapeFile, filterFunction , propertyMap, boundingBox)
