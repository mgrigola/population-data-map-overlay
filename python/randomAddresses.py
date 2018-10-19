#http://gis.stackexchange.com/questions/25877/how-to-generate-random-locations-nearby-my-location

import requests
import json
import numpy as np
import scipy as sp
import googleGeocodeKey as gKey
import collections as col



def generateRandomCoords(lat0, lng0, r, addressCount = 10):
	rDegs = r/111300
	lngCorrection = np.cos(lat0/180*np.pi)
	
	randR = rDegs*np.sqrt(sp.rand(addressCount))
	randT = 2*np.pi*sp.rand(addressCount)
	randLat = lat0 + randR*np.sin(randT)
	randLng = lng0 + randR*np.cos(randT)/lngCorrection
	return  np.column_stack((randLat,randLng))
	

def reverseGeocodeCoords(coords):
	googleURL = 'https://maps.googleapis.com/maps/api/geocode/json'
	addressList=[]
	for latLng in coords:
		lat = str(latLng[0])
		lng = str(latLng[1])
		searchURL = googleURL+'?latlng='+lat+','+lng+'&key='+gKey.key
		r = requests.post(searchURL)
		rJson = r.json()
		if rJson['status'] != 'OK':
			print('********** NOT OK ************')
			continue
		
		closestAddress = rJson['results'][0]['address_components']
		dict = col.defaultdict(lambda: '?')
		#print()
		for elem in closestAddress:
			val = elem['short_name']
			type = elem['types'][0]
			if type == 'locality':
				type = 'city'
			elif type == 'street_number':
				type = 'number'
				val = val.split('-')[0]
			elif type == 'administrative_area_level_1':
				type = 'state'
			elif type == 'administrative_area_level_2':
				type = 'county'
			elif type == 'postal_code':
				type = 'zip'
			elif type == 'administrative_area_level_3': 	
				continue
			elif type == 'postal_code_suffix':
				continue
				
			dict[type] = val
			#print(elem['types'][0], ' - ',elem['short_name'])
		
		addressList.append(dict)
	
	return addressList



if __name__ == "__main__":	
	coords = generateRandomCoords( 43.05, -89.22, 25000, 1000)
	addressList = reverseGeocodeCoords(coords)

	with open('C:\\leaflet\\data\\randomAddresses.csv','w') as fOut:
		for address in addressList:
			fOut.write( address['number']+ ' ' +address['route']+ ',' +address['city']+ ',' +address['state']+ ',' +address['zip'] + '\n')

	
	
#fig = plt.figure()
#ax = fig.add_axes([0.1,0.1,0.8,0.8])


#bMap = Basemap(llcrnrlon=-90.,llcrnrlat=42.5,urcrnrlon=-89.,urcrnrlat=43.5, rsphere=(6378137.00,6356752.3142), resolution='f', projection='lcc', lat_1=43., lon_0=-89.5, ax=ax)
#bMap.drawcoastlines(linewidth=0.25)
#bMap.drawcountries(linewidth=0.25)
#bMap.fillcontinents(color='coral',lake_color='aqua')
#bMap.drawmapboundary(fill_color='aqua')
#bMap.drawmeridians(np.arange(0,360,30))
#bMap.drawparallels(np.arange(-90,90,30))

#x, y = bMap(coords[:,1],coords[:,0])
#print(x)
#print(y)
#cs = bMap.scatter(x,y)

#ax.set_title('ETOPO5 Topography - Lambert Conformal Conic')
#plt.show()