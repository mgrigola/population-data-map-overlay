'''
This file is meant for single-use testing. Most of the reusable library stuff should go in the functions imported here.
set fileShp = the base file name of the shape files
optionally create a function to filter the shapefile at the feature level - it gets passed each feature in the shapefile, so something like return f['properties']['hasData']==1
bBox is the bounding box. This doesn't check intersection, it checks if ANY vertex is inside the box
'''

from readDataACS import readDataACS
from shp2gjson import translateShapefile

def always_true(f):
    return True

# shapefile for counties in Wisconsin, stores the boundaries of each county as polygons in lat/long coords
# 500k refers to the level of detail
fileShp = "../data/WI_County/cb_2015_us_zcta510_500k"
fileCsv = '../data/values/ACS_14_5YR_S1901_with_ann.csv'
bBox = [[-90, 42.5],[-89, 43.5]]
columnKeys = ['HC01_EST_VC01','HC01_EST_VC02','HC01_EST_VC03','HC01_EST_VC04','HC01_EST_VC05','HC01_EST_VC06','HC01_EST_VC07','HC01_EST_VC08','HC01_EST_VC09','HC01_EST_VC10','HC01_EST_VC11','HC01_EST_VC13','HC01_EST_VC15','HC01_EST_VC18']

recList = translateShapefile(fileShp, always_true, bBox, 'ZCTA5CE10', 'zip')
dataDict = readDataACS(fileCsv, columnKeys, 1, recList)
