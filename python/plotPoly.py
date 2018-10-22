import numpy as np
import matplotlib.pyplot as plt
import fiona

# plot the shapes in the shapefile <testFile> with matplotlib
testFile = '../data/shapefiles-wi_counties/cb_2015_55_cousub_500k.shp'
testFile = '../data/shapefiles-us_zips/cb_2017_us_zcta510_500k.shp'
with fiona.open(testFile, 'r') as src:
    fig = plt.figure()
    ax = fig.add_subplot(111)
    cnt = 0
    for feature in src:
        for poly in feature['geometry']['coordinates']:
            coords = np.array(poly).squeeze()
            cnt += 1
            print(feature)
            #print(feature['id'], coords.shape, feature['properties']['COUNTYFP'], feature['properties']['NAME'])
            if len(coords.shape) != 2:
                coords = np.array(coords[0])
                print('*** Unusual shape?  ', coords[0].shape, '  ***')

            ax.plot(coords[:,0], coords[:,1])

        if cnt > 1000:
            break

    #	print(feature['properties']['STATEFP'], ' - ', feature['properties']['NAME'], '\t\t\t', (minLng+maxLng)/2, (minLat+maxLat)/2)
        #ax.text((minLat+maxLat)/2, (minLng+maxLng)/2, feature['properties']['NAME'], fontsize=4)
        #ax.text((minLng+maxLng)/2, (minLat+maxLat)/2, feature['properties']['NAME'], fontsize=18)

    plt.show()
